const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('deluge');
  res.json(instances);
});

router.post('/rpc/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('deluge');
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

module.exports = router;
