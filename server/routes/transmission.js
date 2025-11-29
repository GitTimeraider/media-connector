const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('transmission');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('transmission');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const auth = instance.username && instance.password 
      ? Buffer.from(`${instance.username}:${instance.password}`).toString('base64')
      : null;

    const headers = auth ? { 'Authorization': `Basic ${auth}` } : {};
    const client = new ApiClient(instance.url, '', { headers, timeout: 5000 });

    const result = await client.post('/transmission/rpc', {
      method: 'session-get'
    });
    
    res.json({ status: 'online', session: result });
  } catch (error) {
    res.status(200).json({ status: 'offline', error: error.message });
  }
});

router.post('/rpc/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('transmission');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const auth = instance.username && instance.password 
      ? Buffer.from(`${instance.username}:${instance.password}`).toString('base64')
      : null;

    const headers = auth ? { 'Authorization': `Basic ${auth}` } : {};
    const client = new ApiClient(instance.url, '', { headers });

    const result = await client.post('/transmission/rpc', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
