const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  originAgentCluster: false
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const sonarrRoutes = require('./routes/sonarr');
const radarrRoutes = require('./routes/radarr');
const lidarrRoutes = require('./routes/lidarr');
const readarrRoutes = require('./routes/readarr');
const sabnzbdRoutes = require('./routes/sabnzbd');
const nzbgetRoutes = require('./routes/nzbget');
const qbittorrentRoutes = require('./routes/qbittorrent');
const transmissionRoutes = require('./routes/transmission');
const delugeRoutes = require('./routes/deluge');
const overseerrRoutes = require('./routes/overseerr');
const tautulliRoutes = require('./routes/tautulli');
const prowlarrRoutes = require('./routes/prowlarr');
const jackettRoutes = require('./routes/jackett');
const unraidRoutes = require('./routes/unraid');
const configRoutes = require('./routes/config');
const systemRoutes = require('./routes/system');

// API Routes
app.use('/api/sonarr', sonarrRoutes);
app.use('/api/radarr', radarrRoutes);
app.use('/api/lidarr', lidarrRoutes);
app.use('/api/readarr', readarrRoutes);
app.use('/api/sabnzbd', sabnzbdRoutes);
app.use('/api/nzbget', nzbgetRoutes);
app.use('/api/qbittorrent', qbittorrentRoutes);
app.use('/api/transmission', transmissionRoutes);
app.use('/api/deluge', delugeRoutes);
app.use('/api/overseerr', overseerrRoutes);
app.use('/api/tautulli', tautulliRoutes);
app.use('/api/prowlarr', prowlarrRoutes);
app.use('/api/jackett', jackettRoutes);
app.use('/api/unraid', unraidRoutes);
app.use('/api/config', configRoutes);
app.use('/api/system', systemRoutes);

// Health check endpoint (before wildcard route)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Media Connector server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
