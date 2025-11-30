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
import { Search, Add } from '@mui/icons-material';
import api from '../services/api';

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

  useEffect(() => {
    loadInstances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const filteredSeries = series.filter(show =>
    show.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          TV Shows
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setSearchOpen(true)}
        >
          Add Series
        </Button>
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
      ) : (
        <Grid container spacing={3}>
          {filteredSeries.map((show) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={show.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {show.images?.find(img => img.coverType === 'poster') && (
                  <CardMedia
                    component="img"
                    image={show.images.find(img => img.coverType === 'poster').remoteUrl}
                    alt={show.title}
                    sx={{ objectFit: 'cover', height: { xs: 250, sm: 300, md: 350 }, width: '100%' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {show.title}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip 
                      label={`${show.seasonCount} Seasons`} 
                      size="small" 
                      color="primary" 
                    />
                    {show.monitored && (
                      <Chip label="Monitored" size="small" color="success" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {show.overview?.substring(0, 150)}...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

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
                            {result.year} {result.seasonCount ? `• ${result.seasonCount} Season${result.seasonCount > 1 ? 's' : ''}` : ''} {result.network ? `• ${result.network}` : ''}
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
                    {selectedSeries.seasonCount} Season{selectedSeries.seasonCount > 1 ? 's' : ''}
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
