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
  Warning,
  LiveTv,
  Movie,
  MusicNote,
  Book
} from '@mui/icons-material';
import api from '../services/api';

function Overview() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState({});
  const [statuses, setStatuses] = useState({});
  const [stats, setStats] = useState({
    sonarr: { total: 0, monitored: 0 },
    radarr: { total: 0, monitored: 0 },
    lidarr: { total: 0, monitored: 0 },
    readarr: { total: 0, monitored: 0 }
  });

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

      // Load stats for media services
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
      }

      if (servicesData.lidarr?.length > 0) {
        statsPromises.push(
          api.getLidarrArtists(servicesData.lidarr[0].id)
            .then(artists => ({
              type: 'lidarr',
              total: artists.length,
              monitored: artists.filter(a => a.monitored).length
            }))
            .catch(() => ({ type: 'lidarr', total: 0, monitored: 0 }))
        );
      }

      if (servicesData.readarr?.length > 0) {
        statsPromises.push(
          api.getReadarrBooks(servicesData.readarr[0].id)
            .then(books => ({
              type: 'readarr',
              total: books.length,
              monitored: books.filter(b => b.monitored).length
            }))
            .catch(() => ({ type: 'readarr', total: 0, monitored: 0 }))
        );
      }

      if (statsPromises.length > 0) {
        const statsResults = await Promise.all(statsPromises);
        const newStats = { ...stats };
        statsResults.forEach(result => {
          if (result.type) {
            newStats[result.type] = { total: result.total, monitored: result.monitored };
          }
        });
        setStats(newStats);
      }
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
      case 'unraid':
        // For Unraid, check if we can get the status - if info is returned, it's online
        const unraidStatus = await api.getUnraidStatus(instanceId);
        // If we get info back (even if null), the server responded so it's reachable
        return { status: 'online', info: unraidStatus?.info };
      case 'portainer':
        // For Portainer, check if we can get the status
        const portainerStatus = await api.getPortainerStatus(instanceId);
        return { status: 'online', version: portainerStatus?.status?.Version };
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

  const StatCard = ({ title, icon, value, subtitle, color }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        color: 'white',
        transition: 'all 0.3s ease-in-out',
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

  return (
    <Container maxWidth="xl" sx={{ overflowX: 'hidden', width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Services Overview
      </Typography>

      {/* Library Stats */}
      <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
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
