const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('deluge');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const axios = require('axios');
    
    // Try to authenticate to check if service is online
    const authResponse = await axios.post(`${instance.url}/json`, {
      method: 'auth.check_session',
      params: [],
      id: 1
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    res.json({ connected: true, authenticated: authResponse.data.result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/rpc/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const axios = require('axios');
    const result = await axios.post(`${instance.url}/json`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': instance.password ? `_session_id=${instance.password}` : ''
      }
    });
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/add/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const { url } = req.body;
    const axios = require('axios');
    
    // Authenticate first to get session
    const authResponse = await axios.post(`${instance.url}/json`, {
      method: 'auth.login',
      params: [instance.password],
      id: 1
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const cookies = authResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies[0].split(';')[0] : '';

    // Add torrent by URL
    const addResponse = await axios.post(`${instance.url}/json`, {
      method: 'web.add_torrents',
      params: [[{ path: url, options: {} }]],
      id: 2
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    });

    res.json({ success: true, data: addResponse.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
