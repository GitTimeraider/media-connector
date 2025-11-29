const express = require('express');
const router = express.Router();
const axios = require('axios');

// TMDB API key should be configured in environment or settings
// For now using a free API key - users should replace with their own
const TMDB_API_KEY = process.env.TMDB_API_KEY || ''; // Users need to add their own key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Get popular movies
router.get('/movies/popular', async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1
      }
    });

    // Return first 20 results
    res.json(response.data.results.slice(0, 20));
  } catch (error) {
    console.error('TMDB popular movies error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming movies
router.get('/movies/upcoming', async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/movie/upcoming`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1
      }
    });

    // Return first 20 results with release dates
    res.json(response.data.results.slice(0, 20));
  } catch (error) {
    console.error('TMDB upcoming movies error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get popular TV shows
router.get('/tv/popular', async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/tv/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        page: 1
      }
    });

    // Return first 20 results
    res.json(response.data.results.slice(0, 20));
  } catch (error) {
    console.error('TMDB popular TV error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get trending movies
router.get('/trending/movies', async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/week`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US'
      }
    });

    // Return first 20 results
    res.json(response.data.results.slice(0, 20));
  } catch (error) {
    console.error('TMDB trending movies error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get trending TV shows
router.get('/trending/tv', async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/trending/tv/week`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US'
      }
    });

    // Return first 20 results
    res.json(response.data.results.slice(0, 20));
  } catch (error) {
    console.error('TMDB trending TV error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get trending (movies and TV combined) - legacy endpoint
router.get('/trending', async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/trending/all/week`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US'
      }
    });

    // Return first 20 results
    res.json(response.data.results.slice(0, 20));
  } catch (error) {
    console.error('TMDB trending error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search TMDB
router.get('/search', async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(400).json({ error: 'TMDB API key not configured' });
    }

    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/search/multi`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US',
        query: query,
        page: 1,
        include_adult: false
      }
    });

    // Filter for movies and TV shows only, return first 20 results
    const filtered = response.data.results
      .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 20);

    res.json(filtered);
  } catch (error) {
    console.error('TMDB search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
