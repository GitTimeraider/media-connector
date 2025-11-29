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
  Fade
} from '@mui/material';
import {
  LiveTv,
  Movie,
  MusicNote,
  Book,
  Warning,
  TrendingUp,
  Download,
  CalendarToday,
  Star,
  Info,
  PlayArrow,
  Add,
  Close
} from '@mui/icons-material';
import api from '../services/api';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState({});
  const [stats, setStats] = useState({
    sonarr: { total: 0, monitored: 0 },
    radarr: { total: 0, monitored: 0 },
    lidarr: { total: 0, monitored: 0 },
    readarr: { total: 0, monitored: 0 },
    downloads: { active: 0, queued: 0 }
  });
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [recentDownloads, setRecentDownloads] = useState({ movies: [], series: [] });
  const [tmdbLoading, setTmdbLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

      // Load stats for each service type
      const statsPromises = [];
      
      if (servicesData.sonarr?.length > 0) {
        statsPromises.push(
          api.getSonarrSeries(servicesData.sonarr[0].id)
            .then(series => ({
              type: 'sonarr',
              total: series.length,
              monitored: series.filter(s => s.monitored).length
            }))
            .catch(() => ({ type: 'sonarr', total: 0, monitored: 0 }))
        );
        
        // Load recent downloads
        api.getRecentSonarrDownloads(servicesData.sonarr[0].id)
          .then(series => setRecentDownloads(prev => ({ ...prev, series })))
          .catch(() => {});
      }

      if (servicesData.radarr?.length > 0) {
        statsPromises.push(
          api.getRadarrMovies(servicesData.radarr[0].id)
            .then(movies => ({
              type: 'radarr',
              total: movies.length,
              monitored: movies.filter(m => m.monitored).length
            }))
            .catch(() => ({ type: 'radarr', total: 0, monitored: 0 }))
        );
        
        // Load recent downloads
        api.getRecentRadarrDownloads(servicesData.radarr[0].id)
          .then(movies => setRecentDownloads(prev => ({ ...prev, movies })))
          .catch(() => {});
      }

      const results = await Promise.all(statsPromises);
      const newStats = { ...stats };
      results.forEach(result => {
        if (result.type) {
          newStats[result.type] = { total: result.total, monitored: result.monitored };
        }
      });
      setStats(newStats);
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
      
      if (trendingMoviesRes.status === 'fulfilled') setTrendingMovies(trendingMoviesRes.value || []);
      if (trendingTVRes.status === 'fulfilled') setTrendingTV(trendingTVRes.value || []);
      if (upcomingRes.status === 'fulfilled') setUpcomingMovies(upcomingRes.value || []);
    } catch (error) {
      console.error('Error loading TMDB content:', error);
    } finally {
      setTmdbLoading(false);
    }
  };

  const handleOpenDialog = (item) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTimeout(() => setSelectedItem(null), 200);
  };

  const StatCard = ({ title, icon, value, subtitle, color }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        color: 'white',
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-8px) scale(1.02)',
          boxShadow: 6
        }
      }}
    >
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 2,
                p: 1,
                mr: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {icon}
            </Box>
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          </Box>
          <Typography variant="h3" component="div" mb={1} sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {subtitle}
          </Typography>
        </CardContent>
      </Card>
  );

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

  const MediaCard = ({ item, type, index, showReleaseDate }) => {
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
    
    return (
      <Card 
        sx={{ 
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
            <Box sx={{ position: 'relative', overflow: 'hidden' }}>
              <CardMedia
                component="img"
                height="300"
                image={imageUrl}
                alt={title}
                sx={{ 
                  objectFit: 'cover',
                  transition: 'transform 0.3s ease',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)'
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
                    <Tooltip title="Add to Library">
                      <IconButton 
                        size="small" 
                        sx={{ 
                          bgcolor: 'secondary.main', 
                          color: 'white',
                          '&:hover': { bgcolor: 'secondary.dark' }
                        }}
                      >
                        <Add />
                      </IconButton>
                    </Tooltip>
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
            </CardContent>
          </CardActionArea>
        </Card>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 4 }}>
      <Box sx={{ mb: 4, mt: 2 }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Your media hub at a glance
        </Typography>
      </Box>

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
                  {selectedItem.genres && (
                    <>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                        Genres
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {selectedItem.genres.map((genre, index) => (
                          <Chip key={index} label={genre} variant="outlined" size="small" />
                        ))}
                      </Box>
                    </>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button variant="contained" startIcon={<Add />}>
                Add to Library
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="TV Shows"
            icon={<LiveTv sx={{ color: 'white' }} />}
            value={stats.sonarr.total}
            subtitle={`${stats.sonarr.monitored} monitored`}
            color="#1976d2"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Movies"
            icon={<Movie sx={{ color: 'white' }} />}
            value={stats.radarr.total}
            subtitle={`${stats.radarr.monitored} monitored`}
            color="#dc004e"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Music"
            icon={<MusicNote sx={{ color: 'white' }} />}
            value={stats.lidarr.total}
            subtitle={`${stats.lidarr.monitored} monitored`}
            color="#f57c00"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Books"
            icon={<Book sx={{ color: 'white' }} />}
            value={stats.readarr.total}
            subtitle={`${stats.readarr.monitored} monitored`}
            color="#388e3c"
          />
        </Grid>
      </Grid>

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
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            overflowX: 'auto', 
            pb: 2,
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
            }
          }}>
            {trendingMovies.map((item, index) => (
              <Box key={index} sx={{ minWidth: 200, flexShrink: 0 }}>
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
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            overflowX: 'auto', 
            pb: 2,
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
            }
          }}>
            {trendingTV.map((item, index) => (
              <Box key={index} sx={{ minWidth: 200, flexShrink: 0 }}>
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
            <Typography variant="caption" color="text.secondary">Coming soon to theaters</Typography>
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
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            overflowX: 'auto', 
            pb: 2,
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
            }
          }}>
            {upcomingMovies.map((item, index) => (
              <Box key={index} sx={{ minWidth: 200, flexShrink: 0 }}>
                <MediaCard item={item} type="movie" index={index} showReleaseDate />
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>

      {/* Recent Downloads */}
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
            <Download sx={{ mr: 1.5, fontSize: 32, color: 'success.main' }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>Recently Downloaded</Typography>
              <Typography variant="caption" color="text.secondary">Latest additions to your library</Typography>
            </Box>
          </Box>
          
          {recentDownloads.movies.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 600 }}>Movies</Typography>
              <Grid container spacing={3}>
                {recentDownloads.movies.slice(0, 5).map((movie, index) => (
                  <Grid item xs={6} sm={4} md={2.4} key={index}>
                    <MediaCard item={movie} type="movie" index={index} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
          
          {recentDownloads.series.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>TV Shows</Typography>
              <Grid container spacing={3}>
                {recentDownloads.series.slice(0, 5).map((series, index) => (
                  <Grid item xs={6} sm={4} md={2.4} key={index}>
                    <MediaCard item={series} type="tv" index={index} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>
      )}
    </Container>
  );
}

export default Dashboard;
