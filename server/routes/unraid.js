const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('unraid');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    // Get system stats
    const response = await axios.get(`${instance.url}/plugins/dynamix/include/SystemStats.php`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/docker/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    // Get Docker containers status
    const response = await axios.get(`${instance.url}/plugins/dynamix.docker.manager/include/DockerClient.php`, {
      headers,
      params: { action: 'list_containers' },
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vms/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    // Get VMs status
    const response = await axios.get(`${instance.url}/plugins/dynamix.vm.manager/include/VMMachines.php`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/array/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    // Get array status
    const response = await axios.get(`${instance.url}/plugins/dynamix/include/ArrayStatus.php`, {
      headers,
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/docker/action/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = instance.apiKey 
      ? { 'X-API-Key': instance.apiKey }
      : {};

    const { container, action } = req.body;
    const response = await axios.post(`${instance.url}/plugins/dynamix.docker.manager/include/DockerClient.php`, 
      { container, action },
      { headers, timeout: 10000 }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
