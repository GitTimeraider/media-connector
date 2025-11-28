# Media Connector
# NOT READY FOR USE! Do not download!

<div align="center">

![Docker Pulls](https://img.shields.io/docker/pulls/gittimerider/media-connector)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/GitTimeraider/media-connector/docker-publish.yml)
![License](https://img.shields.io/github/license/GitTimeraider/media-connector)

**A comprehensive web-based media server manager inspired by nzb360**

Manage your entire media stack from one beautiful web interface. Control Sonarr, Radarr, Lidarr, Readarr, download clients, and more.

[Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [Screenshots](#screenshots) • [Contributing](#contributing)

</div>

---

## Features

### Media Management
- **Sonarr** - TV show management and monitoring
- **Radarr** - Movie collection management
- **Lidarr** - Music library management
- **Readarr** - Book and ebook management
- **Bazarr** - Subtitle management (coming soon)

### Download Clients
- **SABnzbd** - Usenet binary downloader
- **NZBGet** - Efficient usenet downloader
- **qBittorrent** - BitTorrent client
- **Transmission** - Lightweight torrent client
- **Deluge** - Feature-rich BitTorrent client
- **rTorrent/ruTorrent** - Advanced torrent management

### Search & Discovery
- **Overseerr** - Media request and discovery
- **Prowlarr** - Indexer manager and proxy
- **Jackett** - Torznab/Newznab proxy
- **NZBHydra2** - Meta search for indexers

### Monitoring & Statistics
- **Tautulli** - Plex media server monitoring
- **Unraid** - Server management and Docker container control
- Real-time download progress
- Queue management
- Calendar view for upcoming releases

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
  -v /path/to/config:/config \
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
      - ./config:/config
    environment:
      - NODE_ENV=production
      - PORT=3001
      - CONFIG_FILE=/config/services.json
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

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=production
PORT=3001
CONFIG_FILE=/config/services.json
```

### Supported Services Configuration

#### Sonarr / Radarr / Lidarr / Readarr
- **URL**: `http://your-server:port`
- **API Key**: Found in Settings → General → Security

#### SABnzbd
- **URL**: `http://your-server:port`
- **API Key**: Found in Config → General → API Key

#### qBittorrent
- **URL**: `http://your-server:port`
- **Username**: Your qBittorrent username
- **Password**: Your qBittorrent password

#### Overseerr
- **URL**: `http://your-server:port`
- **API Key**: Found in Settings → General → API Key

#### Tautulli
- **URL**: `http://your-server:port`
- **API Key**: Found in Settings → Web Interface → API Key

#### Unraid
- **URL**: `http://your-server:port` (typically port 80 or 443)
- **Username**: Your Unraid web interface username
- **Password**: Your Unraid web interface password

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

## Roadmap

- [ ] Push notifications support
- [ ] Mobile app (React Native)
- [ ] Bazarr integration
- [ ] NZBHydra2 integration
- [ ] Advanced search across all indexers
- [ ] Custom dashboards and widgets
- [ ] Multi-user support with permissions
- [ ] Dark/Light theme toggle
- [ ] WebSocket for real-time updates
- [ ] Calendar sync (Google Calendar, iCal)

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
