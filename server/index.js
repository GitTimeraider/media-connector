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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
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
const configRoutes = require('./routes/config');
const systemRoutes = require('./routes/system');
const tmdbRoutes = require('./routes/tmdb');
const authRoutes = require('./routes/auth');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const { apiLimiter, healthLimiter } = require('./middleware/rateLimiter');

// Public API Routes (no auth required, but rate limited)
app.use('/api/auth', authRoutes); // Has its own specific rate limiting

// Protected API Routes (authentication required + rate limiting)
app.use('/api/sonarr', authenticateToken, apiLimiter, sonarrRoutes);
app.use('/api/radarr', authenticateToken, apiLimiter, radarrRoutes);
app.use('/api/sabnzbd', authenticateToken, apiLimiter, sabnzbdRoutes);
app.use('/api/deluge', authenticateToken, apiLimiter, delugeRoutes);
app.use('/api/prowlarr', authenticateToken, apiLimiter, prowlarrRoutes);
app.use('/api/unraid', authenticateToken, apiLimiter, unraidRoutes);
app.use('/api/config', authenticateToken, apiLimiter, configRoutes);
app.use('/api/system', authenticateToken, apiLimiter, systemRoutes);
app.use('/api/tmdb', authenticateToken, apiLimiter, tmdbRoutes);

// Health check endpoint (before wildcard route)
app.get('/health', healthLimiter, (req, res) => {
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
