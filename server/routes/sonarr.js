const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

// Get all configured Sonarr instances
router.get('/instances', (req, res) => {
  const instances = configManager.getServices('sonarr');
  res.json(instances);
});

// Get system status
router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const [system, queue, calendar] = await Promise.all([
      client.get('/api/v3/system/status'),
      client.get('/api/v3/queue'),
      client.get('/api/v3/calendar', { start: new Date().toISOString(), end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
    ]);

    res.json({ system, queue, calendar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get series
router.get('/series/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const series = await client.get('/api/v3/series');
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get series by ID
router.get('/series/:instanceId/:seriesId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const series = await client.get(`/api/v3/series/${req.params.seriesId}`);
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search for series
router.get('/search/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const results = await client.get('/api/v3/series/lookup', { term: req.query.term });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add series
router.post('/series/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const result = await client.post('/api/v3/series', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger series search
router.post('/command/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const result = await client.post('/api/v3/command', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get queue
router.get('/queue/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const queue = await client.get('/api/v3/queue');
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get calendar
router.get('/calendar/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const calendar = await client.get('/api/v3/calendar', req.query);
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get quality profiles
router.get('/qualityprofile/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const profiles = await client.get('/api/v3/qualityprofile');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get root folders
router.get('/rootfolder/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const folders = await client.get('/api/v3/rootfolder');
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tags
router.get('/tag/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const tags = await client.get('/api/v3/tag');
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
