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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Storage,
  Memory,
  CheckCircle,
  Error as ErrorIcon,
  Computer,
  Layers
} from '@mui/icons-material';
import api from '../services/api';

// Error Boundary to catch rendering errors and prevent app crash
class PortainerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Portainer page error:', error, errorInfo);
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
            Something went wrong loading the Portainer page. 
            {this.state.error?.message && ` Error: ${this.state.error.message}`}
          </Alert>
        </Container>
      );
    }
    return this.props.children;
  }
}

// Safe number parser
const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

function PortainerContent() {
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [containers, setContainers] = useState([]);
  const [portainerStatus, setPortainerStatus] = useState(null);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      loadPortainerStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstance]);

  useEffect(() => {
    if (selectedInstance && selectedEndpoint) {
      loadEndpointData();
      const interval = setInterval(loadEndpointData, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstance, selectedEndpoint]);

  const loadInstances = async () => {
    try {
      const data = await api.getServiceInstances('portainer');
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

  const loadPortainerStatus = async () => {
    try {
      const status = await api.getPortainerStatus(selectedInstance);
      setPortainerStatus(status.status);
      setEndpoints(status.endpoints || []);
      
      // Auto-select first Docker endpoint
      if (status.endpoints?.length > 0) {
        const dockerEndpoint = status.endpoints.find(e => e.Type === 1 || e.Type === 2);
        if (dockerEndpoint) {
          setSelectedEndpoint(dockerEndpoint.Id);
        } else {
          setSelectedEndpoint(status.endpoints[0].Id);
        }
      }
    } catch (error) {
      console.error('Error loading Portainer status:', error);
    }
  };

  const loadEndpointData = async () => {
    if (!selectedEndpoint) return;
    
    try {
      const [sysInfo, containerData] = await Promise.allSettled([
        api.getPortainerSystemInfo(selectedInstance, selectedEndpoint),
        api.getPortainerContainers(selectedInstance, selectedEndpoint)
      ]);

      if (sysInfo.status === 'fulfilled') {
        setSystemInfo(sysInfo.value);
      }
      
      if (containerData.status === 'fulfilled') {
        const containerList = containerData.value?.containers || [];
        // Sort containers alphabetically by name
        const sorted = containerList.sort((a, b) => {
          const nameA = (a.names?.[0] || '').replace(/^\//g, '').toLowerCase();
          const nameB = (b.names?.[0] || '').replace(/^\//g, '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setContainers(sorted);
      }
    } catch (error) {
      console.error('Error loading endpoint data:', error);
    }
  };

  const handleContainerAction = async (containerId, action) => {
    try {
      await api.portainerContainerAction(selectedInstance, selectedEndpoint, containerId, action);
      // Reload data after action
      setTimeout(loadEndpointData, 1000);
    } catch (error) {
      console.error('Error performing action:', error);
      alert(`Failed to ${action} container: ${error.response?.data?.error || error.message}`);
    }
  };

  const formatBytes = (bytes) => {
    const numBytes = safeNumber(bytes);
    if (numBytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    if (i < 0 || i >= sizes.length) return '0 B';
    return Math.round(numBytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
          No Portainer instances configured. Go to Settings to add one.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ overflowX: 'hidden', width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Portainer
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          {endpoints.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Environment</InputLabel>
              <Select
                value={selectedEndpoint || ''}
                label="Environment"
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              >
                {endpoints.map((endpoint) => (
                  <MenuItem key={endpoint.Id} value={endpoint.Id}>
                    {endpoint.Name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <IconButton onClick={loadEndpointData}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Portainer Status */}
      {portainerStatus && (
        <Box mb={2}>
          <Chip 
            icon={<CheckCircle />}
            label={`Portainer v${portainerStatus.Version}`}
            color="success"
            size="small"
          />
        </Box>
      )}

      {/* System Stats */}
      {systemInfo && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Computer sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">System</Typography>
                </Box>
                <Typography variant="body1" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                  {systemInfo.hostname}
                </Typography>
                <Typography variant="caption" display="block">
                  {systemInfo.os}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  {systemInfo.architecture} • Kernel {systemInfo.kernelVersion}
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
                <Typography variant="h4" color="primary">
                  {safeNumber(systemInfo.cpus)}
                </Typography>
                <Typography variant="caption">
                  CPU Cores Available
                </Typography>
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
                <Typography variant="h4">
                  {formatBytes(systemInfo.memoryTotal)}
                </Typography>
                <Typography variant="caption">
                  Total Memory
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Layers sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">Containers</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {safeNumber(systemInfo.containers?.running)}
                  <Typography variant="caption" component="span" sx={{ ml: 1 }}>
                    / {safeNumber(systemInfo.containers?.total)}
                  </Typography>
                </Typography>
                <Typography variant="caption">
                  Running / Total
                </Typography>
                {systemInfo.containers?.stopped > 0 && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    {systemInfo.containers.stopped} stopped
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Docker Containers */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Docker Containers
      </Typography>
      
      {containers.length === 0 ? (
        <Alert severity="info">No containers found</Alert>
      ) : (
        <Grid container spacing={2}>
          {containers.map((container) => {
            const containerName = (container.names?.[0] || container.id?.substring(0, 12) || 'Unknown').replace(/^\//g, '');
            const isRunning = container.state === 'running';
            const isPaused = container.state === 'paused';
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={container.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    borderLeft: 4,
                    borderColor: isRunning ? 'success.main' : isPaused ? 'warning.main' : 'error.main'
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {containerName}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {container.image}
                        </Typography>
                      </Box>
                      <Chip 
                        size="small"
                        icon={isRunning ? <CheckCircle /> : <ErrorIcon />}
                        label={container.state}
                        color={isRunning ? 'success' : isPaused ? 'warning' : 'error'}
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      {container.status}
                    </Typography>

                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      {isRunning ? (
                        <Tooltip title="Stop Container">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleContainerAction(container.id, 'stop')}
                          >
                            <Stop />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Start Container">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleContainerAction(container.id, 'start')}
                          >
                            <PlayArrow />
                          </IconButton>
                        </Tooltip>
                      )}
                      {isRunning && (
                        <Tooltip title="Restart Container">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleContainerAction(container.id, 'restart')}
                          >
                            <Refresh />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}

// Export wrapped in Error Boundary
export default function Portainer() {
  return (
    <PortainerErrorBoundary>
      <PortainerContent />
    </PortainerErrorBoundary>
  );
}
