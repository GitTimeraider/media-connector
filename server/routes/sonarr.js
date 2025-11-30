const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

// Get all configured Sonarr instances
router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('sonarr');
  res.json(instances);
});

// Get system status
router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sonarr');
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
    const instances = await configManager.getServices('sonarr');
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

// Get recent downloads
router.get('/recent/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    
    // Get recent episodes from history
    const history = await client.get('/api/v3/history', { 
      pageSize: 50,
      sortKey: 'date',
      sortDirection: 'descending',
      eventType: 1 // Download Grabbed = 1, Download Completed = 4
    });
    
    // Get unique series from recent downloads
    const seriesIds = [...new Set(history.records.map(h => h.seriesId))].slice(0, 10);
    const seriesPromises = seriesIds.map(id => 
      client.get(`/api/v3/series/${id}`).catch(() => null)
    );
    const recentSeries = (await Promise.all(seriesPromises)).filter(s => s !== null);
    
    res.json(recentSeries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get series by ID
router.get('/series/:instanceId/:seriesId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sonarr');
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
    const instances = await configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const results = await client.get('/api/v3/series/lookup', { term: req.query.term });
    
    // Sort results to prioritize exact phrase matches
    const searchTerm = req.query.term.toLowerCase();
    const searchWords = searchTerm.split(/\s+/);
    
    const sortedResults = results.sort((a, b) => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();
      
      // Calculate match scores (higher = better match)
      const getScore = (title) => {
        // Exact match = highest score
        if (title === searchTerm) return 1000;
        
        // Contains exact phrase = high score
        if (title.includes(searchTerm)) {
          // Bonus if it starts with the search term
          if (title.startsWith(searchTerm)) return 900;
          return 800;
        }
        
        // Check how many search words are in the title
        const matchedWords = searchWords.filter(word => title.includes(word)).length;
        if (matchedWords === searchWords.length) {
          // All words present but not as exact phrase = medium score
          return 500 + matchedWords;
        } else if (matchedWords > 0) {
          // Some words present = low score
          return 100 + matchedWords;
        }
        
        return 0;
      };
      
      const aScore = getScore(aTitle);
      const bScore = getScore(bTitle);
      
      return bScore - aScore; // Sort descending by score
    });
    
    res.json(sortedResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add series
router.post('/series/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sonarr');
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

// Update series
router.put('/series/:instanceId/:seriesId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    // Get current series first
    const currentSeries = await client.get(`/api/v3/series/${req.params.seriesId}`);
    // Update with new values
    const updatedSeries = { ...currentSeries, ...req.body };
    const result = await client.put(`/api/v3/series/${req.params.seriesId}`, updatedSeries);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete series
router.delete('/series/:instanceId/:seriesId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sonarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const { deleteFiles } = req.query;
    const client = new ApiClient(instance.url, instance.apiKey);
    const result = await client.delete(`/api/v3/series/${req.params.seriesId}?deleteFiles=${deleteFiles === 'true'}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger series search
router.post('/command/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('sonarr');
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
    const instances = await configManager.getServices('sonarr');
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
    const instances = await configManager.getServices('sonarr');
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
    const instances = await configManager.getServices('sonarr');
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
    const instances = await configManager.getServices('sonarr');
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
    const instances = await configManager.getServices('sonarr');
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
