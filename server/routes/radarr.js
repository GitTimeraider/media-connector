const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

// Get all configured Radarr instances
router.get('/instances', (req, res) => {
  const instances = configManager.getServices('radarr');
  res.json(instances);
});

// Get system status
router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const [system, queue, calendar] = await Promise.all([
      client.get('/api/v3/system/status'),
      client.get('/api/v3/queue'),
      client.get('/api/v3/calendar')
    ]);

    res.json({ system, queue, calendar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get movies
router.get('/movie/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const movies = await client.get('/api/v3/movie');
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get movie by ID
router.get('/movie/:instanceId/:movieId', async (req, res) => {
  try {
    const instances = configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const movie = await client.get(`/api/v3/movie/${req.params.movieId}`);
    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search for movies
router.get('/search/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const results = await client.get('/api/v3/movie/lookup', { term: req.query.term });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add movie
router.post('/movie/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const result = await client.post('/api/v3/movie', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger movie search
router.post('/command/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('radarr');
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
    const instances = configManager.getServices('radarr');
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
    const instances = configManager.getServices('radarr');
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
    const instances = configManager.getServices('radarr');
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
    const instances = configManager.getServices('radarr');
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
    const instances = configManager.getServices('radarr');
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
