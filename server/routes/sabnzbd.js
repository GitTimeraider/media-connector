const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('sabnzbd');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'queue', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/queue/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'queue', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'history', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pause/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'pause', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/resume/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'resume', output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Using GET to avoid reverse proxy POST blocking issues
router.get('/add/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    let { url } = req.query;
    console.log(`SABnzbd: Adding to instance ${req.params.instanceId}: ${url}`);
    
    // If URL is a proxied download path, we need to fetch it server-side first
    if (url && url.startsWith('/api/prowlarr/download/')) {
      // Extract the prowlarr instance ID and original URL from the path
      const match = url.match(/\/api\/prowlarr\/download\/([^?]+)\?url=(.+)/);
      if (match) {
        const prowlarrInstanceId = match[1];
        const encodedUrl = match[2];
        const originalUrl = decodeURIComponent(encodedUrl);
        
        console.log(`SABnzbd: Fetching NZB file from Prowlarr instance ${prowlarrInstanceId}`);
        
        // Get Prowlarr instance config
        const prowlarrInstances = await configManager.getServices('prowlarr');
        const prowlarrInstance = prowlarrInstances.find(i => i.id === prowlarrInstanceId);
        
        if (prowlarrInstance) {
          // Fetch the NZB file content from Prowlarr
          const fileResponse = await axios.get(originalUrl, {
            headers: { 'X-Api-Key': prowlarrInstance.apiKey },
            responseType: 'arraybuffer'
          });
          
          // Send NZB file to SABnzbd via POST with multipart/form-data
          console.log(`SABnzbd: Sending ${fileResponse.data.length} bytes as file upload`);
          const FormData = require('form-data');
          const form = new FormData();
          form.append('name', Buffer.from(fileResponse.data), {
            filename: 'download.nzb',
            contentType: 'application/x-nzb'
          });
          form.append('output', 'json');
          form.append('apikey', instance.apiKey);
          
          const response = await axios.post(`${instance.url}/api?mode=addfile`, form, {
            headers: form.getHeaders()
          });
          console.log(`SABnzbd: Add file response:`, response.data);
          return res.json(response.data);
        } else {
          console.error(`SABnzbd: Prowlarr instance ${prowlarrInstanceId} not found`);
        }
      } else {
        console.error(`SABnzbd: Could not parse proxied URL: ${url}`);
      }
    }
    
    // Fallback to URL method for direct URLs (magnet links, etc.)
    console.log(`SABnzbd: Using addurl method for: ${url}`);
    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'addurl', name: url, output: 'json', apikey: instance.apiKey }
    });
    console.log(`SABnzbd: Add URL response:`, response.data);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/queue/:instanceId/:nzoId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'queue', name: 'delete', value: req.params.nzoId, output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
