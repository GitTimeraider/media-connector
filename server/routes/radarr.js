const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

// Get all configured Radarr instances
router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('radarr');
  res.json(instances);
});

// Get system status
router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const [system, queue, calendar] = await Promise.all([
      client.getSystemStatus(),
      client.getQueue(),
      client.getCalendar()
    ]);

    res.json({ system, queue, calendar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get movies
router.get('/movie/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const movies = await client.getMovies();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent downloads
router.get('/recent/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const movies = await client.getMovies();
    
    // Filter movies that have been downloaded recently (have files and recent download date)
    const recentMovies = movies
      .filter(m => m.hasFile && m.movieFile)
      .sort((a, b) => new Date(b.movieFile.dateAdded) - new Date(a.movieFile.dateAdded))
      .slice(0, 10);
    
    res.json(recentMovies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get movie by ID
router.get('/movie/:instanceId/:movieId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const movie = await client.getMovieById(req.params.movieId);
    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search for movies
router.get('/search/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const results = await client.searchMovies({ term: req.query.term });
    
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

// Add movie
// Add movie via GET (avoids proxy POST restrictions)
router.get('/add/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    
    // First, lookup the movie to get the complete object
    const tmdbId = parseInt(req.query.tmdbId);
    const lookupResults = await client.searchMovies({ term: `tmdb:${tmdbId}` });
    
    if (!lookupResults || lookupResults.length === 0) {
      return res.status(404).json({ error: 'Movie not found in Radarr lookup' });
    }
    
    // Get the complete movie object from lookup
    const movieData = lookupResults[0];
    
    // Override with user-selected options
    movieData.qualityProfileId = parseInt(req.query.qualityProfileId);
    movieData.rootFolderPath = req.query.rootFolderPath;
    movieData.monitored = req.query.monitored === 'true';
    
    // Handle tags - only add if provided and not empty
    if (req.query.tags && req.query.tags.trim()) {
      movieData.tags = req.query.tags.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
    } else {
      movieData.tags = [];
    }
    
    movieData.addOptions = {
      searchForMovie: req.query.searchForMovie === 'true'
    };

    const result = await client.addMovie(movieData);
    res.json(result);
  } catch (error) {
    console.error('Radarr add error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || error.message });
  }
});

// Add movie via POST (legacy, may be blocked by some proxies)
router.post('/movie/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const result = await client.addMovie(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update movie
router.put('/movie/:instanceId/:movieId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    // Get current movie first
    const currentMovie = await client.getMovieById(req.params.movieId);
    // Update with new values
    const updatedMovie = { ...currentMovie, ...req.body };
    const result = await client.updateMovie(req.params.movieId, updatedMovie);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete movie
router.delete('/movie/:instanceId/:movieId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const { deleteFiles } = req.query;
    const client = new ApiClient(instance.url, instance.apiKey);
    const result = await client.deleteMovie(req.params.movieId, { deleteFiles: deleteFiles === 'true' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger movie search
router.post('/command/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const result = await client.postCommand(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get queue
router.get('/queue/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const queue = await client.getQueue();
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get calendar
router.get('/calendar/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const calendar = await client.getCalendar(req.query);
    res.json(calendar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get quality profiles
router.get('/qualityprofile/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const profiles = await client.getQualityProfiles();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get root folders
router.get('/rootfolder/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const folders = await client.getRootFolders();
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tags
router.get('/tag/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('radarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const client = new ApiClient(instance.url, instance.apiKey);
    const tags = await client.getTags();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
