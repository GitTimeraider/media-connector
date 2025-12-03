# Media Connector (Dockerized)
# Still in heavy development, but safe to use

<p align="center" width="100%">
    <img width="33%" src="https://github.com/GitTimeraider/Assets/blob/main/Media-Connector-docker/img/MediaConnector_Logo.png">
</p>
<div align="center">

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/GitTimeraider/media-connector-docker/docker-publish.yml)
![License](https://img.shields.io/github/license/GitTimeraider/media-connector-docker)

### Disclaimers: 
#### AI is responsible for over half of the coding. Also keep in mind that this software is mostly developed for personal use by myself and thus might not receive all feature requests desired.
###################################################

**A comprehensive web-based media server manager**

Manage your entire media stack from one web interface. Control Sonarr, Radarr, download clients, and more with real-time monitoring and an intuitive interface.

[Features](#features) • [Installation](#installation) • [Configuration](#configuration)

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
  - Start/Stop containers
  - View array and disk information
- **Portainer** - Server management and Docker control
  - Start/Stop/Restart containers

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
- **Secure** - API key authentication for most services

---

## Quick Start

### Using Docker

```bash
docker run -d \
  --name=media-connector-docker \
  -p 3001:3001 \
  -e PUID=1000 \
  -e PGID=1000 \
  -e JWT_SECRET=your-secret-key-here \
  -v /path/to/data:/app/server/data \
  --restart unless-stopped \
  ghcr.io/gittimerider/media-connector-docker:latest
```

### Using Docker Compose

```yaml
version: '3.8'

services:
  media-connector-docker:
    image: ghcr.io/gittimerider/media-connector-docker:latest
    container_name: media-connector-docker
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
5. Check the logs with: `docker logs media-connector-docker`
6. Look for the password reset section in the logs
7. Use the new password to log in
8. Immediately change the password to something memorable

---

## Data Storage & Security

### SQLite Database
Media Connector uses an SQLite database to securely store:
- **User accounts** - Usernames, hashed passwords, roles
- **Service configurations** - URLs, API keys, credentials

**Database Location**: `server/data/media-connector-docker.db`

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
docker cp media-connector-docker:/app/server/data/media-connector-docker.db ./backup.db

# Restore from backup
docker cp ./backup.db media-connector-docker:/app/server/data/media-connector-docker.db
docker restart media-connector-docker
```

### Environment Variables

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
---

## Automatic Docker Builds

This repository is configured with GitHub Actions to automatically build and push Docker images to GitHub Container Registry (ghcr.io).

### Automated Builds Trigger On:
- **Push to main branch** → Builds `latest` tag
- **Pull requests** → Builds test images (not pushed)

### Available Image Tags:
- `ghcr.io/gittimerider/media-connector-docker:latest` - Latest stable release
- `ghcr.io/gittimerider/media-connector-docker:main` - Latest main branch

### Multi-Architecture Support:
Images are built for both `linux/amd64` and `linux/arm64` platforms.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Inspired by [nzb360](https://nzb360.com/) - The excellent Android app
- Built with [React](https://reactjs.org/), [Node.js](https://nodejs.org/), and [Material-UI](https://mui.com/)
- Thanks to all the developers of Sonarr, Radarr, and other *arr applications

---

## Disclaimer

This application is not affiliated with, endorsed by, or connected to nzb360 or any of the services it integrates with. All trademarks and service marks are the property of their respective owners.

---

<div align="center">

Built for the home media server community

**[Back to top](#media-connector)**

</div>
