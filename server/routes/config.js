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
router.post('/test/:type', async (req, res) => {
  try {
    const ApiClient = require('../utils/apiClient');
    const { url, apiKey } = req.body;
    
    let endpoint = '/api/v3/system/status'; // Default for *arr apps
    
    // Adjust endpoint based on service type
    if (req.params.type === 'prowlarr') {
      endpoint = '/api/v1/system/status';
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
