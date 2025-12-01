const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const UnraidSubscriptionManager = require('./utils/unraidSubscription');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Unraid subscription manager
const unraidManager = new UnraidSubscriptionManager();

// Make unraidManager available to routes
app.locals.unraidManager = unraidManager;

// Security middleware
// Disable headers that cause issues with HTTP access on local network IPs
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      // Don't upgrade insecure requests when running on HTTP
      upgradeInsecureRequests: null,
    },
  },
  crossOriginEmbedderPolicy: false,
  // Disable headers that require HTTPS or cause issues on non-localhost HTTP
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const sonarrRoutes = require('./routes/sonarr');
const radarrRoutes = require('./routes/radarr');
const sabnzbdRoutes = require('./routes/sabnzbd');
const delugeRoutes = require('./routes/deluge');
const prowlarrRoutes = require('./routes/prowlarr');
const unraidRoutes = require('./routes/unraid');
const portainerRoutes = require('./routes/portainer');
const configRoutes = require('./routes/config');
const systemRoutes = require('./routes/system');
const tmdbRoutes = require('./routes/tmdb');
const authRoutes = require('./routes/auth');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const { apiLimiter, healthLimiter } = require('./middleware/rateLimiter');

// Public API Routes (no auth required, but rate limited)
app.use('/api/auth', authRoutes); // Has its own specific rate limiting

// Protected API Routes (rate limiting + authentication required)
// Rate limiting is applied FIRST to prevent DoS attacks before authentication
// All routes below are protected with both apiLimiter AND authenticateToken middleware
app.use('/api/sonarr', apiLimiter, authenticateToken, sonarrRoutes);
app.use('/api/radarr', apiLimiter, authenticateToken, radarrRoutes);
app.use('/api/sabnzbd', apiLimiter, authenticateToken, sabnzbdRoutes);
app.use('/api/deluge', apiLimiter, authenticateToken, delugeRoutes);
app.use('/api/prowlarr', apiLimiter, authenticateToken, prowlarrRoutes);
app.use('/api/unraid', apiLimiter, authenticateToken, unraidRoutes);
app.use('/api/portainer', apiLimiter, authenticateToken, portainerRoutes);
app.use('/api/config', apiLimiter, authenticateToken, configRoutes);
app.use('/api/system', apiLimiter, authenticateToken, systemRoutes);
app.use('/api/tmdb', apiLimiter, authenticateToken, tmdbRoutes);

// Health check endpoint (rate limited, no auth required)
// Rate limiter prevents DoS attacks on health endpoint
app.get('/health', healthLimiter, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Wildcard route for React app (rate limited to prevent abuse)
  app.get('*', healthLimiter, (req, res) => {
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

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients per instanceId
const clients = new Map(); // Map<instanceId, Set<WebSocket>>

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  
  let instanceId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe' && data.instanceId) {
        instanceId = data.instanceId;
        
        // Add client to instanceId set
        if (!clients.has(instanceId)) {
          clients.set(instanceId, new Set());
          // Setup listener for this instance's stats
          listenForInstanceStats(instanceId);
        }
        clients.get(instanceId).add(ws);
        
        console.log(`Client subscribed to instance ${instanceId}`);
        
        // Send acknowledgment
        ws.send(JSON.stringify({ type: 'subscribed', instanceId }));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    // Remove client from all instance sets
    if (instanceId && clients.has(instanceId)) {
      clients.get(instanceId).delete(ws);
      if (clients.get(instanceId).size === 0) {
        clients.delete(instanceId);
        // Optionally unsubscribe from Unraid if no clients listening
        // unraidManager.unsubscribe(instanceId);
      }
    }
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Helper function to listen for stats events dynamically
function listenForInstanceStats(instanceId) {
  const eventName = `stats:${instanceId}`;
  
  // Remove any existing listener for this instance
  unraidManager.removeAllListeners(eventName);
  
  // Add new listener
  unraidManager.on(eventName, (data) => {
    if (clients.has(instanceId)) {
      const message = JSON.stringify({ type: 'stats', instanceId, data });
      clients.get(instanceId).forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });
}

// Start the server
function startServer() {
  server.listen(PORT, () => {
    console.log(`Media Connector server running on port ${PORT}`);
    console.log(`WebSocket server ready for connections`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Cleanup on shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  unraidManager.unsubscribeAll();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();
