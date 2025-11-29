import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning
} from '@mui/icons-material';
import api from '../services/api';

function Overview() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState({});
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const servicesData = await api.getServices();
      setServices(servicesData);

      // Check status of all services
      const statusPromises = [];
      const statusMap = {};

      for (const [serviceType, instances] of Object.entries(servicesData)) {
        if (instances.length > 0) {
          for (const instance of instances) {
            const key = `${serviceType}-${instance.id}`;
            statusPromises.push(
              checkServiceStatus(serviceType, instance.id)
                .then(status => ({ key, status: 'online', ...status }))
                .catch(() => ({ key, status: 'offline' }))
            );
          }
        }
      }

      const results = await Promise.all(statusPromises);
      results.forEach(result => {
        statusMap[result.key] = result;
      });

      setStatuses(statusMap);
    } catch (error) {
      console.error('Error loading overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkServiceStatus = async (serviceType, instanceId) => {
    switch (serviceType) {
      case 'sonarr':
        return await api.getSonarrStatus(instanceId);
      case 'radarr':
        return await api.getRadarrStatus(instanceId);
      case 'lidarr':
        return await api.getLidarrStatus(instanceId);
      case 'readarr':
        return await api.getReadarrStatus(instanceId);
      case 'sabnzbd':
        return await api.getSabnzbdStatus(instanceId);
      case 'nzbget':
        return await api.getNzbgetStatus(instanceId);
      case 'qbittorrent':
        return await api.getQbittorrentStatus(instanceId);
      case 'deluge':
        return await api.getDelugeStatus(instanceId);
      case 'transmission':
        return await api.getTransmissionStatus(instanceId);
      case 'overseerr':
        return await api.getOverseerrStatus(instanceId);
      case 'prowlarr':
        return await api.getProwlarrStatus(instanceId);
      case 'tautulli':
        return await api.getTautulliStatus(instanceId);
      default:
        throw new Error('Unknown service type');
    }
  };

  const ServiceCard = ({ serviceType, instance }) => {
    const key = `${serviceType}-${instance.id}`;
    const status = statuses[key];
    const isOnline = status?.status === 'online';

    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {instance.name}
            </Typography>
            <Chip
              icon={isOnline ? <CheckCircle /> : <ErrorIcon />}
              label={isOnline ? 'Online' : 'Offline'}
              color={isOnline ? 'success' : 'error'}
              size="small"
            />
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Type: {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" noWrap>
            URL: {instance.url}
          </Typography>

          {isOnline && status.system && (
            <Box mt={2}>
              <Typography variant="body2">
                Version: {status.system.version}
              </Typography>
            </Box>
          )}

          {isOnline && status.queue && (
            <Box mt={1}>
              <Typography variant="body2">
                Queue: {status.queue.totalCount || status.queue.records?.length || 0} items
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
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
        <Typography variant="h4" gutterBottom>Overview</Typography>
        <Alert severity="info" icon={<Warning />}>
          No services configured. Go to Settings to add your media services.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        Services Overview
      </Typography>

      {Object.entries(services).map(([serviceType, instances]) => 
        instances.length > 0 && (
          <Box key={serviceType} mt={4}>
            <Typography variant="h5" gutterBottom sx={{ textTransform: 'capitalize' }}>
              {serviceType}
            </Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {instances.map((instance) => (
                <Grid item xs={12} sm={6} md={4} key={instance.id}>
                  <ServiceCard serviceType={serviceType} instance={instance} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )
      )}
    </Container>
  );
}

export default Overview;
