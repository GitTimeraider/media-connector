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

// Using GET to avoid reverse proxy POST blocking issues
router.get('/add/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('deluge');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    let { url } = req.query;
    console.log(`Deluge: Adding to instance ${req.params.instanceId}: ${url}`);
    
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

    // If URL is a proxied download path, fetch the torrent file first
    let torrentData = null;
    if (url && url.startsWith('/api/prowlarr/download/')) {
      // Extract the prowlarr instance ID and original URL from the path
      const match = url.match(/\/api\/prowlarr\/download\/([^?]+)\?url=(.+)/);
      if (match) {
        const prowlarrInstanceId = match[1];
        const encodedUrl = match[2];
        const originalUrl = decodeURIComponent(encodedUrl);
        
        console.log(`Deluge: Fetching torrent file from Prowlarr instance ${prowlarrInstanceId}`);
        
        // Get Prowlarr instance config
        const prowlarrInstances = await configManager.getServices('prowlarr');
        const prowlarrInstance = prowlarrInstances.find(i => i.id === prowlarrInstanceId);
        
        if (prowlarrInstance) {
          // Fetch the torrent file content from Prowlarr
          const fileResponse = await axios.get(originalUrl, {
            headers: { 'X-Api-Key': prowlarrInstance.apiKey },
            responseType: 'arraybuffer'
          });
          
          // Convert to base64 for Deluge
          torrentData = Buffer.from(fileResponse.data).toString('base64');
          console.log(`Deluge: Fetched ${fileResponse.data.length} bytes as base64 (${torrentData.length} chars)`);
        } else {
          console.error(`Deluge: Prowlarr instance ${prowlarrInstanceId} not found`);
        }
      } else {
        console.error(`Deluge: Could not parse proxied URL: ${url}`);
      }
    }

    // Add torrent by file data or URL
    let addResponse;
    if (torrentData) {
      // Add by file data
      console.log(`Deluge: Using core.add_torrent_file method`);
      addResponse = await axios.post(`${instance.url}/json`, {
        method: 'core.add_torrent_file',
        params: ['', torrentData, {}],
        id: 2
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      });
    } else {
      // Add by URL (for magnet links)
      console.log(`Deluge: Using web.add_torrents method for: ${url}`);
      addResponse = await axios.post(`${instance.url}/json`, {
        method: 'web.add_torrents',
        params: [[{ path: url, options: {} }]],
        id: 2
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      });
    }

    console.log(`Deluge: Add response:`, addResponse.data);
    res.json({ success: true, data: addResponse.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
