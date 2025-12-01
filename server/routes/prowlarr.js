const express = require('express');
const router = express.Router();
const ApiClient = require('../utils/apiClient');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('prowlarr');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const system = await client.getV1SystemStatus();
    res.json({ system });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/indexers/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    const indexers = await client.getIndexers();
    res.json(indexers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('prowlarr');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const client = new ApiClient(instance.url, instance.apiKey);
    
    // Build query params
    let queryString = `/api/v1/search?query=${encodeURIComponent(req.query.query)}&type=search`;
    
    // Add categories if specified (comma-separated string)
    if (req.query.categories) {
      const categories = req.query.categories.split(',');
      categories.forEach(cat => {
        queryString += `&categories=${cat}`;
      });
    }
    
    // Make direct axios call with pre-formatted query string
    const axios = require('axios');
    const response = await axios.get(`${instance.url}${queryString}`, {
      headers: {
        'X-Api-Key': instance.apiKey
      },
      timeout: 30000
    });
    
    // Enrich results with category names
    const categoryMap = {
      '1000': 'Console', '1010': 'Console/NDS', '1020': 'Console/PSP', '1030': 'Console/Wii',
      '1040': 'Console/Xbox', '1050': 'Console/Xbox 360', '1060': 'Console/Wii U',
      '1070': 'Console/Xbox One', '1080': 'Console/PS4',
      '2000': 'Movies', '2010': 'Movies/Foreign', '2020': 'Movies/Other', '2030': 'Movies/SD',
      '2040': 'Movies/HD', '2045': 'Movies/UHD', '2050': 'Movies/BluRay', '2060': 'Movies/3D',
      '3000': 'Audio', '3010': 'Audio/MP3', '3020': 'Audio/Video', '3030': 'Audio/Audiobook',
      '3040': 'Audio/Lossless', '3050': 'Audio/Other', '3060': 'Audio/Foreign',
      '4000': 'PC', '4010': 'PC/0day', '4020': 'PC/ISO', '4030': 'PC/Mac',
      '4040': 'PC/Mobile-Other', '4050': 'PC/Games', '4060': 'PC/Mobile-iOS', '4070': 'PC/Mobile-Android',
      '5000': 'TV', '5010': 'TV/WEB-DL', '5020': 'TV/Foreign', '5030': 'TV/SD',
      '5040': 'TV/HD', '5045': 'TV/UHD', '5050': 'TV/Other', '5060': 'TV/Sport',
      '5070': 'TV/Anime', '5080': 'TV/Documentary',
      '6000': 'XXX', '6010': 'XXX/DVD', '6020': 'XXX/WMV', '6030': 'XXX/XviD',
      '6040': 'XXX/x264', '6050': 'XXX/Pack', '6060': 'XXX/ImgSet', '6070': 'XXX/Other',
      '7000': 'Books', '7010': 'Books/Mags', '7020': 'Books/Ebook', '7030': 'Books/Comics',
      '7040': 'Books/Technical', '7050': 'Books/Other', '7060': 'Books/Foreign',
      '8000': 'Other', '8010': 'Other/Misc'
    };
    
    const enrichedResults = response.data.map(result => {
      const categoryNames = result.categories ? result.categories.map(catId => categoryMap[String(catId)] || `Category ${catId}`) : [];
      return {
        ...result,
        categoryNames,
        categoryDisplay: categoryNames.join(', ') || 'Unknown',
        // Cover/poster images from various possible fields
        coverUrl: result.posterUrl || result.cover || result.downloadUrl?.match(/https?:\/\/.*\.(jpg|jpeg|png|gif)/i)?.[0] || null
      };
    });
    
    res.json(enrichedResults);
  } catch (error) {
    console.error('Prowlarr search error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

module.exports = router;
