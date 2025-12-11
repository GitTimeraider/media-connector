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

// Pause individual download
router.post('/pause/:instanceId/:nzoId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'queue', name: 'pause', value: req.params.nzoId, output: 'json', apikey: instance.apiKey }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resume individual download
router.post('/resume/:instanceId/:nzoId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sabnzbd');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'queue', name: 'resume', value: req.params.nzoId, output: 'json', apikey: instance.apiKey }
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
    
    // If URL is a proxied download path, we need to fetch it server-side first
    if (url && url.startsWith('/api/prowlarr/download/')) {
      // Extract the prowlarr instance ID and original URL using safer parsing
      const urlParts = url.split('?');
      if (urlParts.length === 2) {
        const pathPart = urlParts[0];
        const queryPart = urlParts[1];
        const prowlarrInstanceId = pathPart.split('/').pop();
        const urlParams = new URLSearchParams(queryPart);
        const originalUrl = urlParams.get('url');
        
        if (prowlarrInstanceId && originalUrl) {
          // Get Prowlarr instance config
          const prowlarrInstances = await configManager.getServices('prowlarr');
          const prowlarrInstance = prowlarrInstances.find(i => i.id === prowlarrInstanceId);
          
          if (prowlarrInstance) {
            // Validate that the URL belongs to the configured Prowlarr instance (SSRF protection)
            const urlValidator = require('../utils/urlValidator');
            const validation = urlValidator.validateServiceUrl(originalUrl);
            if (!validation.valid) {
              return res.status(400).json({ error: 'Invalid download URL: ' + validation.error });
            }
            
            // Ensure the URL is from the configured Prowlarr instance
            const prowlarrBaseUrl = new URL(prowlarrInstance.url);
            const downloadUrl = new URL(originalUrl);
            if (downloadUrl.origin !== prowlarrBaseUrl.origin) {
              return res.status(400).json({ error: 'Download URL does not match configured Prowlarr instance' });
            }
            
            // Fetch the NZB file content from Prowlarr
            const fileResponse = await axios.get(originalUrl, {
              headers: { 'X-Api-Key': prowlarrInstance.apiKey },
              responseType: 'arraybuffer'
            });
            
            // Extract filename from Content-Disposition header or URL
            let filename = 'download.nzb';
            const contentDisposition = fileResponse.headers['content-disposition'];
            if (contentDisposition) {
              const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
              if (filenameMatch) {
                filename = filenameMatch[1];
              }
            } else {
              // Try to extract from URL file parameter
              const urlMatch = originalUrl.match(/[?&]file=([^&]+)/);
              if (urlMatch) {
                filename = decodeURIComponent(urlMatch[1]);
                if (!filename.endsWith('.nzb')) {
                  filename += '.nzb';
                }
              }
            }
            
            // Send NZB file to SABnzbd via POST with multipart/form-data
            const FormData = require('form-data');
            const form = new FormData();
            form.append('name', Buffer.from(fileResponse.data), {
              filename: filename,
              contentType: 'application/x-nzb'
            });
            form.append('output', 'json');
            form.append('apikey', instance.apiKey);
            
            const response = await axios.post(`${instance.url}/api?mode=addfile`, form, {
              headers: form.getHeaders()
            });
            return res.json(response.data);
          }
        }
      }
    }
    
    // Fallback to URL method for direct URLs (magnet links, etc.)
    const response = await axios.get(`${instance.url}/api`, {
      params: { mode: 'addurl', name: url, output: 'json', apikey: instance.apiKey }
    });
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
