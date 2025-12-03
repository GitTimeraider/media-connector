import React, { useState, useEffect, useRef } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  
  // Drag-to-scroll functionality with proper cleanup
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, slider: null });

  const handleMouseDown = (e) => {
    const slider = e.currentTarget;
    dragState.current = {
      isDown: true,
      startX: e.pageX - slider.offsetLeft,
      scrollLeft: slider.scrollLeft,
      slider: slider
    };
    slider.style.cursor = 'grabbing';
    slider.style.userSelect = 'none';
  };

  const handleMouseLeave = (e) => {
    if (dragState.current.isDown) {
      dragState.current.isDown = false;
      if (dragState.current.slider) {
        dragState.current.slider.style.cursor = 'grab';
      }
    }
  };

  const handleMouseUp = (e) => {
    dragState.current.isDown = false;
    if (dragState.current.slider) {
      dragState.current.slider.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e) => {
    if (!dragState.current.isDown) return;
    e.preventDefault();
    const slider = dragState.current.slider;
    if (!slider) return;
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - dragState.current.startX) * 2;
    slider.scrollLeft = dragState.current.scrollLeft - walk;
  };

  // Global mouse up to ensure drag stops even if mouse leaves window
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.current.isDown) {
        dragState.current.isDown = false;
        if (dragState.current.slider) {
          dragState.current.slider.style.cursor = 'grab';
        }
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);
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
  const [showAllMatches, setShowAllMatches] = useState(false);
  
  // Ref to track if component is mounted (for cancelling background operations)
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadDashboard();
    loadTMDBContent();
    
    return () => {
      isMountedRef.current = false;
    };
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
      
      // Check if still mounted before updating state
      if (!isMountedRef.current) return;
      
      // Helper to delay between requests
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Fetch cast for each item with rate limiting - process in small batches
      const enrichWithCast = async (items, mediaType, setStateFn) => {
        if (!items || items.length === 0) return;
        if (!isMountedRef.current) return;
        
        const BATCH_SIZE = 2; // Process 2 items at a time to be gentle on TMDB API
        const DELAY_MS = 500; // Wait 500ms between batches
        const enriched = [...items];
        
        // Set initial items immediately (without cast/genres enrichment)
        setStateFn(items);
        
        // Then enrich in background with rate limiting
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          // Check if still mounted before each batch
          if (!isMountedRef.current) return;
          
          const batch = items.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.allSettled(
            batch.map(async (item) => {
              try {
                const details = await api.getTMDBDetails(item.id, mediaType);
                return { ...item, cast: details.credits?.cast || [], genres: details.genres || [] };
              } catch (error) {
                return item;
              }
            })
          );
          
          // Check if still mounted before updating state
          if (!isMountedRef.current) return;
          
          // Update enriched array with results
          batchResults.forEach((result, index) => {
            const originalIndex = i + index;
            if (result.status === 'fulfilled') {
              enriched[originalIndex] = result.value;
            }
          });
          
          // Update state progressively so UI shows enriched data as it loads
          setStateFn([...enriched]);
          
          // Delay before next batch (except for last batch)
          if (i + BATCH_SIZE < items.length) {
            await delay(DELAY_MS);
          }
        }
      };
      
      // Set initial data immediately
      if (trendingMoviesRes.status === 'fulfilled') {
        setTrendingMovies(trendingMoviesRes.value || []);
      }
      if (trendingTVRes.status === 'fulfilled') {
        setTrendingTV(trendingTVRes.value || []);
      }
      if (upcomingRes.status === 'fulfilled') {
        setUpcomingMovies(upcomingRes.value || []);
      }
      
      // Mark loading as done so user sees content immediately
      if (isMountedRef.current) {
        setTmdbLoading(false);
      }
      
      // Enrich with cast data in background (sequentially to avoid rate limits)
      if (trendingMoviesRes.status === 'fulfilled' && isMountedRef.current) {
        await enrichWithCast(trendingMoviesRes.value, 'movie', setTrendingMovies);
      }
      if (trendingTVRes.status === 'fulfilled' && isMountedRef.current) {
        await enrichWithCast(trendingTVRes.value, 'tv', setTrendingTV);
      }
      if (upcomingRes.status === 'fulfilled' && isMountedRef.current) {
        await enrichWithCast(upcomingRes.value, 'movie', setUpcomingMovies);
      }
      
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Error loading TMDB content:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setTmdbLoading(false);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearching(true);
      const results = await api.searchTMDB(searchQuery);
      
      // Show results immediately without enrichment to avoid rate limits
      if (isMountedRef.current) {
        setSearchResults(results || []);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Error searching TMDB:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setSearching(false);
      }
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
        // Lookup all available series in Sonarr and let user choose
        const seriesTitle = itemToAdd.name || itemToAdd.title;
        const itemYear = itemToAdd.first_air_date ? new Date(itemToAdd.first_air_date).getFullYear() : null;
        const originCountry = itemToAdd.origin_country?.[0] || null;
        
        console.log('Looking up series:', { title: seriesTitle, year: itemYear, country: originCountry, tmdbId: itemToAdd.id });
        
        // Get all possible matches from Sonarr
        let allResults = [];
        
        // Try TMDB ID lookup first
        if (itemToAdd.id) {
          try {
            const tmdbResults = await api.lookupSonarrByTmdb(services.sonarr[0].id, itemToAdd.id);
            console.log('TMDB lookup results:', tmdbResults);
            allResults.push(...tmdbResults);
          } catch (error) {
            console.warn('TMDB lookup failed:', error);
          }
        }
        
        // Also search by title to get all versions
        try {
          const titleResults = await api.searchSonarr(services.sonarr[0].id, seriesTitle);
          console.log('Title search results:', titleResults);
          
          // Add title results, avoiding duplicates by tvdbId
          titleResults.forEach(series => {
            if (!allResults.find(s => s.tvdbId === series.tvdbId)) {
              allResults.push(series);
            }
          });
        } catch (error) {
          console.warn('Title search failed:', error);
        }
        
        if (allResults.length === 0) {
          throw new Error('Could not find any matching series in Sonarr');
        }
        
        console.log('All available series options:', allResults);
        
        // Filter to most relevant results (same title or year)
        let relevantResults = allResults.filter(s => 
          s.title?.toLowerCase().includes(seriesTitle.toLowerCase()) || 
          (itemYear && s.year === itemYear)
        );
        
        if (relevantResults.length === 0) {
          relevantResults = allResults;
        }
        
        // Sort by relevance: exact title + year match first
        relevantResults.sort((a, b) => {
          const aExactTitle = a.title?.toLowerCase() === seriesTitle.toLowerCase();
          const bExactTitle = b.title?.toLowerCase() === seriesTitle.toLowerCase();
          const aYearMatch = itemYear && a.year === itemYear;
          const bYearMatch = itemYear && b.year === itemYear;
          
          if (aExactTitle && aYearMatch && !(bExactTitle && bYearMatch)) return -1;
          if (bExactTitle && bYearMatch && !(aExactTitle && aYearMatch)) return 1;
          if (aExactTitle && !bExactTitle) return -1;
          if (bExactTitle && !aExactTitle) return 1;
          if (aYearMatch && !bYearMatch) return -1;
          if (bYearMatch && !aYearMatch) return 1;
          
          return 0;
        });
        
        // Find exact matches (same title and year)
        const exactMatches = relevantResults.filter(s => 
          s.title?.toLowerCase() === seriesTitle.toLowerCase() && 
          (!itemYear || s.year === itemYear)
        );
        
        let matchedSeries = null;
        
        // Only show selection dialog if:
        // 1. User enabled "Show all matches" toggle, OR
        // 2. There are multiple exact matches (same title+year, different networks)
        if (showAllMatches || exactMatches.length > 1) {
          const seriesToShow = showAllMatches ? relevantResults : exactMatches;
          
          const options = seriesToShow.slice(0, 10).map((s, i) => {
            const network = s.network || 'Unknown network';
            const year = s.year || '????';
            const status = s.status ? ` [${s.status}]` : '';
            return `${i + 1}. ${s.title} (${year}) - ${network}${status}`;
          }).join('\n');
          
          const choice = prompt(
            `Found ${seriesToShow.length} series in Sonarr. Select which one to add:\n\n${options}\n\nEnter number (1-${Math.min(10, seriesToShow.length)}) or cancel:`
          );
          
          if (!choice) {
            setAddDialogOpen(false);
            setItemToAdd(null);
            return;
          }
          
          const index = parseInt(choice) - 1;
          if (isNaN(index) || index < 0 || index >= seriesToShow.length) {
            alert('Invalid selection');
            return;
          }
          
          matchedSeries = seriesToShow[index];
        } else {
          // Auto-select the best match
          matchedSeries = relevantResults[0];
          console.log('Auto-selected best match:', matchedSeries);
        }
        console.log('User selected series:', matchedSeries);
        
        const result = await api.addSonarrSeries(services.sonarr[0].id, {
          tvdbId: matchedSeries.tvdbId,
          title: matchedSeries.title,
          qualityProfileId: parseInt(selectedProfile),
          rootFolderPath: selectedFolder,
          monitored,
          tags: tagsArray,
          seasonFolder: true,
          addOptions: { 
            searchForMissingEpisodes: searchOnAdd,
            monitor: 'all'
          }
        });
        
        console.log('Sonarr add result:', result);
        alert(`Added "${matchedSeries.title}" to Sonarr!`);
      }
      
      setAddDialogOpen(false);
      setItemToAdd(null);
      setTags('');
    } catch (error) {
      console.error('Error adding to library:', error);
      console.error('Error details:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      alert(`Failed to add: ${errorMsg}`);
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
    const clickStartPos = useRef(null);
    
    const handleCardMouseDown = (e) => {
      clickStartPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };
    
    const handleCardClick = (e) => {
      // Only open dialog if this was a click (not a drag)
      if (clickStartPos.current) {
        const deltaX = Math.abs(e.clientX - clickStartPos.current.x);
        const deltaY = Math.abs(e.clientY - clickStartPos.current.y);
        const deltaTime = Date.now() - clickStartPos.current.time;
        
        // If moved less than 10px and took less than 300ms, it's a click
        if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
          handleOpenDialog(item);
        }
      }
      clickStartPos.current = null;
    };
    
    const imageUrl = item.poster_path || item.posterUrl
      ? `https://image.tmdb.org/t/p/w500${item.poster_path || item.posterUrl}`
      : item.images?.find(img => img.coverType === 'poster')?.remoteUrl || 'https://via.placeholder.com/300x450?text=No+Image';
    
    const title = item.title || item.name || 'Unknown';
    const year = item.release_date ? new Date(item.release_date).getFullYear() 
      : item.first_air_date ? new Date(item.first_air_date).getFullYear()
      : item.year || '';
    
    const releaseDate = item.release_date ? new Date(item.release_date) : null;
    const formattedDate = releaseDate ? releaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    
    return (
      <Card 
        onMouseDown={handleCardMouseDown}
        onClick={handleCardClick}
        sx={{ 
          width: '100%',
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3
        }}
      >
          <Box sx={{ 
            position: 'relative', 
            overflow: 'hidden', 
            height: { xs: 200, sm: 225, md: 250 }, 
            width: '100%'
          }}>
              <CardMedia
                component="img"
                image={imageUrl}
                alt={title}
                loading="lazy"
                draggable="false"
                onDragStart={(e) => e.preventDefault()}
                sx={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
              />
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
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 2px 8px rgba(102,126,234,0.3)'
                    }} 
                  />
                )}
                {item.vote_average && (
                  <Chip 
                    icon={<Star sx={{ fontSize: 16, color: '#FFD700 !important' }} />}
                    label={item.vote_average.toFixed(1)} 
                    size="small" 
                    sx={{ 
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      boxShadow: '0 2px 8px rgba(245,87,108,0.3)'
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
                {item.origin_country && Array.isArray(item.origin_country) && item.origin_country.length > 0 && (
                  <Chip 
                    label={item.origin_country[0]} 
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
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
                {!item.genre_ids && item.genres && Array.isArray(item.genres) && item.genres.length > 0 && typeof item.genres[0] === 'object' && (
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
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      boxShadow: '0 2px 8px rgba(79,172,254,0.3)'
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
        </Card>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 4, overflowX: 'hidden', width: '100%' }}>
      {/* Search Bar */}
      <Paper 
        elevation={0}
        sx={{ 
          mb: 4, 
          p: { xs: 1.5, sm: 2 }, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          gap: { xs: 1.5, sm: 0 },
          background: 'linear-gradient(135deg, rgba(156,39,176,0.15) 0%, rgba(33,150,243,0.1) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
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
              cursor: 'grab'
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
                variant="outlined"
                startIcon={<PlayArrow />}
                onClick={async () => {
                  try {
                    const mediaType = selectedItem.media_type || (selectedItem.title ? 'movie' : 'tv');
                    const tmdbId = selectedItem.tmdbId || selectedItem.id;
                    const videos = await api.getTMDBVideos(tmdbId, mediaType);
                    const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
                    if (trailer) {
                      window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
                    } else {
                      alert('No trailer available');
                    }
                  } catch (error) {
                    console.error('Error loading trailer:', error);
                    alert('Failed to load trailer');
                  }
                }}
              >
                View Trailer
              </Button>
              {!Boolean(
                selectedItem.hasFile || 
                (selectedItem.id && (selectedItem.monitored !== undefined || selectedItem.tvdbId !== undefined || selectedItem.imdbId !== undefined))
              ) && (
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
              )}
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
            background: 'linear-gradient(135deg, rgba(255,87,34,0.2) 0%, rgba(255,193,7,0.1) 100%)',
            backdropFilter: 'blur(10px)',
            p: 2.5,
            borderRadius: 3,
            borderLeft: '6px solid',
            borderImage: 'linear-gradient(to bottom, #ff5722, #ffc107) 1',
            boxShadow: '0 4px 20px rgba(255,87,34,0.2)'
          }}
        >
          <Movie sx={{ mr: 1.5, fontSize: 32, color: 'warning.main', filter: 'drop-shadow(0 2px 4px rgba(255,87,34,0.5))' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>Trending Movies</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>Most popular movies this week</Typography>
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
            cursor: 'grab'
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
            background: 'linear-gradient(135deg, rgba(156,39,176,0.2) 0%, rgba(103,58,183,0.1) 100%)',
            backdropFilter: 'blur(10px)',
            p: 2.5,
            borderRadius: 3,
            borderLeft: '6px solid',
            borderImage: 'linear-gradient(to bottom, #9c27b0, #673ab7) 1',
            boxShadow: '0 4px 20px rgba(156,39,176,0.2)'
          }}
        >
          <LiveTv sx={{ mr: 1.5, fontSize: 32, color: 'secondary.main', filter: 'drop-shadow(0 2px 4px rgba(156,39,176,0.5))' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>Trending TV Shows</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>Most popular series this week</Typography>
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
            cursor: 'grab'
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
            background: 'linear-gradient(135deg, rgba(33,150,243,0.2) 0%, rgba(3,169,244,0.1) 100%)',
            backdropFilter: 'blur(10px)',
            p: 2.5,
            borderRadius: 3,
            borderLeft: '6px solid',
            borderImage: 'linear-gradient(to bottom, #2196f3, #03a9f4) 1',
            boxShadow: '0 4px 20px rgba(33,150,243,0.2)'
          }}
        >
          <CalendarToday sx={{ mr: 1.5, fontSize: 32, color: 'primary.main', filter: 'drop-shadow(0 2px 4px rgba(33,150,243,0.5))' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>Upcoming Movies</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>Popular movies coming to theaters</Typography>
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
            cursor: 'grab'
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
              background: 'linear-gradient(135deg, rgba(76,175,80,0.2) 0%, rgba(139,195,74,0.1) 100%)',
              backdropFilter: 'blur(10px)',
              p: 2.5,
              borderRadius: 3,
              borderLeft: '6px solid',
              borderImage: 'linear-gradient(to bottom, #4caf50, #8bc34a) 1',
              boxShadow: '0 4px 20px rgba(76,175,80,0.2)'
            }}
          >
            <Download sx={{ mr: 1.5, fontSize: { xs: 24, sm: 32 }, color: 'success.main', filter: 'drop-shadow(0 2px 4px rgba(76,175,80,0.5))' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' }, letterSpacing: 0.5 }}>Your Library</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.85rem' } }}>
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
                cursor: 'grab'
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
                cursor: 'grab'
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
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox
                        checked={showAllMatches}
                        onChange={(e) => setShowAllMatches(e.target.checked)}
                      />
                      <Typography variant="body2">Show all available versions</Typography>
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
