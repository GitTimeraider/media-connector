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
  DialogActions
} from '@mui/material';
import { Search, Add } from '@mui/icons-material';
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

  useEffect(() => {
    loadInstances();
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
      }
    } catch (error) {
      console.error('Error loading instances:', error);
    } finally {
      setLoading(false);
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

  const handleAddMovie = async (movie) => {
    try {
      await api.addRadarrMovie(selectedInstance, {
        title: movie.title,
        tmdbId: movie.tmdbId,
        qualityProfileId: 1,
        rootFolderPath: '/',
        monitored: true,
        addOptions: {
          searchForMovie: true
        }
      });
      alert(`${movie.title} added successfully!`);
      setAddDialogOpen(false);
      loadMovies();
    } catch (error) {
      console.error('Error adding movie:', error);
      alert('Failed to add movie');
    }
  };

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Movies
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setAddDialogOpen(true)}>
          Add Movie
        </Button>
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
          
          <Box sx={{ mt: 3 }}>
            {searchResults.map((movie) => (
              <Card key={movie.tmdbId} sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h6">{movie.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {movie.year}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleAddMovie(movie)}
                    >
                      Add
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
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
      ) : (
        <Grid container spacing={3}>
          {filteredMovies.map((movie) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={movie.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {movie.images?.find(img => img.coverType === 'poster') && (
                  <CardMedia
                    component="img"
                    height="300"
                    image={movie.images.find(img => img.coverType === 'poster').remoteUrl}
                    alt={movie.title}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {movie.title}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip label={movie.year} size="small" />
                    {movie.hasFile && (
                      <Chip label="Downloaded" size="small" color="success" />
                    )}
                    {movie.monitored && (
                      <Chip label="Monitored" size="small" color="primary" />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {movie.overview?.substring(0, 150)}...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default Radarr;
