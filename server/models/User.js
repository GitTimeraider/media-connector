const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');

class UserModel {
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateRandomPassword() {
    return crypto.randomBytes(16).toString('hex');
  }

  async findByUsername(username) {
    try {
      const user = await db.get(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
        [username]
      );
      return user;
    } catch (error) {
      console.error('Error finding user by username:', error);
      return null;
    }
  }

  async findById(id) {
    try {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
      return user;
    } catch (error) {
      console.error('Error finding user by id:', error);
      return null;
    }
  }

  async getAllUsers() {
    try {
      const users = await db.all('SELECT id, username, role, created_at, updated_at FROM users');
      return users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(username, password, role = 'User') {
    const existingUser = await this.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = this.generateId();

    try {
      await db.run(
        'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
        [id, username, hashedPassword, role]
      );

      return {
        id,
        username,
        role,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id, updates) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if username is being changed and if it's already taken
    if (updates.username && updates.username !== user.username) {
      const existingUser = await this.findByUsername(updates.username);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Username already exists');
      }
    }

    // Hash password if it's being updated
    if (updates.password) {
      updates.password = bcrypt.hashSync(updates.password, 10);
    }

    try {
      const fields = [];
      const values = [];

      if (updates.username) {
        fields.push('username = ?');
        values.push(updates.username);
      }
      if (updates.password) {
        fields.push('password = ?');
        values.push(updates.password);
      }
      if (updates.role) {
        fields.push('role = ?');
        values.push(updates.role);
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await db.run(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      const updatedUser = await this.findById(id);
      return {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent deleting the last admin
    if (user.role === 'Admin') {
      const admins = await db.all('SELECT COUNT(*) as count FROM users WHERE role = ?', ['Admin']);
      if (admins[0].count <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    try {
      await db.run('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async verifyPassword(username, password) {
    const user = await this.findByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.created_at
    };
  }

  async resetPasswordToRandom(username) {
    const user = await this.findByUsername(username);
    if (!user) {
      throw new Error('User not found');
    }

    const newPassword = this.generateRandomPassword();
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    try {
      await db.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, user.id]
      );

      // Log to console (will appear in Docker logs)
      console.log('═══════════════════════════════════════════════════════');
      console.log('PASSWORD RESET REQUEST');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Username: ${username}`);
      console.log(`New Password: ${newPassword}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('Please change this password after logging in.');
      console.log('═══════════════════════════════════════════════════════');

      return newPassword;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  async getPreferences(userId) {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user.preferences ? JSON.parse(user.preferences) : {};
    } catch (error) {
      console.error('Error getting preferences:', error);
      return {};
    }
  }

  async updatePreferences(userId, preferences) {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentPrefs = user.preferences ? JSON.parse(user.preferences) : {};
      const updatedPrefs = { ...currentPrefs, ...preferences };

      await db.run(
        'UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(updatedPrefs), userId]
      );

      return updatedPrefs;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }
}

module.exports = new UserModel();
