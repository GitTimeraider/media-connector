const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../data/media-connector.db');

class Database {
  constructor() {
    this.db = null;
    this.ensureDataDirectory();
    this.initDatabase();
  }

  ensureDataDirectory() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  initDatabase() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('✓ Connected to SQLite database');
        this.createTables();
      }
    });
  }

  createTables() {
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'User',
          preferences TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
        } else {
          // Add preferences column if it doesn't exist (migration)
          this.db.run(`
            SELECT COUNT(*) as count FROM pragma_table_info('users') WHERE name='preferences'
          `, [], (err, row) => {
            // Check if column exists by trying to add it
            this.db.run(`ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'`, (err) => {
              if (err && !err.message.includes('duplicate column')) {
                console.error('Error adding preferences column:', err);
              } else if (!err) {
                console.log('✓ Added preferences column to users table');
              }
            });
          });
          this.createDefaultUser();
        }
      });

      // Services table - stores encrypted service configurations
      this.db.run(`
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          api_key TEXT,
          username TEXT,
          password TEXT,
          enabled INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating services table:', err);
        }
      });

      // Create indexes
      this.db.run('CREATE INDEX IF NOT EXISTS idx_services_type ON services(type)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    });
  }

  createDefaultUser() {
    // Check if any admin users exist (not just any users)
    this.db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['Admin'], (err, row) => {
      if (err) {
        console.error('Error checking admin users:', err);
        return;
      }

      if (row.count === 0) {
        const id = crypto.randomBytes(16).toString('hex');
        const hashedPassword = bcrypt.hashSync('admin', 10);
        
        this.db.run(
          'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
          [id, 'admin', hashedPassword, 'Admin'],
          (err) => {
            if (err) {
              console.error('Error creating default admin user:', err);
            } else {
              console.log('✓ Default admin user created (username: admin, password: admin)');
              console.log('  No admin users found in database - admin account automatically created');
            }
          }
        );
      }
    });
  }

  // Promisify database methods for easier async/await usage
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Export singleton instance
const database = new Database();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await database.close();
  process.exit(0);
});

module.exports = database;
