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

// Helper function to format bytes to human-readable size
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

function Sonarr() {
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [series, setSeries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [seriesSearchQuery, setSeriesSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [qualityProfiles, setQualityProfiles] = useState([]);
  const [rootFolders, setRootFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedQualityProfile, setSelectedQualityProfile] = useState('');
  const [selectedRootFolder, setSelectedRootFolder] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [seriesToView, setSeriesToView] = useState(null);
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
    loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await api.getPreferences();
      if (prefs.defaultViewMode) {
        setViewMode(prefs.defaultViewMode);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  useEffect(() => {
    if (selectedInstance) {
      loadSeries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstance]);

  const loadInstances = async () => {
    try {
      const data = await api.getServiceInstances('sonarr');
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
        api.getSonarrQualityProfiles(instanceId),
        api.getSonarrRootFolders(instanceId),
        api.getSonarrTags(instanceId)
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

  const loadSeries = async () => {
    try {
      setLoading(true);
      const data = await api.getSonarrSeries(selectedInstance);
      setSeries(data);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (series) => {
    setSeriesToView(series);
    setEditQualityProfile(series.qualityProfileId || '');
    setEditMonitored(series.monitored || false);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setEditMode(false);
    setTimeout(() => {
      setSeriesToView(null);
      setDeleteFiles(false);
    }, 200);
  };

  const handleSaveChanges = async () => {
    if (!seriesToView) return;
    
    try {
      await api.updateSonarrSeries(selectedInstance, seriesToView.id, {
        qualityProfileId: parseInt(editQualityProfile),
        monitored: editMonitored
      });
      setEditMode(false);
      loadSeries();
      setSeriesToView({
        ...seriesToView,
        qualityProfileId: parseInt(editQualityProfile),
        monitored: editMonitored
      });
    } catch (error) {
      console.error('Error updating series:', error);
      alert(`Failed to update series: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteSeries = async () => {
    if (!seriesToView) return;
    
    if (!window.confirm(`Are you sure you want to delete "${seriesToView.title}"${deleteFiles ? ' and its files' : ''}?`)) {
      return;
    }
    
    try {
      await api.deleteSonarrSeries(selectedInstance, seriesToView.id, deleteFiles);
      handleCloseDetail();
      loadSeries();
    } catch (error) {
      console.error('Error deleting series:', error);
      alert(`Failed to delete series: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSeriesSearch = async (e) => {
    if (e) e.preventDefault();
    if (!seriesSearchQuery) return;
    try {
      const results = await api.searchSonarr(selectedInstance, seriesSearchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleSelectSeries = (show) => {
    setSelectedSeries(show);
    setSelectedTags([]);
  };

  const filteredSeries = series
    .filter(show => show.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(show => {
      if (monitoredFilter === 'monitored') return show.monitored === true;
      if (monitoredFilter === 'unmonitored') return show.monitored === false;
      return true;
    })
    .filter(show => {
      if (downloadedFilter === 'downloaded') return show.statistics?.percentOfEpisodes === 100 || show.statistics?.episodeFileCount > 0;
      if (downloadedFilter === 'not-downloaded') return !show.statistics?.episodeFileCount || show.statistics?.episodeFileCount === 0;
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

  const handleAddSeries = async () => {
    if (!selectedSeries) return;
    
    try {
      await api.addSonarrSeries(selectedInstance, {
        title: selectedSeries.title,
        tvdbId: selectedSeries.tvdbId,
        qualityProfileId: selectedQualityProfile,
        rootFolderPath: selectedRootFolder,
        tags: selectedTags,
        monitored: true,
        seasonFolder: true,
        addOptions: {
          searchForMissingEpisodes: true
        }
      });
      alert(`${selectedSeries.title} added successfully!`);
      setSearchOpen(false);
      setSelectedSeries(null);
      setSearchResults([]);
      setSearchQuery('');
      loadSeries();
    } catch (error) {
      console.error('Error adding series:', error);
      alert('Failed to add series');
    }
  };

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
          No Sonarr instances configured. Go to Settings to add one.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ overflowX: 'hidden', width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4">
          TV Shows
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
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
          <FormControl size="small" sx={{ minWidth: 140, width: 140 }}>
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
          <FormControl size="small" sx={{ minWidth: 140, width: 150 }}>
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
          <FormControl size="small" sx={{ minWidth: 130, width: 130 }}>
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
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setSearchOpen(true)}
          >
            Add Series
          </Button>
        </Box>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="Search series..."
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
          {filteredSeries.map((show) => (
            <Grid item xs={6} sm={6} md={4} lg={3} key={show.id}>
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
                onClick={() => handleOpenDetail(show)}
              >
                {show.images?.find(img => img.coverType === 'poster') && (
                  <CardMedia
                    component="img"
                    image={show.images.find(img => img.coverType === 'poster').remoteUrl}
                    alt={show.title}
                    sx={{ objectFit: 'cover', objectPosition: 'top', height: { xs: 125, sm: 300, md: 350 }, width: '100%' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {show.title}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip label={show.year} size="small" />
                    <Chip 
                      icon={(show.statistics?.episodeFileCount > 0) ? <CloudDownload /> : <CloudOff />}
                      label={(show.statistics?.episodeFileCount > 0) ? "Has Episodes" : "No Episodes"} 
                      size="small" 
                      color={(show.statistics?.episodeFileCount > 0) ? "success" : "default"}
                      variant={(show.statistics?.episodeFileCount > 0) ? "filled" : "outlined"}
                    />
                    <Chip 
                      icon={show.monitored ? <CheckCircle /> : <RadioButtonUnchecked />}
                      label={show.monitored ? "Monitored" : "Unmonitored"} 
                      size="small" 
                      color={show.monitored ? "primary" : "default"}
                      variant={show.monitored ? "filled" : "outlined"}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {show.overview?.substring(0, 150)}...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        /* List View */
        <Box>
          {filteredSeries.map((show) => (
            <Card 
              key={show.id}
              sx={{ 
                mb: 1,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: 4
                }
              }}
              onClick={() => handleOpenDetail(show)}
            >
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Box display="flex" gap={2} alignItems="center">
                  {show.images?.find(img => img.coverType === 'poster') && (
                    <Box
                      component="img"
                      src={show.images.find(img => img.coverType === 'poster').remoteUrl}
                      alt={show.title}
                      sx={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 1 }}
                    />
                  )}
                  <Box flexGrow={1}>
                    <Typography variant="h6" gutterBottom>
                      {show.title}
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                      <Chip label={show.year} size="small" />
                      <Chip 
                        icon={(show.statistics?.episodeFileCount > 0) ? <CloudDownload /> : <CloudOff />}
                        label={(show.statistics?.episodeFileCount > 0) ? "Has Episodes" : "No Episodes"} 
                        size="small" 
                        color={(show.statistics?.episodeFileCount > 0) ? "success" : "default"}
                        variant={(show.statistics?.episodeFileCount > 0) ? "filled" : "outlined"}
                      />
                      <Chip 
                        icon={show.monitored ? <CheckCircle /> : <RadioButtonUnchecked />}
                        label={show.monitored ? "Monitored" : "Unmonitored"} 
                        size="small" 
                        color={show.monitored ? "primary" : "default"}
                        variant={show.monitored ? "filled" : "outlined"}
                      />
                      {show.statistics && (
                        <Chip 
                          label={`${show.statistics.episodeFileCount || 0}/${show.statistics.episodeCount || 0} episodes`} 
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {show.overview?.substring(0, 200)}...
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Series Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        {seriesToView && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">{seriesToView.title}</Typography>
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
                  {seriesToView.images?.find(img => img.coverType === 'poster') && (
                    <CardMedia
                      component="img"
                      image={seriesToView.images.find(img => img.coverType === 'poster').remoteUrl}
                      alt={seriesToView.title}
                      sx={{ borderRadius: 2, width: '100%' }}
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                    <Chip label={`${seriesToView.seasons?.length || 0} Seasons`} />
                    {seriesToView.status && (
                      <Chip label={seriesToView.status} />
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
                        <Typography variant="body2">Monitor this series</Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                      {seriesToView.monitored && (
                        <Chip label="Monitored" color="primary" />
                      )}
                      {seriesToView.qualityProfileId && (
                        <Chip label={`Quality: ${qualityProfiles.find(p => p.id === seriesToView.qualityProfileId)?.name || 'Unknown'}`} />
                      )}
                    </Box>
                  )}
                  
                  <Typography variant="h6" gutterBottom>Overview</Typography>
                  <Typography variant="body1" paragraph>
                    {seriesToView.overview || 'No overview available.'}
                  </Typography>
                  
                  {(seriesToView.episodeFileCount > 0 || seriesToView.statistics?.episodeFileCount > 0) && (
                    <>
                      <Typography variant="h6" gutterBottom>Downloaded Episodes</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {seriesToView.episodeFileCount || seriesToView.statistics?.episodeFileCount || 0} / {seriesToView.episodeCount || seriesToView.statistics?.episodeCount || 0} episodes
                      </Typography>
                      {(() => {
                        const size = seriesToView.sizeOnDisk || 
                                    seriesToView.statistics?.sizeOnDisk || 
                                    seriesToView.statistics?.totalFileSize ||
                                    seriesToView.totalFileSize;
                        if (size && size > 0) {
                          return (
                            <Typography variant="body2" color="text.secondary" paragraph>
                              <strong>Total Size:</strong> {formatBytes(size)}
                            </Typography>
                          );
                        }
                        return null;
                      })()}
                    </>
                  )}
                  
                  {seriesToView.path && (
                    <>
                      <Typography variant="h6" gutterBottom>Folder Path</Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {seriesToView.path}
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
                          Delete series files from disk
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
                    onClick={handleDeleteSeries}
                    color="error"
                    variant="contained"
                    startIcon={<Delete />}
                  >
                    Delete from Sonarr
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Search TV Shows</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSeriesSearch} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search for TV shows..."
              value={seriesSearchQuery}
              onChange={(e) => setSeriesSearchQuery(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button type="submit">
                      <Search />
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          {!selectedSeries ? (
            <Grid container spacing={2}>
              {searchResults.map((result) => (
                <Grid item xs={12} key={result.tvdbId}>
                  <Card sx={{ cursor: 'pointer' }} onClick={() => handleSelectSeries(result)}>
                    <CardContent>
                      <Box display="flex" gap={2}>
                        {result.images?.find(img => img.coverType === 'poster') && (
                          <Box
                            component="img"
                            src={result.images.find(img => img.coverType === 'poster').remoteUrl}
                            alt={result.title}
                            sx={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 1 }}
                          />
                        )}
                        <Box flexGrow={1}>
                          <Typography variant="h6">{result.title}</Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {result.year} {result.seasons?.length ? `• ${result.seasons.length} Season${result.seasons.length > 1 ? 's' : ''}` : ''} {result.network ? `• ${result.network}` : ''}
                          </Typography>
                          <Typography variant="body2">
                            {result.overview || 'No description available'}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6">{selectedSeries.title} ({selectedSeries.year})</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedSeries.seasons?.length || 0} Season{(selectedSeries.seasons?.length || 0) !== 1 ? 's' : ''}
                  </Typography>
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
                <Button variant="outlined" onClick={() => setSelectedSeries(null)}>
                  Back
                </Button>
                <Button variant="contained" onClick={handleAddSeries} fullWidth>
                  Add Series
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSearchOpen(false); setSelectedSeries(null); setSearchResults([]); setSeriesSearchQuery(''); }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Sonarr;
