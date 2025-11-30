# Media Connector

<div align="center">

![Docker Pulls](https://img.shields.io/docker/pulls/gittimerider/media-connector)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/GitTimeraider/media-connector/docker-publish.yml)
![License](https://img.shields.io/github/license/GitTimeraider/media-connector)

**A comprehensive web-based media server manager**

Manage your entire media stack from one beautiful web interface. Control Sonarr, Radarr, download clients, and more with real-time monitoring and an intuitive interface.

[Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [Screenshots](#screenshots) • [Contributing](#contributing)

</div>

---

## Features

### Media Management
- **Sonarr** - TV show management and monitoring
  - Browse your TV library with detailed information
  - Search and add new TV shows
  - Edit quality profiles and monitor settings
  - Delete series with optional file cleanup
- **Radarr** - Movie collection management
  - Browse your movie library with cast and genres
  - Search and add new movies
  - Edit quality profiles and monitor settings
  - Delete movies with optional file cleanup

### Download Clients
- **SABnzbd** - Usenet binary downloader
  - Real-time queue monitoring
  - Pause/resume downloads
  - Delete downloads from queue
- **Deluge** - BitTorrent client
  - Add torrents by URL
  - Monitor torrent status

### Search & Discovery
- **Prowlarr** - Indexer manager and proxy
  - Search across all configured indexers
  - Seamless integration with Sonarr/Radarr
- **TMDB Integration** - The Movie Database
  - Browse trending movies and TV shows
  - View cast, genres, and ratings
  - Add content directly to your library

### Server Management
- **Unraid** - Server management and Docker control
  - Real-time system monitoring (CPU, Memory, Uptime)
  - Docker container management
  - Start/Stop/Restart containers
  - View array and disk information

### Authentication & Security
- **User Management** - Create and manage multiple users
- **Role-based Access Control** - Admin and User roles
- **Secure Authentication** - JWT-based login system
- **Password Reset** - Forgot password functionality via Docker logs
- **Profile Management** - Users can manage their own credentials

### Modern Web Interface
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Mode** - Easy on the eyes
- **Real-time Updates** - Live download progress and notifications
- **Material Design** - Clean and intuitive interface
- **Secure** - API key authentication for all services

---

## Quick Start

### Using Docker (Recommended)

```bash
docker run -d \
  --name=media-connector \
  -p 3001:3001 \
  -e PUID=1000 \
  -e PGID=1000 \
  -e JWT_SECRET=your-secret-key-here \
  -v /path/to/data:/app/server/data \
  --restart unless-stopped \
  ghcr.io/gittimerider/media-connector:latest
```

### Using Docker Compose

```yaml
version: '3.8'

services:
  media-connector:
    image: ghcr.io/gittimerider/media-connector:latest
    container_name: media-connector
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/server/data  # SQLite database storage
    environment:
      - PUID=1000
      - PGID=1000
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=change-this-secret-key-in-production
      - TMDB_API_KEY=your-tmdb-api-key-optional
```

Then run:
```bash
docker-compose up -d
```

---

## Installation

### Prerequisites
- Docker (recommended) OR
- Node.js 18+ and npm

### Method 1: Docker (Recommended)

The easiest way to run Media Connector is using Docker. The image is automatically built and published to GitHub Container Registry.

1. Pull the latest image:
```bash
docker pull ghcr.io/gittimerider/media-connector:latest
```

2. Run the container:
```bash
docker run -d \
  --name=media-connector \
  -p 3001:3001 \
  -v $(pwd)/config:/config \
  --restart unless-stopped \
  ghcr.io/gittimerider/media-connector:latest
```

3. Access the web interface at `http://localhost:3001`

#### Default Credentials
On first run, a default admin account is automatically created:
- **Username**: `admin`
- **Password**: `admin`

**⚠️ IMPORTANT**: Change the default password immediately after logging in!

### Method 2: Docker Compose

1. Download the `docker-compose.yml` file
2. Create a `config` directory in the same location
3. Run:
```bash
docker-compose up -d
```

### Method 3: Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/GitTimeraider/media-connector.git
cd media-connector
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

4. Build the frontend:
```bash
cd client
npm run build
cd ..
```

5. Start the server:
```bash
npm start
```

6. Access at `http://localhost:3001`

---

## Configuration

### First-Time Setup

1. Open Media Connector in your browser at `http://localhost:3001`
2. Navigate to **Settings** from the sidebar
3. Add your services by clicking the **Add** button for each service type
4. Enter the required information:
   - **Name**: A friendly name for the instance
   - **URL**: The full URL to your service (e.g., `http://192.168.1.100:8989`)
   - **API Key**: Your service's API key (found in service settings)
5. Click **Test Connection** to verify
6. Click **Save**

---

## User Management

### Default Admin Account
Media Connector automatically creates a default administrator account when no admin users exist:
- **Username**: `admin`
- **Password**: `admin`

⚠️ **Important**: Change the default password immediately after first login!

### Guest Mode (Optional)
You can bypass authentication entirely by enabling guest mode:

**Docker Environment Variable**:
```bash
DISABLE_AUTH=true
```

When enabled:
- No login screen is shown
- Users are automatically logged in as a Guest user with User role
- Guest user has read-only access (cannot modify settings or users)
- Guest user is not visible in the user list
- Useful for trusted networks or personal use

**Enable in Docker Compose**:
```yaml
environment:
  - DISABLE_AUTH=true
```

**Enable in Docker Run**:
```bash
docker run -d \
  -e DISABLE_AUTH=true \
  ...
```

### Managing Your Profile
All users can manage their own profile:
1. Click on your avatar in the top-right corner
2. Select **My Profile**
3. Update your username and/or password
4. Click **Save Changes**

### Admin Functions

#### Creating Users (Admin Only)
1. Navigate to **Users** in the sidebar (Admin only)
2. Click **Add User**
3. Enter username and password
4. Select role (User or Admin)
5. Click **Add User**

#### Managing Users (Admin Only)
- **Toggle Admin Role**: Click on the role chip to promote/demote users
- **Reset Password**: Click the key icon to set a new password for any user
- **Delete User**: Click the delete icon
  - ⚠️ Cannot delete your own account if you are the last admin
  - ⚠️ At least one admin user must exist at all times

#### Forgot Password
If a user forgets their password:
1. On the login screen, click **Forgot password?**
2. Enter your username
3. Click **Reset Password**
4. A new randomly generated 32-character password will be logged in the Docker container logs
5. Check the logs with: `docker logs media-connector`
6. Look for the password reset section in the logs
7. Use the new password to log in
8. Immediately change the password to something memorable

---

## Data Storage & Security

### SQLite Database
Media Connector uses an SQLite database to securely store:
- **User accounts** - Usernames, hashed passwords, roles
- **Service configurations** - URLs, API keys, credentials

**Database Location**: `server/data/media-connector.db`

### Security Features
- ✅ **Password Hashing** - bcrypt with salt rounds for user passwords
- ✅ **JWT Tokens** - Secure session management with 7-day expiration
- ✅ **Database Storage** - Credentials stored in SQLite instead of plaintext JSON
- ✅ **Role-based Access** - Admin vs. User permissions
- ✅ **Docker Volume Persistence** - Database persists across container restarts

### Backup Your Data
The SQLite database file contains all your configuration. Back it up regularly:
```bash
# Backup the database
docker cp media-connector:/app/server/data/media-connector.db ./backup.db

# Restore from backup
docker cp ./backup.db media-connector:/app/server/data/media-connector.db
docker restart media-connector
```

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
TMDB_API_KEY=your-tmdb-api-key-here
DISABLE_AUTH=false
```

**Docker-Specific Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PUID` | `1000` | User ID for file permissions |
| `PGID` | `1000` | Group ID for file permissions |
| `PORT` | `3001` | Port the application runs on |
| `NODE_ENV` | `production` | Node environment |
| `JWT_SECRET` | `(auto-generated)` | Secret key for JWT tokens - **CHANGE THIS!** |
| `TMDB_API_KEY` | `(none)` | Optional: TMDB API key for movie/TV metadata |
| `DISABLE_AUTH` | `false` | Set to `true` to bypass login (guest mode) |

**Setting PUID/PGID:**

To find your user and group IDs on Linux/Unraid:
```bash
id your_username
```

Then use those values in your docker run command or docker-compose.yml:
```bash
-e PUID=1000 -e PGID=100
```

### Supported Services Configuration

#### Sonarr / Radarr
- **URL**: `http://your-server:port`
- **API Key**: Found in Settings → General → Security
- Full CRUD operations: Create, Read, Update, Delete
- Quality profile management
- Monitor status control

#### SABnzbd
- **URL**: `http://your-server:port`
- **API Key**: Found in Config → General → API Key
- Queue monitoring and management
- Pause/resume/delete operations

#### Deluge
- **URL**: `http://your-server:port`
- **Password**: Your Deluge web UI password
- Add torrents by URL
- Monitor torrent status

#### Prowlarr
- **URL**: `http://your-server:port`
- **API Key**: Found in Settings → General → Security
- Multi-indexer search capability

#### Unraid
- **URL**: `http://your-server` (typically port 80 or 443)
- **API Key**: Your Unraid API key for GraphQL
- Real-time system monitoring
- Docker container control

---

## Screenshots

### Dashboard
Beautiful overview of your entire media stack with statistics and quick access.

### TV Shows & Movies
Browse your library, search for new content, and monitor downloads.

### Downloads
Real-time view of active downloads with progress bars and queue management.

### Settings
Easy configuration of all your services with connection testing.

---

## Development

### Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/GitTimeraider/media-connector.git
cd media-connector
```

2. Install dependencies:
```bash
npm install
cd client && npm install && cd ..
```

3. Start development servers:
```bash
npm run dev
```

This runs both the backend (port 3001) and frontend (port 3000) in development mode.

### Project Structure

```
media-connector/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                # Node.js backend
│   ├── config/           # Configuration management
│   ├── routes/           # API route handlers
│   ├── utils/            # Utility functions
│   └── index.js
├── .github/
│   └── workflows/        # GitHub Actions
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Building Docker Image Locally

```bash
docker build -t media-connector .
```

---

## Automatic Docker Builds

This repository is configured with GitHub Actions to automatically build and push Docker images to GitHub Container Registry (ghcr.io).

### Automated Builds Trigger On:
- **Push to main branch** → Builds `latest` tag
- **New version tags** (e.g., `v1.0.0`) → Builds version-specific tags
- **Pull requests** → Builds test images (not pushed)

### Available Image Tags:
- `ghcr.io/gittimerider/media-connector:latest` - Latest stable release
- `ghcr.io/gittimerider/media-connector:v1.0.0` - Specific version
- `ghcr.io/gittimerider/media-connector:main` - Latest main branch

### Multi-Architecture Support:
Images are built for both `linux/amd64` and `linux/arm64` platforms.

---

## Security

- All API communications use HTTPS when configured
- API keys are stored securely in configuration files
- No credentials are logged or exposed in the interface
- Configuration files should be protected with appropriate file permissions

### Recommendations:
- Use reverse proxy (nginx, Traefik) with SSL/TLS
- Enable authentication in your reverse proxy
- Keep services on internal network when possible
- Regular backups of configuration files

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Inspired by [nzb360](https://nzb360.com/) - The excellent Android app
- Built with [React](https://reactjs.org/), [Node.js](https://nodejs.org/), and [Material-UI](https://mui.com/)
- Thanks to all the developers of Sonarr, Radarr, and other *arr applications

---

## Support

- **Issues**: [GitHub Issues](https://github.com/GitTimeraider/media-connector/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GitTimeraider/media-connector/discussions)

---

## Disclaimer

This application is not affiliated with, endorsed by, or connected to nzb360 or any of the services it integrates with. All trademarks and service marks are the property of their respective owners.

---

<div align="center">

Built for the home media server community

**[Back to top](#media-connector)**

</div>
