import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  Tooltip,
  InputAdornment
} from '@mui/material';
import { 
  Delete, 
  Add, 
  Edit, 
  CheckCircle, 
  Error,
  Settings as SettingsIcon,
  Cloud,
  Download,
  Search,
  Tv,
  Movie as MovieIcon,
  Visibility,
  VisibilityOff,
  Link as LinkIcon,
  VpnKey
} from '@mui/icons-material';
import api from '../services/api';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Settings() {
  const [tabValue, setTabValue] = useState(0);
  const [services, setServices] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [currentServiceType, setCurrentServiceType] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    apiKey: '',
    username: '',
    password: ''
  });

  const serviceTypes = [
    { type: 'sonarr', label: 'Sonarr', requiresApiKey: true },
    { type: 'radarr', label: 'Radarr', requiresApiKey: true },
    { type: 'sabnzbd', label: 'SABnzbd', requiresApiKey: true },
    { type: 'deluge', label: 'Deluge', requiresAuth: true, passwordOnly: true },
    { type: 'prowlarr', label: 'Prowlarr', requiresApiKey: true },
    { type: 'unraid', label: 'Unraid', requiresApiKey: true }
  ];

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await api.getServices();
      setServices(data);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleAddService = (serviceType) => {
    setCurrentServiceType(serviceType);
    setEditingService(null);
    setFormData({ name: '', url: '', apiKey: '', username: '', password: '' });
    setTestStatus(null);
    setDialogOpen(true);
  };

  const handleEditService = (serviceType, service) => {
    setCurrentServiceType(serviceType);
    setEditingService(service);
    setFormData({
      name: service.name,
      url: service.url,
      apiKey: service.apiKey || '',
      username: service.username || '',
      password: service.password || ''
    });
    setTestStatus(null);
    setDialogOpen(true);
  };

  const handleDeleteService = async (serviceType, serviceId) => {
    try {
      await api.deleteService(serviceType, serviceId);
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestStatus({ loading: true });
      await api.testService(currentServiceType, formData);
      setTestStatus({ success: true, message: 'Connection successful!' });
    } catch (error) {
      setTestStatus({ success: false, message: error.message });
    }
  };

  const handleSave = async () => {
    try {
      if (editingService) {
        await api.updateService(currentServiceType, editingService.id, formData);
      } else {
        await api.addService(currentServiceType, formData);
      }
      setDialogOpen(false);
      loadServices();
    } catch (error) {
      console.error('Error saving service:', error);
      setTestStatus({ success: false, message: error.message });
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  const getServiceIcon = (type) => {
    const icons = {
      sonarr: <Tv />,
      radarr: <MovieIcon />,
      sabnzbd: <Download />,
      deluge: <Download />,
      prowlarr: <Search />,
      unraid: <SettingsIcon />
    };
    return icons[type] || <SettingsIcon />;
  };

  const ServiceList = ({ serviceType, label }) => {
    const instances = services[serviceType] || [];

    return (
      <Card 
        sx={{ 
          mb: 3,
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }
          }}
        >
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 24
                  }}
                >
                  {getServiceIcon(serviceType)}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">{label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {instances.length} {instances.length === 1 ? 'instance' : 'instances'} configured
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleAddService(serviceType)}
                sx={{
                  background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #7b1fa2 100%)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                Add {label}
              </Button>
            </Box>

            {instances.length === 0 ? (
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: 2
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No {label} instances configured yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click "Add {label}" to get started
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {instances.map((instance, index) => (
                  <Grid item xs={12} key={instance.id}>
                    <Paper
                        elevation={hoveredCard === instance.id ? 8 : 2}
                        onMouseEnter={() => setHoveredCard(instance.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        sx={{
                          p: 2,
                          background: hoveredCard === instance.id 
                            ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)'
                            : 'rgba(255, 255, 255, 0.05)',
                          border: hoveredCard === instance.id
                            ? '1px solid rgba(25, 118, 210, 0.5)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'translateX(8px)',
                          }
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="h6" fontWeight="bold">
                                {instance.name}
                              </Typography>
                              <Chip 
                                label="Active" 
                                size="small" 
                                color="success"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LinkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {instance.url}
                              </Typography>
                            </Box>
                            {instance.apiKey && (
                              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                <VpnKey sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  API Key: {instance.apiKey.substring(0, 8)}...
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Edit" arrow>
                              <IconButton
                                onClick={() => handleEditService(serviceType, instance)}
                                sx={{
                                  background: 'rgba(25, 118, 210, 0.1)',
                                  '&:hover': {
                                    background: 'rgba(25, 118, 210, 0.2)',
                                    transform: 'rotate(90deg)',
                                  },
                                  transition: 'all 0.3s ease'
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete" arrow>
                              <IconButton
                                onClick={() => handleDeleteService(serviceType, instance.id)}
                                sx={{
                                  background: 'rgba(244, 67, 54, 0.1)',
                                  color: 'error.main',
                                  '&:hover': {
                                    background: 'rgba(244, 67, 54, 0.2)',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.3s ease'
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
    );
  };

  const currentServiceConfig = serviceTypes.find(s => s.type === currentServiceType);

  return (
    <Container maxWidth="xl" sx={{ py: 4, overflowX: 'hidden', width: '100%' }}>
      <Box mb={4}>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <SettingsIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography 
                variant="h3" 
                fontWeight="bold"
                sx={{
                  background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure your media services and download clients
              </Typography>
            </Box>
          </Box>
        </Box>

      <Paper 
        elevation={3}
        sx={{ 
          mb: 3,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              py: 2,
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'rgba(25, 118, 210, 0.1)',
              },
              '&.Mui-selected': {
                background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)',
              }
            },
            '& .MuiTabs-indicator': {
              height: 3,
              background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
            }
          }}
        >
          <Tab label="Media Managers" icon={<Tv />} iconPosition="start" />
          <Tab label="Download Clients" icon={<Download />} iconPosition="start" />
          <Tab label="Indexers & Search" icon={<Search />} iconPosition="start" />
          <Tab label="Other Services" icon={<Cloud />} iconPosition="start" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <ServiceList serviceType="sonarr" label="Sonarr" />
        <ServiceList serviceType="radarr" label="Radarr" />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ServiceList serviceType="sabnzbd" label="SABnzbd" />
        <ServiceList serviceType="deluge" label="Deluge" />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ServiceList serviceType="prowlarr" label="Prowlarr" />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <ServiceList serviceType="unraid" label="Unraid" />
      </TabPanel>

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              {getServiceIcon(currentServiceType)}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {editingService ? 'Edit' : 'Add'} {currentServiceConfig?.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configure your {currentServiceConfig?.label} instance
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SettingsIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder={`My ${currentServiceConfig?.label}`}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="http://localhost:8989"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            {currentServiceConfig?.requiresApiKey && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Key"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnKey />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}
            {currentServiceConfig?.requiresAuth && (
              <>
                {!currentServiceConfig?.passwordOnly && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={currentServiceConfig?.passwordOnly}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={testStatus?.loading}
                fullWidth
                size="large"
                sx={{
                  py: 1.5,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    background: 'rgba(25, 118, 210, 0.1)',
                  }
                }}
              >
                {testStatus?.loading ? (
                  <CircularProgress size={24} />
                ) : (
                  <>
                    <CheckCircle sx={{ mr: 1 }} />
                    Test Connection
                  </>
                )}
              </Button>
            </Grid>
            {testStatus && !testStatus.loading && (
              <Grid item xs={12}>
                <Alert
                  severity={testStatus.success ? 'success' : 'error'}
                  icon={testStatus.success ? <CheckCircle /> : <Error />}
                  sx={{
                    '& .MuiAlert-icon': {
                      fontSize: 28
                    }
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {testStatus.message}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            size="large"
            sx={{ 
              px: 4,
              borderWidth: 2,
              '&:hover': { borderWidth: 2 }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            size="large"
            sx={{
              px: 4,
              background: 'linear-gradient(135deg, #1976d2 0%, #9c27b0 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #7b1fa2 100%)',
                transform: 'scale(1.02)',
              },
              transition: 'all 0.2s ease'
            }}
          >
            {editingService ? 'Update' : 'Add'} Service
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Settings;
