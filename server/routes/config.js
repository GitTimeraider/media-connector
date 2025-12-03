const express = require('express');
const router = express.Router();
const ServicesModel = require('../models/Services');

// Get all services configuration
router.get('/services', async (req, res) => {
  try {
    const services = await ServicesModel.getAllServices();
    // Return full data including API keys/passwords for Settings page
    // This endpoint should only be accessible from the web UI
    res.json(services);
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get services of a specific type
router.get('/services/:type', async (req, res) => {
  try {
    const services = await ServicesModel.getServicesByType(req.params.type);
    res.json(services);
  } catch (error) {
    console.error('Error getting services by type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new service instance
router.post('/services/:type', async (req, res) => {
  try {
    const service = await ServicesModel.createService(req.params.type, req.body);
    res.json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a service instance
router.put('/services/:type/:id', async (req, res) => {
  try {
    const service = await ServicesModel.updateService(req.params.id, req.body);
    if (service) {
      res.json(service);
    } else {
      res.status(404).json({ error: 'Service not found' });
    }
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a service instance
router.delete('/services/:type/:id', async (req, res) => {
  try {
    await ServicesModel.deleteService(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test service connection
// Using GET to avoid reverse proxy POST blocking issues
router.get('/test/:type', async (req, res) => {
  try {
    const ApiClient = require('../utils/apiClient');
    const urlValidator = require('../utils/urlValidator');
    // Read from query params instead of body for GET request
    const { url, apiKey, password } = req.query;
    
    if (!url || !apiKey) {
      return res.status(400).json({ success: false, error: 'Missing url or apiKey' });
    }
    
    // Validate URL for SSRF protection
    const validation = urlValidator.validateServiceUrl(url);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    
    // Use ApiClient for consistent request handling
    const axios = require('axios');
    
    // Use dedicated method based on service type
    if (req.params.type === 'prowlarr') {
      const client = new ApiClient(url, apiKey);
      const result = await client.getV1SystemStatus();
      return res.json({ success: true, data: result });
    } else if (req.params.type === 'sabnzbd') {
      // SAFE: URL has been validated by urlValidator.validateServiceUrl above
      const safeUrl = new URL('/api', validation.url);
      const response = await axios.get(safeUrl.toString(), {
        params: { mode: 'version', output: 'json', apikey: apiKey },
        timeout: 10000
      });
      return res.json({ success: true, data: response.data });
    } else if (req.params.type === 'deluge') {
      // Deluge uses password field for authentication (from query params)
      // SAFE: URL has been validated by urlValidator.validateServiceUrl above
      const safeUrl = new URL('/json', validation.url);
      const response = await axios.post(safeUrl.toString(), {
        method: 'web.connected',
        params: [],
        id: 1
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': password ? `_session_id=${password}` : ''
        },
        timeout: 10000
      });
      return res.json({ success: true, data: response.data });
    } else if (req.params.type === 'unraid') {
      // Unraid uses GraphQL API with API key in headers
      const safeUrl = new URL('/graphql', validation.url);
      const response = await axios.post(safeUrl.toString(), {
        query: '{ info { os { hostname } } }'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      });
      return res.json({ success: true, data: response.data });
    } else if (req.params.type === 'portainer') {
      // Portainer uses REST API with X-API-Key header
      const safeUrl = new URL('/api/status', validation.url);
      const response = await axios.get(safeUrl.toString(), {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        timeout: 10000
      });
      return res.json({ success: true, data: response.data });
    }
    
    // Default for Radarr/Sonarr (both use v3 API)
    const client = new ApiClient(url, apiKey);
    const result = await client.getSystemStatus();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
