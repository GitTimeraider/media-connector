import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Alert,
  TextField,
  InputAdornment,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CardMedia
} from '@mui/material';
import { Search as SearchIcon, Download, Category as CategoryIcon } from '@mui/icons-material';
import api from '../services/api';

function Search() {
  const [hasIndexers, setHasIndexers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [prowlarrInstance, setProwlarrInstance] = useState(null);

  const categories = [
    { value: 'all', label: 'All' },
    { 
      value: '2000', 
      label: 'Movies', 
      subcategories: [
        { value: 'all', label: 'All Movies' },
        { value: '2010', label: 'Foreign' },
        { value: '2020', label: 'Other' },
        { value: '2030', label: 'SD' },
        { value: '2040', label: 'HD' },
        { value: '2045', label: 'UHD' },
        { value: '2050', label: 'BluRay' },
        { value: '2060', label: '3D' }
      ]
    },
    { 
      value: '5000', 
      label: 'TV', 
      subcategories: [
        { value: 'all', label: 'All TV' },
        { value: '5010', label: 'WEB-DL' },
        { value: '5020', label: 'Foreign' },
        { value: '5030', label: 'SD' },
        { value: '5040', label: 'HD' },
        { value: '5045', label: 'UHD' },
        { value: '5050', label: 'Other' },
        { value: '5060', label: 'Sport' },
        { value: '5070', label: 'Anime' },
        { value: '5080', label: 'Documentary' }
      ]
    },
    { 
      value: '3000', 
      label: 'Audio', 
      subcategories: [
        { value: 'all', label: 'All Audio' },
        { value: '3010', label: 'MP3' },
        { value: '3020', label: 'Video' },
        { value: '3030', label: 'Audiobook' },
        { value: '3040', label: 'Lossless' },
        { value: '3050', label: 'Other' },
        { value: '3060', label: 'Foreign' }
      ]
    },
    { 
      value: '7000', 
      label: 'Books', 
      subcategories: [
        { value: 'all', label: 'All Books' },
        { value: '7010', label: 'Mags' },
        { value: '7020', label: 'Ebook' },
        { value: '7030', label: 'Comics' },
        { value: '7040', label: 'Technical' },
        { value: '7050', label: 'Other' },
        { value: '7060', label: 'Foreign' }
      ]
    },
    { 
      value: '1000', 
      label: 'Console', 
      subcategories: [
        { value: 'all', label: 'All Console' },
        { value: '1010', label: 'NDS' },
        { value: '1020', label: 'PSP' },
        { value: '1030', label: 'Wii' },
        { value: '1040', label: 'Xbox' },
        { value: '1050', label: 'Xbox 360' },
        { value: '1060', label: 'Wii U' },
        { value: '1070', label: 'Xbox One' },
        { value: '1080', label: 'PS4' }
      ]
    },
    { 
      value: '4000', 
      label: 'PC', 
      subcategories: [
        { value: 'all', label: 'All PC' },
        { value: '4010', label: '0day' },
        { value: '4020', label: 'ISO' },
        { value: '4030', label: 'Mac' },
        { value: '4040', label: 'Mobile-Other' },
        { value: '4050', label: 'Games' },
        { value: '4060', label: 'Mobile-iOS' },
        { value: '4070', label: 'Mobile-Android' }
      ]
    },
    { 
      value: '6000', 
      label: 'XXX', 
      subcategories: [
        { value: 'all', label: 'All XXX' },
        { value: '6010', label: 'DVD' },
        { value: '6020', label: 'WMV' },
        { value: '6030', label: 'XviD' },
        { value: '6040', label: 'x264' },
        { value: '6050', label: 'Pack' },
        { value: '6060', label: 'ImgSet' },
        { value: '6070', label: 'Other' }
      ]
    },
    { 
      value: '8000', 
      label: 'Other', 
      subcategories: [
        { value: 'all', label: 'All Other' },
        { value: '8010', label: 'Misc' }
      ]
    }
  ];

  useEffect(() => {
    checkIndexers();
  }, []);

  const checkIndexers = async () => {
    try {
      const services = await api.getServices();
      const hasProwlarr = services.prowlarr && services.prowlarr.length > 0;
      setHasIndexers(hasProwlarr);
      
      if (hasProwlarr) {
        setProwlarrInstance(services.prowlarr[0].id);
      }
    } catch (error) {
      console.error('Error checking indexers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !prowlarrInstance) return;

    setSearching(true);
    try {
      const params = {
        query: searchQuery,
        limit: 100  // Request maximum results per batch
      };
      
      // Add categories based on selection
      if (selectedCategory !== 'all') {
        const category = categories.find(c => c.value === selectedCategory);
        
        if (selectedSubcategory !== 'all') {
          // Only search specific subcategory
          params.categories = selectedSubcategory;
        } else {
          // Search all subcategories in the main category
          const categoryIds = [selectedCategory];
          if (category?.subcategories) {
            categoryIds.push(...category.subcategories.filter(s => s.value !== 'all').map(s => s.value));
          }
          params.categories = categoryIds.join(',');
        }
      }
      
      // Make multiple requests to get more results from all indexers
      // Prowlarr queries indexers in batches, so multiple requests can yield more results
      const allResults = [];
      const maxRequests = 3; // Fetch up to 3 batches (300 results max)
      
      for (let i = 0; i < maxRequests; i++) {
        const batchParams = { ...params, offset: i * 100 };
        const batchResults = await api.searchProwlarr(prowlarrInstance, batchParams);
        
        if (!batchResults || batchResults.length === 0) {
          break; // No more results available
        }
        
        allResults.push(...batchResults);
        
        // If we got fewer than 100 results, we've reached the end
        if (batchResults.length < 100) {
          break;
        }
      }
      
      const results = allResults;
      
      // Filter and score results for relevance
      const filteredResults = Array.isArray(results) ? results : [];
      const searchTerms = searchQuery.toLowerCase().split(' ');
      
      // Calculate relevance score for each result
      const scoredResults = filteredResults.map(result => {
        const title = (result.title || '').toLowerCase();
        let score = 0;
        
        // Exact match gets highest score
        if (title === searchQuery.toLowerCase()) {
          score += 100;
        }
        
        // Contains full search query
        if (title.includes(searchQuery.toLowerCase())) {
          score += 50;
        }
        
        // Check for individual search terms
        searchTerms.forEach(term => {
          if (term.length > 2 && title.includes(term)) {
            score += 10;
          }
        });
        
        // Boost score for results that start with the search query
        if (title.startsWith(searchQuery.toLowerCase())) {
          score += 25;
        }
        
        // Penalize results with too many extra words (likely unrelated)
        const titleWords = title.split(/[\s\-.[.\]]+/).filter(w => w.length > 2);
        const searchWords = searchTerms.filter(w => w.length > 2);
        const extraWords = titleWords.length - searchWords.length;
        if (extraWords > 5) {
          score -= extraWords * 2;
        }
        
        return { ...result, relevanceScore: score };
      });
      
      // Filter out results with score below threshold and sort by relevance
      const relevantResults = scoredResults
        .filter(r => r.relevanceScore > 0)
        .sort((a, b) => {
          // Sort by relevance score first
          if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
          }
          // Then by seeders if torrent
          if (a.seeders && b.seeders) {
            return b.seeders - a.seeders;
          }
          return 0;
        });
      
      setSearchResults(relevantResults);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (result) => {
    try {
      const services = await api.getServices();
      const protocol = result.protocol || (result.downloadUrl?.includes('magnet:') ? 'torrent' : 'usenet');
      
      if (protocol === 'usenet' && services.sabnzbd?.length > 0) {
        // Download via SABnzbd
        await api.addToSabnzbd(services.sabnzbd[0].id, result.downloadUrl);
        alert('Added to SABnzbd!');
      } else if (protocol === 'torrent') {
        // Download via Deluge
        if (services.deluge?.length > 0) {
          await api.addToDeluge(services.deluge[0].id, result.downloadUrl);
          alert('Added to Deluge!');
        } else {
          alert('No torrent client configured!');
        }
      } else if (protocol === 'usenet') {
        alert('No Usenet client configured!');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Failed to add download: ' + error.message);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Container>
        <Typography variant="h4" gutterBottom>Search</Typography>
        <Alert severity="info">Loading...</Alert>
      </Container>
    );
  }

  if (!hasIndexers) {
    return (
      <Container>
        <Typography variant="h4" gutterBottom>Search</Typography>
        <Alert severity="info">
          Configure Prowlarr in Settings to search across indexers.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>Search Indexers</Typography>

      <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search for movies, TV shows, music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory('all');
                }}
              >
                {categories.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {selectedCategory !== 'all' && categories.find(c => c.value === selectedCategory)?.subcategories && (
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Subcategory</InputLabel>
                <Select
                  value={selectedSubcategory}
                  label="Subcategory"
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                >
                  {categories.find(c => c.value === selectedCategory)?.subcategories.map(sub => (
                    <MenuItem key={sub.value} value={sub.value}>{sub.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} md={selectedCategory !== 'all' && categories.find(c => c.value === selectedCategory)?.subcategories ? 2 : 3}>
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={searching || !searchQuery.trim()}
              startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {searchResults.length > 0 && (
        <>
          <Alert severity="success" sx={{ mb: 2 }}>
            Found {searchResults.length} relevant result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            {selectedCategory !== 'all' && ` in ${categories.find(c => c.value === selectedCategory)?.label}`}
          </Alert>
          <Grid container spacing={2}>
            {searchResults.map((result, index) => (
            <Grid item xs={12} key={index}>
              <Card sx={{ 
                border: result.relevanceScore >= 100 ? '2px solid #4caf50' : 
                        result.relevanceScore >= 50 ? '2px solid #2196f3' : 
                        '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
                {result.coverUrl && (
                  <CardMedia
                    component="img"
                    sx={{ 
                      width: { xs: '100%', sm: 140 },
                      height: { xs: 200, sm: 'auto' },
                      objectFit: 'cover'
                    }}
                    image={result.coverUrl}
                    alt={result.title}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <CardContent sx={{ flex: '1 0 auto' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" sx={{ flex: 1, pr: 2 }}>
                        {result.title}
                      </Typography>
                      {result.relevanceScore >= 100 && (
                        <Chip label="Exact Match" size="small" color="success" />
                      )}
                      {result.relevanceScore >= 50 && result.relevanceScore < 100 && (
                        <Chip label="High Match" size="small" color="primary" />
                      )}
                    </Box>
                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      {result.categoryDisplay && (
                        <Chip 
                          icon={<CategoryIcon />}
                          label={result.categoryDisplay} 
                          size="small" 
                          color="secondary"
                          sx={{ fontWeight: 600 }}
                        />
                      )}
                      <Chip label={result.indexer} size="small" color="primary" />
                      <Chip 
                        label={result.protocol === 'torrent' ? 'Torrent' : 'Usenet'} 
                        size="small" 
                        color={result.protocol === 'torrent' ? 'success' : 'info'}
                      />
                      <Chip label={formatBytes(result.size)} size="small" />
                      {result.seeders !== undefined && result.seeders > 0 && (
                        <Chip label={`↑ ${result.seeders}`} size="small" color="success" />
                      )}
                      {result.leechers !== undefined && (
                        <Chip label={`↓ ${result.leechers}`} size="small" />
                      )}
                      {result.publishDate && (
                        <Chip label={new Date(result.publishDate).toLocaleDateString()} size="small" />
                      )}
                    </Box>
                    {result.infoUrl && (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        Source: {result.infoUrl}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Download />}
                      onClick={() => handleDownload(result)}
                      disabled={!result.downloadUrl}
                    >
                      Add to Client
                    </Button>
                    <Button
                      size="small"
                      href={result.downloadUrl}
                      target="_blank"
                      disabled={!result.downloadUrl}
                    >
                      Manual Download
                    </Button>
                  </CardActions>
                </Box>
              </Card>
            </Grid>
          ))}
          </Grid>
        </>
      )}

      {searchResults.length === 0 && searchQuery && !searching && (
        <Alert severity="info">
          No results found. Try adjusting your search query or category.
        </Alert>
      )}
    </Container>
  );
}

export default Search;
