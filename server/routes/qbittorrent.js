const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('qbittorrent');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api/v2/app/version`, {
      timeout: 5000
    });
    
    res.json({ status: 'online', version: response.data });
  } catch (error) {
    res.status(200).json({ status: 'offline', error: error.message });
  }
});

router.post('/login/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.post(`${instance.url}/api/v2/auth/login`, 
      `username=${instance.username}&password=${instance.password}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    res.json({ cookie: response.headers['set-cookie'] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/torrents/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api/v2/torrents/info`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/torrents/pause/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.post(`${instance.url}/api/v2/torrents/pause`, 
      `hashes=${req.body.hashes}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/torrents/resume/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.post(`${instance.url}/api/v2/torrents/resume`, 
      `hashes=${req.body.hashes}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/add/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const { url } = req.body;
    
    // Login first to get cookie
    const loginResponse = await axios.post(`${instance.url}/api/v2/auth/login`, 
      `username=${instance.username}&password=${instance.password}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const cookie = loginResponse.headers['set-cookie'];
    
    // Add torrent
    const response = await axios.post(`${instance.url}/api/v2/torrents/add`,
      `urls=${encodeURIComponent(url)}`,
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookie
        } 
      }
    );
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pause/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const { hash } = req.body;
    
    // Login first to get cookie
    const loginResponse = await axios.post(`${instance.url}/api/v2/auth/login`, 
      `username=${instance.username}&password=${instance.password}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const cookie = loginResponse.headers['set-cookie'];
    
    // Pause torrent
    const response = await axios.post(`${instance.url}/api/v2/torrents/pause`,
      `hashes=${hash}`,
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookie
        } 
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/torrents/:instanceId/:hash', async (req, res) => {
  try {
    const instances = await configManager.getServices('qbittorrent');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // Login first to get cookie
    const loginResponse = await axios.post(`${instance.url}/api/v2/auth/login`, 
      `username=${instance.username}&password=${instance.password}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const cookie = loginResponse.headers['set-cookie'];
    
    // Delete torrent
    const response = await axios.post(`${instance.url}/api/v2/torrents/delete`,
      `hashes=${req.params.hash}&deleteFiles=false`,
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookie
        } 
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
