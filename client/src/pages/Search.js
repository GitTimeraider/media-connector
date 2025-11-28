import React, { useState, useEffect } from 'react';
import { Container, Typography, Alert } from '@mui/material';
import api from '../services/api';

function Search() {
  const [hasIndexers, setHasIndexers] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIndexers();
  }, []);

  const checkIndexers = async () => {
    try {
      const services = await api.getServices();
      const hasProwlarr = services.prowlarr && services.prowlarr.length > 0;
      const hasJackett = services.jackett && services.jackett.length > 0;
      setHasIndexers(hasProwlarr || hasJackett);
    } catch (error) {
      console.error('Error checking indexers:', error);
    } finally {
      setLoading(false);
    }
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
          Configure Prowlarr or Jackett in Settings to search across indexers.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Search</Typography>
      <Alert severity="success">
        Search functionality coming soon! Your indexers are configured.
      </Alert>
    </Container>
  );
}

export default Search;
