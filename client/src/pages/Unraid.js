import React, { useState, useEffect, Component } from 'react';
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
  Tooltip,
  Button
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

// Error Boundary to catch rendering errors and prevent app crash
class UnraidErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unraid page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container>
          <Alert 
            severity="error" 
            sx={{ mt: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Retry
              </Button>
            }
          >
            Something went wrong loading the Unraid page. 
            {this.state.error?.message && ` Error: ${this.state.error.message}`}
          </Alert>
        </Container>
      );
    }
    return this.props.children;
  }
}

// Safe number parser that handles BigInt strings and null/undefined
const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

function UnraidContent() {
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
      return () => {
        clearInterval(interval);
      };
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

      if (stats.status === 'fulfilled') {
        const statsData = stats.value;
        
        // GraphQL response structure: { info: { cpu, memory, os, system }, metrics: { cpu, memory } }
        const info = statsData?.info || {};
        const metrics = statsData?.metrics || {};
        
        // Hardware info from info.memory.layout
        const memoryLayout = info?.memory?.layout || [];
        // Usage data from metrics.memory
        const memoryMetrics = metrics?.memory || {};
        
        const combinedStats = {
          cpu: {
            ...info?.cpu,
            // Add usage percentage from metrics
            usage: metrics?.cpu?.percentTotal
          },
          memory: {
            // Total from metrics, or calculate from layout
            total: memoryMetrics.total || memoryLayout.reduce((sum, module) => sum + (Number(module.size) || 0), 0),
            used: memoryMetrics.used,
            free: memoryMetrics.free,
            available: memoryMetrics.available,
            percentTotal: memoryMetrics.percentTotal,
            layout: memoryLayout
          },
          os: info?.os || {},
          system: info?.system || {},
          versions: info?.versions || {}
        };
        setSystemStats(combinedStats);
      }
      if (docker.status === 'fulfilled') {
        const containers = docker.value?.docker?.containers || docker.value?.dockerContainers || docker.value;
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

  const handleDockerAction = async (containerId, action) => {
    try {
      console.log('Docker action:', { containerId, action });
      await api.unraidDockerAction(selectedInstance, containerId, action);
      loadUnraidData();
    } catch (error) {
      console.error('Error performing action:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      alert(`Failed to ${action} container: ${errorMessage}`);
    }
  };

  const formatBytes = (bytes) => {
    try {
      const numBytes = safeNumber(bytes);
      if (numBytes <= 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(numBytes) / Math.log(k));
      if (i < 0 || i >= sizes.length) return '0 B';
      return Math.round(numBytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    } catch (e) {
      console.error('formatBytes error:', e);
      return '0 B';
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
                  <Computer sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">System</Typography>
                </Box>
                <Typography variant="body2" fontWeight={500}>
                  {systemStats.os?.hostname || 'Unknown'}
                </Typography>
                {(systemStats.system?.manufacturer || systemStats.system?.model) && (
                  <Typography variant="body2" color="text.secondary">
                    {[systemStats.system?.manufacturer, systemStats.system?.model].filter(Boolean).join(' ')}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {systemStats.os?.distro || 'Unraid'} {systemStats.os?.release || ''}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Uptime: {(() => {
                    const uptimeData = systemStats.os?.uptime;
                    if (!uptimeData) return 'N/A';
                    // Unraid returns uptime as an ISO datetime string (boot time)
                    let uptimeSeconds;
                    if (typeof uptimeData === 'string') {
                      // Parse ISO datetime and calculate seconds since boot
                      const bootTime = new Date(uptimeData);
                      if (!isNaN(bootTime.getTime())) {
                        uptimeSeconds = Math.floor((Date.now() - bootTime.getTime()) / 1000);
                      } else {
                        return uptimeData; // Return as-is if not valid date
                      }
                    } else if (typeof uptimeData === 'number') {
                      uptimeSeconds = uptimeData;
                    } else {
                      return 'N/A';
                    }
                    const days = Math.floor(uptimeSeconds / 86400);
                    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
                    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                    return `${days}d ${hours}h ${minutes}m`;
                  })()}
                </Typography>
                <Typography variant="caption" display="block">
                  Platform: {systemStats.os?.platform || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Memory sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">CPU</Typography>
                </Box>
                <Typography variant="body1" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  {systemStats.cpu?.brand || systemStats.cpu?.manufacturer || 'N/A'}
                </Typography>
                <Typography variant="caption">
                  {safeNumber(systemStats.cpu?.cores)} cores, {safeNumber(systemStats.cpu?.threads)} threads
                </Typography>
                {systemStats.cpu?.speed && (
                  <Typography variant="caption" display="block">
                    {safeNumber(systemStats.cpu.speed) >= 10 ? (safeNumber(systemStats.cpu.speed) / 1000).toFixed(2) : safeNumber(systemStats.cpu.speed).toFixed(2)} GHz
                  </Typography>
                )}
                {(systemStats.cpu?.usage !== undefined || systemStats.cpu?.currentLoad !== undefined) ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h4" color="primary">
                      {safeNumber(
                        systemStats.cpu?.usage ??
                        systemStats.cpu?.currentLoad
                      ).toFixed(1)}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(safeNumber(
                        systemStats.cpu?.usage ??
                        systemStats.cpu?.currentLoad
                      ), 100)} 
                      sx={{ mt: 1 }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      CPU usage data not available
                    </Typography>
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
                </Box>
                {(systemStats.memory?.used && systemStats.memory?.total) ? (
                  <>
                    <Typography variant="h4">
                      {(() => {
                        // Use Unraid's provided percentTotal if available, otherwise calculate
                        // Unraid includes System + ZFS cache + Docker in usage calculation
                        if (systemStats.memory?.percentTotal !== undefined) {
                          return safeNumber(systemStats.memory.percentTotal).toFixed(1);
                        }
                        // Fallback: Calculate using free memory: (total - free) / total
                        // This matches Unraid's calculation (System + ZFS + Docker)
                        const total = safeNumber(systemStats.memory?.total) || 1;
                        const free = safeNumber(systemStats.memory?.free);
                        const used = total - free;
                        return ((used / total) * 100).toFixed(1);
                      })()}%
                    </Typography>
                    <Typography variant="caption">
                      {(() => {
                        const total = safeNumber(systemStats.memory?.total) || 1;
                        const free = safeNumber(systemStats.memory?.free);
                        const used = total - free;
                        return formatBytes(used);
                      })()} / {formatBytes(safeNumber(systemStats.memory?.total))}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(() => {
                        if (systemStats.memory?.percentTotal !== undefined) {
                          return Math.min(safeNumber(systemStats.memory.percentTotal), 100);
                        }
                        const total = safeNumber(systemStats.memory?.total) || 1;
                        const free = safeNumber(systemStats.memory?.free);
                        const used = total - free;
                        return Math.min((used / total) * 100, 100);
                      })()} 
                      sx={{ mt: 1 }}
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="h4">{formatBytes(Array.isArray(systemStats.memory?.layout) ? systemStats.memory.layout.reduce((sum, m) => sum + safeNumber(m?.size), 0) : 0)}</Typography>
                    <Typography variant="caption" display="block">{Array.isArray(systemStats.memory?.layout) ? systemStats.memory.layout.length : 0} modules</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Memory usage data not available
                    </Typography>
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
                </Box>
                <Typography variant="body2" fontWeight={500}>
                  {systemStats.os?.hostname || 'Unknown'}
                </Typography>
                {(systemStats.system?.manufacturer || systemStats.system?.model) && (
                  <Typography variant="body2" color="text.secondary">
                    {[systemStats.system?.manufacturer, systemStats.system?.model].filter(Boolean).join(' ')}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {systemStats.os?.distro || 'Unraid'} {systemStats.os?.release || ''}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Uptime: {(() => {
                    const uptimeData = systemStats.os?.uptime;
                    if (!uptimeData) return 'N/A';
                    // Unraid returns uptime as an ISO datetime string (boot time)
                    let uptimeSeconds;
                    if (typeof uptimeData === 'string') {
                      // Parse ISO datetime and calculate seconds since boot
                      const bootTime = new Date(uptimeData);
                      if (!isNaN(bootTime.getTime())) {
                        uptimeSeconds = Math.floor((Date.now() - bootTime.getTime()) / 1000);
                      } else {
                        return uptimeData; // Return as-is if not valid date
                      }
                    } else if (typeof uptimeData === 'number') {
                      uptimeSeconds = uptimeData;
                    } else {
                      return 'N/A';
                    }
                    const days = Math.floor(uptimeSeconds / 86400);
                    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
                    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                    return `${days}d ${hours}h ${minutes}m`;
                  })()}
                </Typography>
                <Typography variant="caption" display="block">
                  Platform: {systemStats.os?.platform || 'N/A'}
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
                
                {/* Memory usage */}
                {container.stats?.memory && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Memory: {formatBytes(container.stats.memory.usage)} / {formatBytes(container.stats.memory.limit)}
                      {container.stats.memory.percent !== undefined && ` (${container.stats.memory.percent.toFixed(1)}%)`}
                    </Typography>
                    {container.stats.memory.percent !== undefined && (
                      <LinearProgress 
                        variant="determinate" 
                        value={container.stats.memory.percent} 
                        sx={{ mt: 0.5, height: 4 }}
                      />
                    )}
                  </Box>
                )}
                
                {container.autoStart !== undefined && (
                  <Chip 
                    label={container.autoStart ? 'Auto-start' : 'Manual start'} 
                    size="small" 
                    sx={{ mt: 1 }}
                  />
                )}

                <Box display="flex" gap={1} mt={2}>
                  {(container.state || container.State)?.toLowerCase() === 'running' ? (
                    <Tooltip title="Stop">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDockerAction(container.id || container.Id || container.name, 'stop')}
                      >
                        <Stop />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Start">
                      <IconButton 
                        size="small" 
                        color="success"
                        onClick={() => handleDockerAction(container.id || container.Id || container.name, 'start')}
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

// Wrap the component with Error Boundary to prevent crashes from affecting rest of app
function Unraid() {
  return (
    <UnraidErrorBoundary>
      <UnraidContent />
    </UnraidErrorBoundary>
  );
}

export default Unraid;
