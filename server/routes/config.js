const express = require('express');
const router = express.Router();
const configManager = require('../config/services');

// Get all services configuration
router.get('/services', (req, res) => {
  const services = configManager.getAllServices();
  // Return full data including API keys/passwords for Settings page
  // This endpoint should only be accessible from the web UI
  res.json(services);
});

// Get services of a specific type
router.get('/services/:type', (req, res) => {
  const services = configManager.getServices(req.params.type);
  res.json(services);
});

// Add a new service instance
router.post('/services/:type', (req, res) => {
  const service = configManager.addService(req.params.type, req.body);
  res.json(service);
});

// Update a service instance
router.put('/services/:type/:id', (req, res) => {
  const service = configManager.updateService(req.params.type, req.params.id, req.body);
  if (service) {
    res.json(service);
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

// Delete a service instance
router.delete('/services/:type/:id', (req, res) => {
  configManager.deleteService(req.params.type, req.params.id);
  res.json({ success: true });
});

// Test service connection
router.post('/test/:type', async (req, res) => {
  try {
    const ApiClient = require('../utils/apiClient');
    const { url, apiKey } = req.body;
    
    let endpoint = '/api/v3/system/status'; // Default for *arr apps
    
    // Adjust endpoint based on service type
    if (req.params.type === 'lidarr' || req.params.type === 'readarr' || req.params.type === 'prowlarr') {
      endpoint = '/api/v1/system/status';
    } else if (req.params.type === 'overseerr') {
      endpoint = '/api/v1/status';
    } else if (req.params.type === 'sabnzbd') {
      const axios = require('axios');
      const response = await axios.get(`${url}/api`, {
        params: { mode: 'version', output: 'json', apikey: apiKey }
      });
      return res.json({ success: true, data: response.data });
    } else if (req.params.type === 'deluge') {
      const axios = require('axios');
      // Deluge uses password field for authentication
      const { password } = req.body;
      const response = await axios.post(`${url}/json`, {
        method: 'web.connected',
        params: [],
        id: 1
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': password ? `_session_id=${password}` : ''
        }
      });
      return res.json({ success: true, data: response.data });
    }
    
    const client = new ApiClient(url, apiKey);
    const result = await client.get(endpoint);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
