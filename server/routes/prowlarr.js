const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('prowlarr');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const system = await client.get('/api/v1/system/status');
    res.json({ system });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/indexers/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const indexers = await client.get('/api/v1/indexer');
    res.json(indexers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    
    // Build query params
    let queryString = `/api/v1/search?query=${encodeURIComponent(req.query.query)}&type=search`;
    
    // Add categories if specified (comma-separated string)
    if (req.query.categories) {
      const categories = req.query.categories.split(',');
      
      // Filter out console categories when PC is selected
      const consoleCategories = ['1000', '1010', '1020', '1030', '1040', '1050', '1060', '1070', '1080'];
      const isPCSearch = categories.includes('4000') || categories.includes('4050');
      
      categories.forEach(cat => {
        // Skip console categories if this is a PC search
        if (isPCSearch && consoleCategories.includes(cat)) {
          return;
        }
        queryString += `&categories=${cat}`;
      });
    }
    
    // Make direct axios call with pre-formatted query string
    const axios = require('axios');
    const response = await axios.get(`${instance.url}${queryString}`, {
      headers: {
        'X-Api-Key': instance.apiKey
      },
      timeout: 30000
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Prowlarr search error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

module.exports = router;
