import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput
} from '@mui/material';
import { Search, Add, Delete, Close, ViewModule, ViewList, FilterList, Sort, CheckCircle, RadioButtonUnchecked, CloudDownload, CloudOff } from '@mui/icons-material';
import api from '../services/api';

function Radarr() {
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingMovies, setSearchingMovies] = useState(false);
  const [movieSearchQuery, setMovieSearchQuery] = useState('');
  const [qualityProfiles, setQualityProfiles] = useState([]);
  const [rootFolders, setRootFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedQualityProfile, setSelectedQualityProfile] = useState('');
  const [selectedRootFolder, setSelectedRootFolder] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [movieToView, setMovieToView] = useState(null);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editQualityProfile, setEditQualityProfile] = useState('');
  const [editMonitored, setEditMonitored] = useState(false);
  
  // View and filter states
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'
  const [monitoredFilter, setMonitoredFilter] = useState('all'); // 'all', 'monitored', 'unmonitored'
  const [downloadedFilter, setDownloadedFilter] = useState('all'); // 'all', 'downloaded', 'not-downloaded'
  const [sortBy, setSortBy] = useState('alphabetical'); // 'alphabetical', 'newest', 'oldest'

  useEffect(() => {
    loadInstances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      loadMovies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstance]);

  const loadInstances = async () => {
    try {
      const data = await api.getServiceInstances('radarr');
      setInstances(data);
      if (data.length > 0) {
        setSelectedInstance(data[0].id);
        await loadOptions(data[0].id);
      }
    } catch (error) {
      console.error('Error loading instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async (instanceId) => {
    try {
      const [profiles, folders, tagsList] = await Promise.all([
        api.getRadarrQualityProfiles(instanceId),
        api.getRadarrRootFolders(instanceId),
        api.getRadarrTags(instanceId)
      ]);
      setQualityProfiles(profiles);
      setRootFolders(folders);
      setTags(tagsList);
      if (profiles.length > 0) setSelectedQualityProfile(profiles[0].id);
      if (folders.length > 0) setSelectedRootFolder(folders[0].path);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const loadMovies = async () => {
    try {
      setLoading(true);
      const data = await api.getRadarrMovies(selectedInstance);
      setMovies(data);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (movie) => {
    setMovieToView(movie);
    setEditQualityProfile(movie.qualityProfileId || '');
    setEditMonitored(movie.monitored || false);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setEditMode(false);
    setTimeout(() => {
      setMovieToView(null);
      setDeleteFiles(false);
    }, 200);
  };

  const handleSaveChanges = async () => {
    if (!movieToView) return;
    
    try {
      await api.updateRadarrMovie(selectedInstance, movieToView.id, {
        qualityProfileId: parseInt(editQualityProfile),
        monitored: editMonitored
      });
      setEditMode(false);
      loadMovies();
      // Update the movieToView with new values
      setMovieToView({
        ...movieToView,
        qualityProfileId: parseInt(editQualityProfile),
        monitored: editMonitored
      });
    } catch (error) {
      console.error('Error updating movie:', error);
      alert(`Failed to update movie: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteMovie = async () => {
    if (!movieToView) return;
    
    if (!window.confirm(`Are you sure you want to delete "${movieToView.title}"${deleteFiles ? ' and its files' : ''}?`)) {
      return;
    }
    
    try {
      await api.deleteRadarrMovie(selectedInstance, movieToView.id, deleteFiles);
      handleCloseDetail();
      loadMovies();
    } catch (error) {
      console.error('Error deleting movie:', error);
      alert(`Failed to delete movie: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSearchMovies = async (e) => {
    e.preventDefault();
    if (!movieSearchQuery.trim()) return;
    
    setSearchingMovies(true);
    try {
      const results = await api.searchRadarr(selectedInstance, movieSearchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching movies:', error);
    } finally {
      setSearchingMovies(false);
    }
  };

  const handleSelectMovie = (movie) => {
    setSelectedMovie(movie);
    setSelectedTags([]);
  };

  const handleAddMovie = async () => {
    if (!selectedMovie) return;
    
    try {
      await api.addRadarrMovie(selectedInstance, {
        title: selectedMovie.title,
        tmdbId: selectedMovie.tmdbId,
        qualityProfileId: selectedQualityProfile,
        rootFolderPath: selectedRootFolder,
        tags: selectedTags,
        monitored: true,
        addOptions: {
          searchForMovie: true
        }
      });
      alert(`${selectedMovie.title} added successfully!`);
      setAddDialogOpen(false);
      setSelectedMovie(null);
      setSearchResults([]);
      setMovieSearchQuery('');
      loadMovies();
    } catch (error) {
      console.error('Error adding movie:', error);
      alert('Failed to add movie');
    }
  };

  const filteredMovies = movies
    .filter(movie => movie.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(movie => {
      if (monitoredFilter === 'monitored') return movie.monitored === true;
      if (monitoredFilter === 'unmonitored') return movie.monitored === false;
      return true;
    })
    .filter(movie => {
      if (downloadedFilter === 'downloaded') return movie.hasFile === true;
      if (downloadedFilter === 'not-downloaded') return movie.hasFile === false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'newest') {
        return (b.year || 0) - (a.year || 0);
      } else if (sortBy === 'oldest') {
        return (a.year || 0) - (b.year || 0);
      }
      return 0;
    });

  if (loading && instances.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (instances.length === 0) {
    return (
      <Container>
        <Alert severity="info">
          No Radarr instances configured. Go to Settings to add one.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ overflowX: 'hidden', width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" sx={{ mt: 1 }}>
          Movies
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="flex-start">
          {/* View Mode Toggle */}
          <Box sx={{ display: 'flex', gap: 0.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Button
              size="small"
              variant={viewMode === 'cards' ? 'contained' : 'text'}
              onClick={() => setViewMode('cards')}
              startIcon={<ViewModule />}
            >
              Cards
            </Button>
            <Button
              size="small"
              variant={viewMode === 'list' ? 'contained' : 'text'}
              onClick={() => setViewMode('list')}
              startIcon={<ViewList />}
            >
              List
            </Button>
          </Box>
          
          {/* Monitored Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Monitor Status</InputLabel>
            <Select
              value={monitoredFilter}
              label="Monitor Status"
              onChange={(e) => setMonitoredFilter(e.target.value)}
              startAdornment={<FilterList sx={{ mr: 1, color: 'action.active' }} />}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="monitored">Monitored</MenuItem>
              <MenuItem value="unmonitored">Unmonitored</MenuItem>
            </Select>
          </FormControl>
          
          {/* Downloaded Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Download Status</InputLabel>
            <Select
              value={downloadedFilter}
              label="Download Status"
              onChange={(e) => setDownloadedFilter(e.target.value)}
              startAdornment={<FilterList sx={{ mr: 1, color: 'action.active' }} />}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="downloaded">Downloaded</MenuItem>
              <MenuItem value="not-downloaded">Not Downloaded</MenuItem>
            </Select>
          </FormControl>
          
          {/* Sort By */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
              startAdornment={<Sort sx={{ mr: 1, color: 'action.active' }} />}
            >
              <MenuItem value="alphabetical">Alphabetical</MenuItem>
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
            </Select>
          </FormControl>
          
          <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialogOpen(true)}>
            Add Movie
          </Button>
        </Box>
      </Box>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Movie</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSearchMovies} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              placeholder="Search for a movie..."
              value={movieSearchQuery}
              onChange={(e) => setMovieSearchQuery(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button type="submit" disabled={searchingMovies}>
                      {searchingMovies ? <CircularProgress size={20} /> : <Search />}
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          {!selectedMovie ? (
            <Box sx={{ mt: 3 }}>
              {searchResults.map((movie) => (
                <Card key={movie.tmdbId} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => handleSelectMovie(movie)}>
                  <CardContent>
                    <Box display="flex" gap={2}>
                      {movie.images?.find(img => img.coverType === 'poster') && (
                        <Box
                          component="img"
                          src={movie.images.find(img => img.coverType === 'poster').remoteUrl}
                          alt={movie.title}
                          sx={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 1 }}
                        />
                      )}
                      <Box flexGrow={1}>
                        <Typography variant="h6">{movie.title}</Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {movie.year} {movie.runtime ? `• ${movie.runtime} min` : ''} {movie.genres?.join(', ')}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {movie.overview || 'No description available'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ mt: 3 }}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6">{selectedMovie.title} ({selectedMovie.year})</Typography>
                </CardContent>
              </Card>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Quality Profile</InputLabel>
                    <Select
                      value={selectedQualityProfile}
                      label="Quality Profile"
                      onChange={(e) => setSelectedQualityProfile(e.target.value)}
                    >
                      {qualityProfiles.map((profile) => (
                        <MenuItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Root Folder</InputLabel>
                    <Select
                      value={selectedRootFolder}
                      label="Root Folder"
                      onChange={(e) => setSelectedRootFolder(e.target.value)}
                    >
                      {rootFolders.map((folder) => (
                        <MenuItem key={folder.path} value={folder.path}>
                          {folder.path} ({folder.freeSpace ? `${Math.round(folder.freeSpace / 1024 / 1024 / 1024)} GB free` : 'Unknown space'})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Tags</InputLabel>
                    <Select
                      multiple
                      value={selectedTags}
                      onChange={(e) => setSelectedTags(e.target.value)}
                      input={<OutlinedInput label="Tags" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={tags.find(t => t.id === value)?.label || value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {tags.map((tag) => (
                        <MenuItem key={tag.id} value={tag.id}>
                          {tag.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Box display="flex" gap={2} mt={3}>
                <Button variant="outlined" onClick={() => setSelectedMovie(null)}>
                  Back
                </Button>
                <Button variant="contained" onClick={handleAddMovie} fullWidth>
                  Add Movie
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddDialogOpen(false); setSelectedMovie(null); setSearchResults([]); setMovieSearchQuery(''); }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="Search movies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'cards' ? (
        <Grid container spacing={3}>
          {filteredMovies.map((movie) => (
            <Grid item xs={6} sm={6} md={4} lg={3} key={movie.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '-10px',
                      left: '-10px',
                      right: '-10px',
                      bottom: '-10px',
                      pointerEvents: 'auto'
                    }
                  }
                }}
                onClick={() => handleOpenDetail(movie)}
              >
                {movie.images?.find(img => img.coverType === 'poster') && (
                  <CardMedia
                    component="img"
                    image={movie.images.find(img => img.coverType === 'poster').remoteUrl}
                    alt={movie.title}
                    sx={{ objectFit: 'cover', objectPosition: 'top', height: { xs: 125, sm: 300, md: 350 }, width: '100%' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {movie.title}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip label={movie.year} size="small" />
                    <Chip 
                      icon={movie.hasFile ? <CloudDownload /> : <CloudOff />}
                      label={movie.hasFile ? "Downloaded" : "Not Downloaded"} 
                      size="small" 
                      color={movie.hasFile ? "success" : "default"}
                      variant={movie.hasFile ? "filled" : "outlined"}
                    />
                    <Chip 
                      icon={movie.monitored ? <CheckCircle /> : <RadioButtonUnchecked />}
                      label={movie.monitored ? "Monitored" : "Unmonitored"} 
                      size="small" 
                      color={movie.monitored ? "primary" : "default"}
                      variant={movie.monitored ? "filled" : "outlined"}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {movie.overview?.substring(0, 150)}...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        /* List View */
        <Box>
          {filteredMovies.map((movie) => (
            <Card 
              key={movie.id}
              sx={{ 
                mb: 1,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: 4
                }
              }}
              onClick={() => handleOpenDetail(movie)}
            >
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Box display="flex" gap={2} alignItems="center">
                  {movie.images?.find(img => img.coverType === 'poster') && (
                    <Box
                      component="img"
                      src={movie.images.find(img => img.coverType === 'poster').remoteUrl}
                      alt={movie.title}
                      sx={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 1 }}
                    />
                  )}
                  <Box flexGrow={1}>
                    <Typography variant="h6" gutterBottom>
                      {movie.title}
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                      <Chip label={movie.year} size="small" />
                      <Chip 
                        icon={movie.hasFile ? <CloudDownload /> : <CloudOff />}
                        label={movie.hasFile ? "Downloaded" : "Not Downloaded"} 
                        size="small" 
                        color={movie.hasFile ? "success" : "default"}
                        variant={movie.hasFile ? "filled" : "outlined"}
                      />
                      <Chip 
                        icon={movie.monitored ? <CheckCircle /> : <RadioButtonUnchecked />}
                        label={movie.monitored ? "Monitored" : "Unmonitored"} 
                        size="small" 
                        color={movie.monitored ? "primary" : "default"}
                        variant={movie.monitored ? "filled" : "outlined"}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {movie.overview?.substring(0, 200)}...
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Movie Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        {movieToView && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">{movieToView.title}</Typography>
                <Button
                  onClick={handleCloseDetail}
                  size="small"
                  sx={{ minWidth: 'auto', p: 1 }}
                >
                  <Close />
                </Button>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  {movieToView.images?.find(img => img.coverType === 'poster') && (
                    <CardMedia
                      component="img"
                      image={movieToView.images.find(img => img.coverType === 'poster').remoteUrl}
                      alt={movieToView.title}
                      sx={{ borderRadius: 2, width: '100%' }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                    <Chip label={movieToView.year} />
                    {movieToView.hasFile && (
                      <Chip label="Downloaded" color="success" />
                    )}
                  </Box>
                  
                  {editMode ? (
                    <Box sx={{ mb: 2 }}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Quality Profile</InputLabel>
                        <Select
                          value={editQualityProfile}
                          label="Quality Profile"
                          onChange={(e) => setEditQualityProfile(e.target.value)}
                        >
                          {qualityProfiles.map((profile) => (
                            <MenuItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Box display="flex" alignItems="center">
                        <input
                          type="checkbox"
                          checked={editMonitored}
                          onChange={(e) => setEditMonitored(e.target.checked)}
                          style={{ marginRight: 8 }}
                        />
                        <Typography variant="body2">Monitor this movie</Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                      {movieToView.monitored && (
                        <Chip label="Monitored" color="primary" />
                      )}
                      {movieToView.qualityProfileId && (
                        <Chip label={`Quality: ${qualityProfiles.find(p => p.id === movieToView.qualityProfileId)?.name || 'Unknown'}`} />
                      )}
                    </Box>
                  )}
                  
                  <Typography variant="h6" gutterBottom>Overview</Typography>
                  <Typography variant="body1" paragraph>
                    {movieToView.overview || 'No overview available.'}
                  </Typography>
                  
                  {movieToView.movieFile && (
                    <>
                      <Typography variant="h6" gutterBottom>Downloaded File</Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {movieToView.movieFile.relativePath || movieToView.movieFile.path}
                      </Typography>
                    </>
                  )}
                  
                  {movieToView.path && (
                    <>
                      <Typography variant="h6" gutterBottom>Folder Path</Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {movieToView.path}
                      </Typography>
                    </>
                  )}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                    <FormControl component="fieldset">
                      <Box display="flex" alignItems="center">
                        <input
                          type="checkbox"
                          checked={deleteFiles}
                          onChange={(e) => setDeleteFiles(e.target.checked)}
                          style={{ marginRight: 8 }}
                        />
                        <Typography variant="body2">
                          Delete movie files from disk
                        </Typography>
                      </Box>
                    </FormControl>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>Close</Button>
              {editMode ? (
                <>
                  <Button onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button 
                    onClick={handleSaveChanges}
                    color="primary"
                    variant="contained"
                  >
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setEditMode(true)} variant="outlined">
                    Edit
                  </Button>
                  <Button 
                    onClick={handleDeleteMovie}
                    color="error"
                    variant="contained"
                    startIcon={<Delete />}
                  >
                    Delete from Radarr
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}

export default Radarr;
