import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CardActionArea,
  Fade,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox
} from '@mui/material';
import {
  LiveTv,
  Movie,
  Warning,
  Download,
  CalendarToday,
  Star,
  Info,
  PlayArrow,
  Add,
  Close,
  Search as SearchIcon
} from '@mui/icons-material';
import api from '../services/api';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState({});
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  
  // Drag-to-scroll functionality
  const handleMouseDown = (e) => {
    const slider = e.currentTarget;
    slider.isDown = true;
    slider.startX = e.pageX - slider.offsetLeft;
    slider.scrollLeftStart = slider.scrollLeft;
    slider.style.cursor = 'grabbing';
    slider.style.userSelect = 'none';
  };

  const handleMouseLeave = (e) => {
    const slider = e.currentTarget;
    slider.isDown = false;
    slider.style.cursor = 'grab';
  };

  const handleMouseUp = (e) => {
    const slider = e.currentTarget;
    slider.isDown = false;
    slider.style.cursor = 'grab';
  };

  const handleMouseMove = (e) => {
    const slider = e.currentTarget;
    if (!slider.isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - slider.startX) * 2; // Multiply by 2 for faster scrolling
    slider.scrollLeft = slider.scrollLeftStart - walk;
  };
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [recentDownloads, setRecentDownloads] = useState({ movies: [], series: [] });
  const [tmdbLoading, setTmdbLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [itemToAdd, setItemToAdd] = useState(null);
  const [qualityProfiles, setQualityProfiles] = useState([]);
  const [rootFolders, setRootFolders] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [tags, setTags] = useState('');
  const [monitored, setMonitored] = useState(true);
  const [searchOnAdd, setSearchOnAdd] = useState(true);

  useEffect(() => {
    loadDashboard();
    loadTMDBContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const servicesData = await api.getServices();
      setServices(servicesData);

      // Load recent downloads
      if (servicesData.sonarr?.length > 0) {
        api.getRecentSonarrDownloads(servicesData.sonarr[0].id)
          .then(series => setRecentDownloads(prev => ({ ...prev, series })))
          .catch(() => {});
      }

      if (servicesData.radarr?.length > 0) {
        api.getRecentRadarrDownloads(servicesData.radarr[0].id)
          .then(movies => setRecentDownloads(prev => ({ ...prev, movies })))
          .catch(() => {});
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTMDBContent = async () => {
    try {
      setTmdbLoading(true);
      const [trendingMoviesRes, trendingTVRes, upcomingRes] = await Promise.allSettled([
        api.getTrendingMovies(),
        api.getTrendingTVShows(),
        api.getUpcomingMovies()
      ]);
      
      // Fetch cast for each item
      const enrichWithCast = async (items, mediaType) => {
        if (!items || items.length === 0) return [];
        const enriched = await Promise.all(items.map(async (item) => {
          try {
            const details = await api.getTMDBDetails(item.id, mediaType);
            return { ...item, cast: details.credits?.cast || [], genres: details.genres || [] };
          } catch (error) {
            return item;
          }
        }));
        return enriched;
      };
      
      if (trendingMoviesRes.status === 'fulfilled') {
        const moviesWithCast = await enrichWithCast(trendingMoviesRes.value, 'movie');
        setTrendingMovies(moviesWithCast || []);
      }
      if (trendingTVRes.status === 'fulfilled') {
        const tvWithCast = await enrichWithCast(trendingTVRes.value, 'tv');
        setTrendingTV(tvWithCast || []);
      }
      if (upcomingRes.status === 'fulfilled') {
        const upcomingWithCast = await enrichWithCast(upcomingRes.value, 'movie');
        setUpcomingMovies(upcomingWithCast || []);
      }
    } catch (error) {
      console.error('Error loading TMDB content:', error);
    } finally {
      setTmdbLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearching(true);
      const results = await api.searchTMDB(searchQuery);
      
      // Enrich results with cast information
      const enrichedResults = await Promise.all((results || []).map(async (item) => {
        try {
          const mediaType = item.media_type || 'movie';
          const details = await api.getTMDBDetails(item.id, mediaType);
          return { ...item, cast: details.credits?.cast || [] };
        } catch {
          return item;
        }
      }));
      
      setSearchResults(enrichedResults);
    } catch (error) {
      console.error('Error searching TMDB:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleOpenAddDialog = async (item, mediaType) => {
    console.log('Opening add dialog:', { item, mediaType, services });
    setItemToAdd({ ...item, mediaType });
    setAddDialogOpen(true);
    
    // Load profiles and folders from Radarr/Sonarr
    try {
      if (mediaType === 'movie' && services.radarr?.length > 0) {
        const profiles = await api.getRadarrQualityProfiles(services.radarr[0].id);
        const folders = await api.getRadarrRootFolders(services.radarr[0].id);
        setQualityProfiles(profiles || []);
        setRootFolders(folders || []);
        if (profiles?.length > 0) setSelectedProfile(profiles[0].id);
        if (folders?.length > 0) setSelectedFolder(folders[0].path);
      } else if (mediaType === 'tv' && services.sonarr?.length > 0) {
        const profiles = await api.getSonarrQualityProfiles(services.sonarr[0].id);
        const folders = await api.getSonarrRootFolders(services.sonarr[0].id);
        setQualityProfiles(profiles || []);
        setRootFolders(folders || []);
        if (profiles?.length > 0) setSelectedProfile(profiles[0].id);
        if (folders?.length > 0) setSelectedFolder(folders[0].path);
      }
    } catch (error) {
      console.error('Error loading profiles/folders:', error);
    }
  };

  const handleAddToLibraryWithOptions = async () => {
    if (!itemToAdd || !selectedProfile || !selectedFolder) return;
    
    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      const mediaType = itemToAdd.mediaType;
      
      if (mediaType === 'movie' && services.radarr?.length > 0) {
        await api.addRadarrMovie(services.radarr[0].id, {
          tmdbId: itemToAdd.id,
          title: itemToAdd.title,
          year: itemToAdd.release_date ? new Date(itemToAdd.release_date).getFullYear() : null,
          qualityProfileId: parseInt(selectedProfile),
          rootFolderPath: selectedFolder,
          monitored,
          tags: tagsArray,
          addOptions: { searchForMovie: searchOnAdd }
        });
        alert(`Added "${itemToAdd.title}" to Radarr!`);
      } else if (mediaType === 'tv' && services.sonarr?.length > 0) {
        await api.addSonarrSeries(services.sonarr[0].id, {
          tvdbId: itemToAdd.id,
          title: itemToAdd.name || itemToAdd.title,
          qualityProfileId: parseInt(selectedProfile),
          rootFolderPath: selectedFolder,
          monitored,
          tags: tagsArray,
          addOptions: { searchForMissingEpisodes: searchOnAdd }
        });
        alert(`Added "${itemToAdd.name || itemToAdd.title}" to Sonarr!`);
      }
      
      setAddDialogOpen(false);
      setItemToAdd(null);
      setTags('');
    } catch (error) {
      console.error('Error adding to library:', error);
      alert(`Failed to add: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleOpenDialog = (item) => {
    try {
      // Ensure cast and genres are arrays
      const sanitizedItem = {
        ...item,
        cast: Array.isArray(item.cast) ? item.cast : [],
        genres: Array.isArray(item.genres) ? item.genres : []
      };
      setSelectedItem(sanitizedItem);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error opening dialog:', error);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTimeout(() => setSelectedItem(null), 200);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const hasServices = Object.values(services).some(arr => arr.length > 0);

  if (!hasServices) {
    return (
      <Container>
        <Alert severity="info" icon={<Warning />}>
          No services configured. Go to Settings to add your media services.
        </Alert>
      </Container>
    );
  }

  // Genre ID to name mapping
  const getGenreName = (genreId, mediaType) => {
    const movieGenres = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
    };
    const tvGenres = {
      10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery',
      10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
      10767: 'Talk', 10768: 'War & Politics', 37: 'Western'
    };
    const genres = mediaType === 'tv' ? tvGenres : movieGenres;
    return genres[genreId] || 'Other';
  };

  const MediaCard = ({ item, type, index, showReleaseDate, isDownloaded }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const imageUrl = item.poster_path || item.posterUrl
      ? `https://image.tmdb.org/t/p/w500${item.poster_path || item.posterUrl}`
      : item.images?.find(img => img.coverType === 'poster')?.remoteUrl || 'https://via.placeholder.com/300x450?text=No+Image';
    
    const title = item.title || item.name || 'Unknown';
    const year = item.release_date ? new Date(item.release_date).getFullYear() 
      : item.first_air_date ? new Date(item.first_air_date).getFullYear()
      : item.year || '';
    
    const releaseDate = item.release_date ? new Date(item.release_date) : null;
    const formattedDate = releaseDate ? releaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    
    // Check if item is already in library (from Radarr/Sonarr) - these will have tmdbId or tvdbId but also have Radarr/Sonarr id
    // Or if it's from the recentDownloads sections (these are already in library)
    const isInLibrary = Boolean(
      isDownloaded || // Explicitly marked as downloaded
      item.hasFile || // Radarr/Sonarr item with file
      (item.id && item.monitored !== undefined) || // Has Radarr/Sonarr ID and monitored property
      item.downloaded // From recent downloads
    );
    
    return (
      <Card 
        sx={{ 
          width: '100%',
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-12px) scale(1.03)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            zIndex: 10
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardActionArea onClick={() => handleOpenDialog(item)}>
          <Box sx={{ position: 'relative', overflow: 'hidden', height: { xs: 200, sm: 225, md: 250 }, width: '100%' }}>
              <CardMedia
                component="img"
                image={imageUrl}
                alt={title}
                sx={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  transition: 'transform 0.3s ease',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  display: 'block'
                }}
              />
              <Fade in={isHovered}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    p: 2
                  }}
                >
                  <Box display="flex" gap={1}>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small" 
                        sx={{ 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                      >
                        <Info />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Play Trailer">
                      <IconButton 
                        size="small" 
                        sx={{ 
                          bgcolor: 'success.main', 
                          color: 'white',
                          '&:hover': { bgcolor: 'success.dark' }
                        }}
                      >
                        <PlayArrow />
                      </IconButton>
                    </Tooltip>
                    {!isInLibrary && (
                      <Tooltip title="Add to Library">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('Add button clicked on MediaCard');
                            const mediaType = type || item.media_type;
                            console.log('Calling handleOpenAddDialog with:', { item, mediaType });
                            handleOpenAddDialog(item, mediaType);
                          }}
                          sx={{ 
                            bgcolor: 'secondary.main', 
                            color: 'white',
                            '&:hover': { bgcolor: 'secondary.dark' }
                          }}
                        >
                          <Add />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Fade>
            </Box>
            <CardContent sx={{ flexGrow: 1, pb: 2 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  minHeight: '3em'
                }} 
                title={title}
              >
                {title}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1} flexWrap="wrap">
                {year && (
                  <Chip 
                    label={year} 
                    size="small" 
                    sx={{ 
                      fontWeight: 500,
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                    }} 
                  />
                )}
                {item.vote_average && (
                  <Chip 
                    icon={<Star sx={{ fontSize: 16, color: '#FFD700 !important' }} />}
                    label={item.vote_average.toFixed(1)} 
                    size="small" 
                    sx={{ 
                      fontWeight: 500,
                      background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)'
                    }}
                  />
                )}
                {item.media_type && (
                  <Chip 
                    label={item.media_type === 'movie' ? 'Movie' : 'TV'} 
                    size="small"
                    icon={item.media_type === 'movie' ? <Movie sx={{ fontSize: 16 }} /> : <LiveTv sx={{ fontSize: 16 }} />}
                    variant="outlined"
                  />
                )}
                {item.genre_ids && Array.isArray(item.genre_ids) && item.genre_ids.length > 0 && (
                  <Chip 
                    label={getGenreName(item.genre_ids[0], type || item.media_type)} 
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
                {item.genres && Array.isArray(item.genres) && item.genres.length > 0 && typeof item.genres[0] === 'object' && (
                  <Chip 
                    label={item.genres[0].name || ''} 
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
                {showReleaseDate && formattedDate && (
                  <Chip 
                    icon={<CalendarToday sx={{ fontSize: 16 }} />}
                    label={formattedDate} 
                    size="small" 
                    sx={{ 
                      fontWeight: 500,
                      background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)'
                    }}
                  />
                )}
              </Box>
              {item.cast && Array.isArray(item.cast) && item.cast.length > 0 && (
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    mt: 1,
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.7rem'
                  }}
                  title={item.cast.slice(0, 5).map(actor => typeof actor === 'string' ? actor : actor?.name || '').filter(n => n).join(', ')}
                >
                  ⭐ {item.cast.slice(0, 3).map(actor => typeof actor === 'string' ? actor : actor?.name || '').filter(n => n).join(', ')}
                </Typography>
              )}
            </CardContent>
        </CardActionArea>
      </Card>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 4, overflowX: 'hidden', width: '100%' }}>
      {/* Search Bar */}
      <Paper 
        elevation={2}
        sx={{ 
          mb: 4, 
          p: { xs: 1.5, sm: 2 }, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          gap: { xs: 1.5, sm: 0 },
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search for movies and TV shows on TMDB..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          sx={{ mr: { xs: 0, sm: 2 } }}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            ),
          }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
          sx={{ 
            minWidth: { sm: 120 },
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          {searching ? 'Searching...' : 'Search'}
        </Button>
      </Paper>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 2, 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <SearchIcon />
            Search Results
          </Typography>
          <Box
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              overflowY: 'hidden',
              pb: 2,
              cursor: 'grab',
              width: '100%',
              maxWidth: '100%',
              '&::-webkit-scrollbar': {
                height: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.4)',
                },
              },
              overscrollBehavior: 'contain auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {searchResults.map((item, index) => (
              <Box key={`${item.id}-${index}`} sx={{ width: { xs: 140, sm: 160, md: 200 }, minWidth: { xs: 140, sm: 160, md: 200 }, maxWidth: { xs: 140, sm: 160, md: 200 }, flexShrink: 0 }}>
                <MediaCard item={item} type={item.media_type} index={index} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
      >
        {selectedItem && (
          <>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                {selectedItem.title || selectedItem.name}
              </Typography>
              <IconButton onClick={handleCloseDialog} size="small">
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <CardMedia
                    component="img"
                    image={
                      selectedItem.poster_path || selectedItem.posterUrl
                        ? `https://image.tmdb.org/t/p/w500${selectedItem.poster_path || selectedItem.posterUrl}`
                        : selectedItem.images?.find(img => img.coverType === 'poster')?.remoteUrl || 'https://via.placeholder.com/300x450?text=No+Image'
                    }
                    alt={selectedItem.title || selectedItem.name}
                    sx={{ borderRadius: 2, width: '100%' }}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                    {(selectedItem.release_date || selectedItem.first_air_date || selectedItem.year) && (
                      <Chip 
                        label={
                          selectedItem.release_date ? new Date(selectedItem.release_date).getFullYear()
                          : selectedItem.first_air_date ? new Date(selectedItem.first_air_date).getFullYear()
                          : selectedItem.year
                        } 
                        color="primary"
                      />
                    )}
                    {selectedItem.vote_average && (
                      <Chip 
                        icon={<Star sx={{ color: '#FFD700 !important' }} />}
                        label={`${selectedItem.vote_average.toFixed(1)} / 10`}
                        color="warning"
                      />
                    )}
                    {selectedItem.media_type && (
                      <Chip label={selectedItem.media_type === 'movie' ? 'Movie' : 'TV Show'} />
                    )}
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Overview
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {selectedItem.overview || 'No overview available.'}
                  </Typography>
                  {selectedItem.genres && Array.isArray(selectedItem.genres) && selectedItem.genres.length > 0 && (
                    <>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                        Genres
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {selectedItem.genres.map((genre, index) => (
                          <Chip 
                            key={index} 
                            label={typeof genre === 'string' ? genre : genre?.name || ''} 
                            variant="outlined" 
                            size="small" 
                          />
                        ))}
                      </Box>
                    </>
                  )}
                  {selectedItem.cast && Array.isArray(selectedItem.cast) && selectedItem.cast.length > 0 && (
                    <>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                        Cast
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {selectedItem.cast.slice(0, 5).map((actor, index) => (
                          <Chip 
                            key={index} 
                            label={typeof actor === 'string' ? actor : actor?.name || ''} 
                            variant="outlined" 
                            size="small" 
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button 
                variant="contained" 
                startIcon={<Add />}
                onClick={() => {
                  const mediaType = selectedItem.media_type || (selectedItem.title ? 'movie' : 'tv');
                  handleCloseDialog();
                  handleOpenAddDialog(selectedItem, mediaType);
                }}
              >
                Add to Library
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      


      {/* Trending Movies */}
      <Box sx={{ mt: 5 }}>
        <Box 
          display="flex" 
          alignItems="center" 
          mb={3}
          sx={{
            background: 'linear-gradient(90deg, rgba(255,87,34,0.1) 0%, transparent 100%)',
            p: 2,
            borderRadius: 2,
            borderLeft: 4,
            borderColor: 'warning.main'
          }}
        >
          <Movie sx={{ mr: 1.5, fontSize: 32, color: 'warning.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>Trending Movies</Typography>
            <Typography variant="caption" color="text.secondary">Most popular movies this week</Typography>
          </Box>
        </Box>
        {tmdbLoading ? (
          <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Box key={i} sx={{ minWidth: 200, flexShrink: 0 }}>
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                <Skeleton variant="text" sx={{ mt: 1 }} />
                <Skeleton variant="text" width="60%" />
              </Box>
            ))}
          </Box>
        ) : trendingMovies.length > 0 ? (
          <Box 
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            sx={{ 
            display: 'flex', 
            gap: 3, 
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: 2,
            cursor: 'grab',
            '&::-webkit-scrollbar': {
              height: 8
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              '&:hover': {
                background: 'rgba(255,255,255,0.3)'
              }
            },
            overscrollBehavior: 'contain auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            {trendingMovies.map((item, index) => (
              <Box key={index} sx={{ width: { xs: 140, sm: 160, md: 200 }, minWidth: { xs: 140, sm: 160, md: 200 }, maxWidth: { xs: 140, sm: 160, md: 200 }, flexShrink: 0 }}>
                <MediaCard item={item} type="movie" index={index} />
              </Box>
            ))}
          </Box>
        ) : (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Configure TMDB_API_KEY in environment variables to see trending movies
          </Alert>
        )}
      </Box>

      {/* Trending TV Shows */}
      <Box sx={{ mt: 5 }}>
        <Box 
          display="flex" 
          alignItems="center" 
          mb={3}
          sx={{
            background: 'linear-gradient(90deg, rgba(156,39,176,0.1) 0%, transparent 100%)',
            p: 2,
            borderRadius: 2,
            borderLeft: 4,
            borderColor: 'secondary.main'
          }}
        >
          <LiveTv sx={{ mr: 1.5, fontSize: 32, color: 'secondary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>Trending TV Shows</Typography>
            <Typography variant="caption" color="text.secondary">Most popular series this week</Typography>
          </Box>
        </Box>
        {tmdbLoading ? (
          <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Box key={i} sx={{ minWidth: 200, flexShrink: 0 }}>
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                <Skeleton variant="text" sx={{ mt: 1 }} />
                <Skeleton variant="text" width="60%" />
              </Box>
            ))}
          </Box>
        ) : trendingTV.length > 0 ? (
          <Box 
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            sx={{ 
            display: 'flex', 
            gap: 3, 
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: 2,
            cursor: 'grab',
            width: '100%',
            maxWidth: '100%',
            '&::-webkit-scrollbar': {
              height: 8
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              '&:hover': {
                background: 'rgba(255,255,255,0.3)'
              }
            },
            overscrollBehavior: 'contain auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            {trendingTV.map((item, index) => (
              <Box key={index} sx={{ width: { xs: 140, sm: 160, md: 200 }, minWidth: { xs: 140, sm: 160, md: 200 }, maxWidth: { xs: 140, sm: 160, md: 200 }, flexShrink: 0 }}>
                <MediaCard item={item} type="tv" index={index} />
              </Box>
            ))}
          </Box>
        ) : (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Configure TMDB_API_KEY in environment variables to see trending TV shows
          </Alert>
        )}
      </Box>

      {/* Upcoming Movies */}
      <Box sx={{ mt: 5 }}>
        <Box 
          display="flex" 
          alignItems="center" 
          mb={3}
          sx={{
            background: 'linear-gradient(90deg, rgba(33,150,243,0.1) 0%, transparent 100%)',
            p: 2,
            borderRadius: 2,
            borderLeft: 4,
            borderColor: 'primary.main'
          }}
        >
          <CalendarToday sx={{ mr: 1.5, fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>Upcoming Movies</Typography>
            <Typography variant="caption" color="text.secondary">Popular movies coming to theaters</Typography>
          </Box>
        </Box>
        {tmdbLoading ? (
          <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', pb: 2 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Box key={i} sx={{ minWidth: 200, flexShrink: 0 }}>
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                <Skeleton variant="text" sx={{ mt: 1 }} />
                <Skeleton variant="text" width="60%" />
              </Box>
            ))}
          </Box>
        ) : upcomingMovies.length > 0 ? (
          <Box 
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            sx={{ 
            display: 'flex', 
            gap: 3, 
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: 2,
            cursor: 'grab',
            width: '100%',
            maxWidth: '100%',
            '&::-webkit-scrollbar': {
              height: 8
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              '&:hover': {
                background: 'rgba(255,255,255,0.3)'
              }
            },
            overscrollBehavior: 'contain auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            {upcomingMovies.map((item, index) => (
              <Box key={index} sx={{ width: { xs: 140, sm: 160, md: 200 }, minWidth: { xs: 140, sm: 160, md: 200 }, maxWidth: { xs: 140, sm: 160, md: 200 }, flexShrink: 0 }}>
                <MediaCard item={item} type="movie" index={index} showReleaseDate />
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>

      {/* Recently Added to Library */}
      {(recentDownloads.movies.length > 0 || recentDownloads.series.length > 0) && (
        <Box sx={{ mt: 5 }}>
          <Box 
            display="flex" 
            alignItems="center" 
            mb={3}
            sx={{
              background: 'linear-gradient(90deg, rgba(76,175,80,0.1) 0%, transparent 100%)',
              p: 2,
              borderRadius: 2,
              borderLeft: 4,
              borderColor: 'success.main'
            }}
          >
            <Download sx={{ mr: 1.5, fontSize: { xs: 24, sm: 32 }, color: 'success.main' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>Your Library</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                Recently added movies and TV shows from Radarr & Sonarr
              </Typography>
            </Box>
          </Box>
          
          {recentDownloads.movies.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Movie sx={{ mr: 1, fontSize: { xs: 20, sm: 24 }, color: 'error.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>Movies from Radarr</Typography>
              </Box>
              <Box 
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                overflowY: 'hidden',
                pb: 2,
                cursor: 'grab',
                width: '100%',
                maxWidth: '100%',
                '&::-webkit-scrollbar': {
                  height: 8
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 4
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  '&:hover': {
                    background: 'rgba(255,255,255,0.3)'
                  }
                },
                overscrollBehavior: 'contain auto',
                WebkitOverflowScrolling: 'touch'
              }}>
                {recentDownloads.movies.slice(0, 10).map((movie, index) => (
                  <Box key={index} sx={{ width: { xs: 140, sm: 160, md: 200 }, minWidth: { xs: 140, sm: 160, md: 200 }, maxWidth: { xs: 140, sm: 160, md: 200 }, flexShrink: 0 }}>
                    <MediaCard item={movie} type="movie" index={index} isDownloaded={true} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          
          {recentDownloads.series.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LiveTv sx={{ mr: 1, fontSize: { xs: 20, sm: 24 }, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>TV Shows from Sonarr</Typography>
              </Box>
              <Box 
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                overflowY: 'hidden',
                pb: 2,
                cursor: 'grab',
                width: '100%',
                maxWidth: '100%',
                '&::-webkit-scrollbar': {
                  height: 8
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 4
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  '&:hover': {
                    background: 'rgba(255,255,255,0.3)'
                  }
                },
                overscrollBehavior: 'contain auto',
                WebkitOverflowScrolling: 'touch'
              }}>
                {recentDownloads.series.slice(0, 10).map((series, index) => (
                  <Box key={index} sx={{ width: { xs: 140, sm: 160, md: 200 }, minWidth: { xs: 140, sm: 160, md: 200 }, maxWidth: { xs: 140, sm: 160, md: 200 }, flexShrink: 0 }}>
                    <MediaCard item={series} type="tv" index={index} isDownloaded={true} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Add to Library Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add to Library
          <IconButton
            onClick={() => setAddDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {itemToAdd && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {itemToAdd.title || itemToAdd.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {itemToAdd.mediaType === 'movie' ? 'Movie' : 'TV Series'}
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Quality Profile</InputLabel>
                  <Select
                    value={selectedProfile}
                    label="Quality Profile"
                    onChange={(e) => setSelectedProfile(e.target.value)}
                  >
                    {qualityProfiles.map((profile) => (
                      <MenuItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Root Folder</InputLabel>
                  <Select
                    value={selectedFolder}
                    label="Root Folder"
                    onChange={(e) => setSelectedFolder(e.target.value)}
                  >
                    {rootFolders.map((folder) => (
                      <MenuItem key={folder.path} value={folder.path}>
                        {folder.path}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Tags (comma-separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. action, comedy, 4k"
                  sx={{ mb: 2 }}
                />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Options
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox
                        checked={monitored}
                        onChange={(e) => setMonitored(e.target.checked)}
                      />
                      <Typography variant="body2">Monitor for availability</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox
                        checked={searchOnAdd}
                        onChange={(e) => setSearchOnAdd(e.target.checked)}
                      />
                      <Typography variant="body2">Search on add</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddToLibraryWithOptions} 
            variant="contained"
            disabled={!selectedProfile || !selectedFolder}
          >
            Add to Library
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Dashboard;
