import React, { useState, useEffect, useRef } from 'react';
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
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      loadUnraidData();
      connectWebSocket();
      const interval = setInterval(loadUnraidData, 10000); // Refresh every 10s
      return () => {
        clearInterval(interval);
        disconnectWebSocket();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstance]);

  const connectWebSocket = async () => {
    try {
      // Start subscription on backend
      await api.startUnraidSubscription(selectedInstance);
      
      // Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // includes hostname:port
      const wsUrl = `${protocol}//${host}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        // Subscribe to instance updates
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          instanceId: selectedInstance
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        if (message.type === 'stats' && message.instanceId === selectedInstance) {
          console.log('Received real-time stats:', message.data);
          console.log('CPU usage:', message.data?.info?.cpu?.usage);
          console.log('Memory:', message.data?.info?.memory);
          setRealtimeStats(message.data);
        } else if (message.type === 'subscribed') {
          console.log('Subscribed to instance:', message.instanceId);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
      };
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
    }
  };

  const disconnectWebSocket = async () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Stop subscription on backend
    try {
      await api.stopUnraidSubscription(selectedInstance);
    } catch (error) {
      console.error('Error stopping subscription:', error);
    }
  };

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

      if (stats.status === 'fulfilled') {
        const statsData = stats.value;
        console.log('Stats value structure:', statsData);
        
        // Calculate total memory from layout (Unraid API doesn't provide real-time usage in queries)
        const memoryLayout = statsData?.info?.memory?.layout || [];
        const totalMemory = memoryLayout.reduce((sum, module) => sum + (module.size || 0), 0);
        
        // Data is directly in the response from GraphQL
        const combinedStats = {
          cpu: statsData?.info?.cpu || statsData?.cpu,
          memory: {
            total: totalMemory,
            layout: memoryLayout
          },
          os: statsData?.info?.os || statsData?.os,
          versions: statsData?.info?.versions || statsData?.versions
        };
        console.log('Combined stats:', combinedStats);
        setSystemStats(combinedStats);
      }
      if (docker.status === 'fulfilled') {
        const containers = docker.value?.docker?.containers || docker.value?.dockerContainers || docker.value;
        console.log('Docker containers:', { docker: containers });
        const sortedContainers = Array.isArray(containers) 
          ? containers.sort((a, b) => {
              const nameA = (a.names?.[0] || a.name || a.Names?.[0] || '').replace(/^\//g, '').toLowerCase();
              const nameB = (b.names?.[0] || b.name || b.Names?.[0] || '').replace(/^\//g, '').toLowerCase();
              return nameA.localeCompare(nameB);
            })
          : [];
        setDockerContainers(sortedContainers);
      }
      if (array.status === 'fulfilled') setArrayStatus(array.value?.array || array.value);
    } catch (error) {
      console.error('Error loading Unraid data:', error);
    }
  };

  const handleDockerAction = async (container, action) => {
    try {
      console.log('Docker action:', { container, action, instanceId: selectedInstance });
      await api.unraidDockerAction(selectedInstance, container, action);
      loadUnraidData();
    } catch (error) {
      console.error('Error performing action:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to ${action} container: ${error.response?.data?.error || error.message}`);
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
    <Container maxWidth="xl" sx={{ overflowX: 'hidden', width: '100%' }}>
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
                  {wsConnected && (
                    <Chip 
                      label="Live" 
                      color="success" 
                      size="small" 
                      sx={{ ml: 'auto', height: 20 }}
                    />
                  )}
                </Box>
                <Typography variant="body1" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  {systemStats.cpu?.brand || systemStats.cpu?.manufacturer || 'N/A'}
                </Typography>
                <Typography variant="caption">
                  {systemStats.cpu?.cores || 0} cores, {systemStats.cpu?.threads || 0} threads
                </Typography>
                {systemStats.cpu?.speed && (
                  <Typography variant="caption" display="block">
                    {systemStats.cpu.speed >= 10 ? (systemStats.cpu.speed / 1000).toFixed(2) : systemStats.cpu.speed.toFixed(2)} GHz
                  </Typography>
                )}
                {realtimeStats?.info?.cpu?.usage !== undefined && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h4" color="primary">
                      {realtimeStats.info.cpu.usage.toFixed(1)}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={realtimeStats.info.cpu.usage} 
                      sx={{ mt: 1 }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Storage sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">Memory</Typography>
                  {wsConnected && (
                    <Chip 
                      label="Live" 
                      color="success" 
                      size="small" 
                      sx={{ ml: 'auto', height: 20 }}
                    />
                  )}
                </Box>
                {realtimeStats?.info?.memory ? (
                  <>
                    <Typography variant="h4">
                      {((realtimeStats.info.memory.used / realtimeStats.info.memory.total) * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="caption">
                      {formatBytes(realtimeStats.info.memory.used)} / {formatBytes(realtimeStats.info.memory.total)}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(realtimeStats.info.memory.used / realtimeStats.info.memory.total) * 100} 
                      sx={{ mt: 1 }}
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="h4">{formatBytes(systemStats.memory?.total || 0)}</Typography>
                    <Typography variant="caption">{systemStats.memory?.layout?.length || 0} modules</Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Computer sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">System</Typography>
                  {wsConnected && (
                    <Chip 
                      label="Live" 
                      color="success" 
                      size="small" 
                      sx={{ ml: 'auto', height: 20 }}
                    />
                  )}
                </Box>
                <Typography variant="body2">{systemStats.os?.distro || 'Unraid'} {systemStats.os?.release || ''}</Typography>
                <Typography variant="caption">
                  Uptime: {(() => {
                    const uptimeData = realtimeStats?.info?.os?.uptime || systemStats.os?.uptime;
                    if (!uptimeData) return '0d 0h 0m';
                    // Unraid returns ISO date string of boot time, calculate uptime
                    const bootTime = new Date(uptimeData);
                    const now = new Date();
                    const uptimeSeconds = Math.floor((now - bootTime) / 1000);
                    const days = Math.floor(uptimeSeconds / 86400);
                    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
                    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                    return `${days}d ${hours}h ${minutes}m`;
                  })()}
                </Typography>
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
                    {(container.names?.[0] || container.name || container.Names?.[0] || 'Unknown').replace(/^\//g, '')}
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
                  {(container.state || container.State)?.toLowerCase() === 'running' ? (
                    <>
                      <Tooltip title="Stop">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => {
                            console.log('Stop clicked, container:', container);
                            handleDockerAction(container.id || container.Id || container.name, 'stop');
                          }}
                        >
                          <Stop />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Restart">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            console.log('Restart clicked, container:', container);
                            handleDockerAction(container.id || container.Id || container.name, 'restart');
                          }}
                        >
                          <Refresh />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <Tooltip title="Start">
                      <IconButton 
                        size="small" 
                        color="success"
                        onClick={() => {
                          console.log('Start clicked, container:', container);
                          handleDockerAction(container.id || container.Id || container.name, 'start');
                        }}
                      >
                        <PlayArrow />
                      </IconButton>
                    </Tooltip>
                  )}
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
