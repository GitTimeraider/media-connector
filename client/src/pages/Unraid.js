import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Storage,
  Memory,
  Speed,
  CheckCircle,
  Error as ErrorIcon,
  Computer
} from '@mui/icons-material';
import api from '../services/api';

function Unraid() {
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [dockerContainers, setDockerContainers] = useState([]);
  const [arrayStatus, setArrayStatus] = useState(null);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      loadUnraidData();
      const interval = setInterval(loadUnraidData, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstance]);

  const loadInstances = async () => {
    try {
      const data = await api.getServiceInstances('unraid');
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

  const loadUnraidData = async () => {
    try {
      const [stats, docker, array] = await Promise.allSettled([
        api.getUnraidStatus(selectedInstance),
        api.getUnraidDocker(selectedInstance),
        api.getUnraidArray(selectedInstance)
      ]);

      console.log('Unraid Data Loaded:', { stats, docker, array });

      if (stats.status === 'fulfilled') setSystemStats(stats.value?.info || stats.value);
      if (docker.status === 'fulfilled') {
        const containers = docker.value?.dockerContainers || docker.value;
        console.log('Docker containers:', containers);
        setDockerContainers(Array.isArray(containers) ? containers : []);
      }
      if (array.status === 'fulfilled') setArrayStatus(array.value?.array || array.value);
    } catch (error) {
      console.error('Error loading Unraid data:', error);
    }
  };

  const handleDockerAction = async (container, action) => {
    try {
      await api.unraidDockerAction(selectedInstance, container, action);
      loadUnraidData();
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
          No Unraid instances configured. Go to Settings to add one.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Unraid Server
        </Typography>
        <IconButton onClick={loadUnraidData}>
          <Refresh />
        </IconButton>
      </Box>

      {/* System Stats */}
      {systemStats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Memory sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">CPU</Typography>
                </Box>
                <Typography variant="body2">{systemStats.cpu?.brand || systemStats.cpu?.manufacturer || 'N/A'}</Typography>
                <Typography variant="caption">{systemStats.cpu?.cores || 0} cores, {systemStats.cpu?.threads || 0} threads</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Storage sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">Memory</Typography>
                </Box>
                <Typography variant="h4">{systemStats.memory ? Math.round((systemStats.memory.used / systemStats.memory.total) * 100) : 0}%</Typography>
                <Typography variant="caption">{formatBytes(systemStats.memory?.used || 0)} / {formatBytes(systemStats.memory?.total || 0)}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={systemStats.memory ? (systemStats.memory.used / systemStats.memory.total) * 100 : 0} 
                  color="success"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Computer sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">System</Typography>
                </Box>
                <Typography variant="body2">{systemStats.os?.distro || 'Unraid'} {systemStats.os?.release || ''}</Typography>
                <Typography variant="caption">Uptime: {Math.floor((systemStats.os?.uptime || 0) / 3600)}h {Math.floor(((systemStats.os?.uptime || 0) % 3600) / 60)}m</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Storage sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">Array</Typography>
                </Box>
                <Chip 
                  label={arrayStatus?.state || 'Unknown'} 
                  color={arrayStatus?.state === 'STARTED' ? 'success' : 'default'}
                  size="small"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Docker Containers */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Docker Containers
      </Typography>
      <Grid container spacing={2}>
        {dockerContainers.map((container, index) => (
          <Grid item xs={12} sm={6} md={4} key={container.id || index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    {container.names?.[0] || container.name || container.Names?.[0]?.replace('/', '') || 'Unknown'}
                  </Typography>
                  <Chip
                    icon={(container.state || container.State) === 'running' ? <CheckCircle /> : <ErrorIcon />}
                    label={container.state || container.State || container.status || container.Status || 'unknown'}
                    color={(container.state || container.State) === 'running' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {container.status || container.Status || 'No status'}
                </Typography>
                {container.autoStart !== undefined && (
                  <Chip 
                    label={container.autoStart ? 'Auto-start' : 'Manual start'} 
                    size="small" 
                    sx={{ mt: 1 }}
                  />
                )}

                <Box display="flex" gap={1} mt={2}>
                  {(container.state || container.State) === 'running' ? (
                    <Tooltip title="Stop">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDockerAction(container.id || container.Id, 'stop')}
                      >
                        <Stop />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Start">
                      <IconButton 
                        size="small" 
                        color="success"
                        onClick={() => handleDockerAction(container.id || container.Id, 'start')}
                      >
                        <PlayArrow />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Restart">
                    <IconButton 
                      size="small"
                      onClick={() => handleDockerAction(container.id || container.Id, 'restart')}
                    >
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default Unraid;
