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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress
} from '@mui/material';
import { Delete, Add, Edit, CheckCircle, Error } from '@mui/icons-material';
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
    { type: 'lidarr', label: 'Lidarr', requiresApiKey: true },
    { type: 'readarr', label: 'Readarr', requiresApiKey: true },
    { type: 'sabnzbd', label: 'SABnzbd', requiresApiKey: true },
    { type: 'nzbget', label: 'NZBGet', requiresAuth: true },
    { type: 'qbittorrent', label: 'qBittorrent', requiresAuth: true },
    { type: 'transmission', label: 'Transmission', requiresAuth: true },
    { type: 'deluge', label: 'Deluge', requiresAuth: true, passwordOnly: true },
    { type: 'overseerr', label: 'Overseerr', requiresApiKey: true },
    { type: 'tautulli', label: 'Tautulli', requiresApiKey: true },
    { type: 'prowlarr', label: 'Prowlarr', requiresApiKey: true },
    { type: 'jackett', label: 'Jackett', requiresApiKey: true },
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

  const ServiceList = ({ serviceType, label }) => {
    const instances = services[serviceType] || [];

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">{label}</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleAddService(serviceType)}
            >
              Add {label}
            </Button>
          </Box>

          {instances.length === 0 ? (
            <Alert severity="info">No {label} instances configured</Alert>
          ) : (
            <List>
              {instances.map((instance) => (
                <ListItem key={instance.id}>
                  <ListItemText
                    primary={instance.name}
                    secondary={instance.url}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleEditService(serviceType, instance)}
                      sx={{ mr: 1 }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteService(serviceType, instance.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    );
  };

  const currentServiceConfig = serviceTypes.find(s => s.type === currentServiceType);

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Media Managers" />
          <Tab label="Download Clients" />
          <Tab label="Indexers & Search" />
          <Tab label="Other Services" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ServiceList serviceType="sonarr" label="Sonarr" />
        <ServiceList serviceType="radarr" label="Radarr" />
        <ServiceList serviceType="lidarr" label="Lidarr" />
        <ServiceList serviceType="readarr" label="Readarr" />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ServiceList serviceType="sabnzbd" label="SABnzbd" />
        <ServiceList serviceType="nzbget" label="NZBGet" />
        <ServiceList serviceType="qbittorrent" label="qBittorrent" />
        <ServiceList serviceType="transmission" label="Transmission" />
        <ServiceList serviceType="deluge" label="Deluge" />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ServiceList serviceType="prowlarr" label="Prowlarr" />
        <ServiceList serviceType="jackett" label="Jackett" />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <ServiceList serviceType="overseerr" label="Overseerr" />
        <ServiceList serviceType="tautulli" label="Tautulli" />
        <ServiceList serviceType="unraid" label="Unraid" />
      </TabPanel>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingService ? 'Edit' : 'Add'} {currentServiceConfig?.label}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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
              />
            </Grid>
            {currentServiceConfig?.requiresApiKey && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  required
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
                    type="password"
                    label="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={currentServiceConfig?.passwordOnly}
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
              >
                {testStatus?.loading ? <CircularProgress size={24} /> : 'Test Connection'}
              </Button>
            </Grid>
            {testStatus && !testStatus.loading && (
              <Grid item xs={12}>
                <Alert
                  severity={testStatus.success ? 'success' : 'error'}
                  icon={testStatus.success ? <CheckCircle /> : <Error />}
                >
                  {testStatus.message}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Settings;
