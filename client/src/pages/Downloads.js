import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  IconButton
} from '@mui/material';
import { Pause, Delete } from '@mui/icons-material';
import api from '../services/api';

function Downloads() {
  const [loading, setLoading] = useState(true);
  const [downloads, setDownloads] = useState([]);

  useEffect(() => {
    loadDownloads();
    const interval = setInterval(loadDownloads, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDownloads = async () => {
    try {
      const servicesData = await api.getServices();

      const allDownloads = [];

      // Load SABnzbd queue
      if (servicesData.sabnzbd?.length > 0) {
        for (const instance of servicesData.sabnzbd) {
          try {
            const queue = await api.getSabnzbdQueue(instance.id);
            if (queue.queue?.slots) {
              allDownloads.push(...queue.queue.slots.map(item => ({
                ...item,
                service: 'SABnzbd',
                instanceId: instance.id,
                instanceName: instance.name,
                id: item.nzo_id
              })));
            }
          } catch (error) {
            console.error(`Error loading SABnzbd queue:`, error);
          }
        }
      }

      setDownloads(allDownloads);
    } catch (error) {
      console.error('Error loading downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (item) => {
    try {
      if (item.service === 'SABnzbd') {
        await api.pauseSabnzbd(item.instanceId, item.id);
      }
      loadDownloads();
    } catch (error) {
      console.error('Error pausing download:', error);
      alert('Failed to pause download');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.filename || item.name}?`)) return;
    
    try {
      if (item.service === 'SABnzbd') {
        await api.deleteSabnzbd(item.instanceId, item.id);
      }
      loadDownloads();
    } catch (error) {
      console.error('Error deleting download:', error);
      alert('Failed to delete download');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading && downloads.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (downloads.length === 0 && !loading) {
    return (
      <Container>
        <Typography variant="h4" gutterBottom>Downloads</Typography>
        <Alert severity="info">
          No active downloads.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ overflowX: 'hidden', width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Downloads
      </Typography>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {downloads.map((item, index) => (
          <Grid item xs={12} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box flexGrow={1}>
                    <Typography variant="h6" gutterBottom>
                      {item.filename || item.name}
                    </Typography>
                    <Box display="flex" gap={1} mb={1}>
                      <Chip label={item.service} size="small" color="primary" />
                      <Chip label={item.instanceName} size="small" />
                      <Chip 
                        label={item.status || 'Downloading'} 
                        size="small" 
                        color={item.status === 'Downloading' ? 'success' : 'default'} 
                      />
                    </Box>
                  </Box>
                  <Box display="flex" gap={1}>
                    <IconButton size="small" onClick={() => handlePause(item)}>
                      <Pause />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(item)}>
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>

                <Box mb={1}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">
                      {parseFloat(item.percentage || item.progress || 0).toFixed(1)}% complete
                    </Typography>
                    <Typography variant="body2">
                      {item.mb ? `${item.mb} MB` : formatBytes(item.size || item.total_size || 0)}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={parseFloat(item.percentage || item.progress || 0)} 
                  />
                </Box>

                {item.timeleft && (
                  <Typography variant="body2" color="text.secondary">
                    Time remaining: {item.timeleft}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default Downloads;
