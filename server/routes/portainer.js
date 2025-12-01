const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');
const urlValidator = require('../utils/urlValidator');

// Helper function to validate instance URL and return safe URL
function getValidatedUrl(instance) {
  const validation = urlValidator.validateServiceUrl(instance.url);
  if (!validation.valid) {
    throw new Error(`Invalid instance URL: ${validation.error}`);
  }
  return validation.url;
}

// Helper function to build safe URL path
function buildSafeUrl(baseUrl, path) {
  // Use URL constructor to safely join paths
  const url = new URL(path, baseUrl);
  return url.toString();
}

// Helper function to get Portainer headers
function getHeaders(instance) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Portainer uses X-API-Key for access tokens
  if (instance.apiKey) {
    headers['X-API-Key'] = instance.apiKey;
  }
  
  return headers;
}

// Get all Portainer instances
router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('portainer');
  res.json(instances);
});

// Test connection to Portainer
router.get('/test/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('portainer');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // SSRF Protection: Validate and use the sanitized URL
    const validatedUrl = getValidatedUrl(instance);
    const headers = getHeaders(instance);

    // Get Portainer status/info
    const safeUrl = buildSafeUrl(validatedUrl, '/api/status');
    const response = await axios.get(safeUrl, {
      headers,
      timeout: 10000
    });

    res.json({ 
      status: 'connected', 
      version: response.data?.Version,
      instanceId: response.data?.InstanceID
    });
  } catch (error) {
    console.error('Portainer test error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get Portainer status and system info
router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('portainer');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // SSRF Protection: Validate and use the sanitized URL
    const validatedUrl = getValidatedUrl(instance);
    const headers = getHeaders(instance);

    // Get Portainer status
    const statusUrl = buildSafeUrl(validatedUrl, '/api/status');
    const statusResponse = await axios.get(statusUrl, {
      headers,
      timeout: 10000
    });

    // Get endpoints (environments) to find Docker hosts
    const endpointsUrl = buildSafeUrl(validatedUrl, '/api/endpoints');
    const endpointsResponse = await axios.get(endpointsUrl, {
      headers,
      timeout: 10000
    });

    res.json({
      status: statusResponse.data,
      endpoints: endpointsResponse.data || []
    });
  } catch (error) {
    console.error('Portainer status error:', error.message);
    res.json({ status: null, endpoints: [] });
  }
});

// Get system info for a specific endpoint
router.get('/system/:instanceId/:endpointId', async (req, res) => {
  try {
    const instances = await configManager.getServices('portainer');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // SSRF Protection: Validate and use the sanitized URL
    const validatedUrl = getValidatedUrl(instance);
    const headers = getHeaders(instance);
    
    // Validate endpointId - must be a number
    const endpointId = parseInt(req.params.endpointId, 10);
    if (isNaN(endpointId) || endpointId < 0) {
      return res.status(400).json({ error: 'Invalid endpoint ID' });
    }

    // Get Docker system info via Portainer API proxy
    const infoUrl = buildSafeUrl(validatedUrl, `/api/endpoints/${endpointId}/docker/info`);
    const versionUrl = buildSafeUrl(validatedUrl, `/api/endpoints/${endpointId}/docker/version`);
    
    const [infoResponse, versionResponse] = await Promise.allSettled([
      axios.get(infoUrl, { headers, timeout: 10000 }),
      axios.get(versionUrl, { headers, timeout: 10000 })
    ]);

    const info = infoResponse.status === 'fulfilled' ? infoResponse.value.data : null;
    const version = versionResponse.status === 'fulfilled' ? versionResponse.value.data : null;

    // Calculate CPU and memory from Docker info
    const systemInfo = {
      hostname: info?.Name || 'Unknown',
      os: info?.OperatingSystem || 'Unknown',
      architecture: info?.Architecture || 'Unknown',
      kernelVersion: info?.KernelVersion || 'Unknown',
      dockerVersion: version?.Version || info?.ServerVersion || 'Unknown',
      cpus: info?.NCPU || 0,
      memoryTotal: info?.MemTotal || 0,
      containers: {
        total: info?.Containers || 0,
        running: info?.ContainersRunning || 0,
        paused: info?.ContainersPaused || 0,
        stopped: info?.ContainersStopped || 0
      },
      images: info?.Images || 0
    };

    res.json(systemInfo);
  } catch (error) {
    console.error('Portainer system info error:', error.message);
    res.json(null);
  }
});

// Get containers for a specific endpoint
router.get('/containers/:instanceId/:endpointId', async (req, res) => {
  try {
    const instances = await configManager.getServices('portainer');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // SSRF Protection: Validate and use the sanitized URL
    const validatedUrl = getValidatedUrl(instance);
    const headers = getHeaders(instance);
    
    // Validate endpointId - must be a number
    const endpointId = parseInt(req.params.endpointId, 10);
    if (isNaN(endpointId) || endpointId < 0) {
      return res.status(400).json({ error: 'Invalid endpoint ID' });
    }

    // Get all containers via Portainer API proxy to Docker API
    const containersUrl = buildSafeUrl(validatedUrl, `/api/endpoints/${endpointId}/docker/containers/json`);
    const response = await axios.get(containersUrl, {
      headers,
      timeout: 10000,
      params: {
        all: true // Include stopped containers
      }
    });

    // Map Docker container format to our simplified format
    const containers = (response.data || []).map(container => ({
      id: container.Id,
      names: container.Names || [],
      image: container.Image,
      state: container.State,
      status: container.Status,
      created: container.Created,
      ports: container.Ports || []
    }));

    res.json({ containers });
  } catch (error) {
    console.error('Portainer containers error:', error.message);
    res.json({ containers: [] });
  }
});

// Container action (start/stop)
router.post('/container/action/:instanceId/:endpointId', async (req, res) => {
  try {
    const instances = await configManager.getServices('portainer');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // SSRF Protection: Validate and use the sanitized URL
    const validatedUrl = getValidatedUrl(instance);
    const headers = getHeaders(instance);
    
    // Validate endpointId - must be a number
    const endpointId = parseInt(req.params.endpointId, 10);
    if (isNaN(endpointId) || endpointId < 0) {
      return res.status(400).json({ error: 'Invalid endpoint ID' });
    }
    
    const { containerId, action } = req.body;

    // Validate action
    const validActions = ['start', 'stop', 'restart', 'pause', 'unpause'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be: start, stop, restart, pause, or unpause' });
    }

    // Validate containerId
    if (!containerId || typeof containerId !== 'string' || containerId.trim().length === 0) {
      return res.status(400).json({ error: 'Container ID is required' });
    }

    // Validate containerId format - Docker container IDs are hex strings
    if (!/^[a-zA-Z0-9]+$/.test(containerId)) {
      return res.status(400).json({ error: 'Invalid container ID format' });
    }

    // Execute the action via Portainer API proxy to Docker API
    const actionUrl = buildSafeUrl(validatedUrl, `/api/endpoints/${endpointId}/docker/containers/${containerId}/${action}`);
    await axios.post(actionUrl, {}, { headers, timeout: 15000 });

    res.json({ success: true, action, containerId });
  } catch (error) {
    console.error('Portainer container action error:', error.message);
    
    // Handle specific Docker errors
    if (error.response?.status === 304) {
      // Container already in desired state
      return res.json({ success: true, action: req.body.action, containerId: req.body.containerId, message: 'Container already in desired state' });
    }
    
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || error.message 
    });
  }
});

// Get container stats (CPU/Memory usage)
router.get('/container/stats/:instanceId/:endpointId/:containerId', async (req, res) => {
  try {
    const instances = await configManager.getServices('portainer');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // SSRF Protection: Validate and use the sanitized URL
    const validatedUrl = getValidatedUrl(instance);
    const headers = getHeaders(instance);
    
    // Validate endpointId - must be a number
    const endpointId = parseInt(req.params.endpointId, 10);
    if (isNaN(endpointId) || endpointId < 0) {
      return res.status(400).json({ error: 'Invalid endpoint ID' });
    }
    
    const { containerId } = req.params;

    // Validate containerId format - Docker container IDs are hex strings
    if (!containerId || !/^[a-zA-Z0-9]+$/.test(containerId)) {
      return res.status(400).json({ error: 'Invalid container ID format' });
    }

    // Get container stats (one-shot, not streaming)
    const statsUrl = buildSafeUrl(validatedUrl, `/api/endpoints/${endpointId}/docker/containers/${containerId}/stats`);
    const response = await axios.get(statsUrl, {
        headers,
        timeout: 10000,
        params: {
          stream: false
        }
      }
    );

    const stats = response.data;
    
    // Calculate CPU percentage
    const cpuDelta = stats.cpu_stats?.cpu_usage?.total_usage - stats.precpu_stats?.cpu_usage?.total_usage;
    const systemDelta = stats.cpu_stats?.system_cpu_usage - stats.precpu_stats?.system_cpu_usage;
    const cpuCount = stats.cpu_stats?.online_cpus || stats.cpu_stats?.cpu_usage?.percpu_usage?.length || 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

    // Calculate memory percentage
    const memUsage = stats.memory_stats?.usage || 0;
    const memLimit = stats.memory_stats?.limit || 1;
    const memPercent = (memUsage / memLimit) * 100;

    res.json({
      cpu: {
        percent: cpuPercent.toFixed(2)
      },
      memory: {
        usage: memUsage,
        limit: memLimit,
        percent: memPercent.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Portainer container stats error:', error.message);
    res.json({ cpu: { percent: 0 }, memory: { usage: 0, limit: 0, percent: 0 } });
  }
});

// Get stacks for a specific endpoint
router.get('/stacks/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('portainer');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // SSRF Protection: Validate and use the sanitized URL
    const validatedUrl = getValidatedUrl(instance);
    const headers = getHeaders(instance);

    const stacksUrl = buildSafeUrl(validatedUrl, '/api/stacks');
    const response = await axios.get(stacksUrl, {
      headers,
      timeout: 10000
    });

    res.json(response.data || []);
  } catch (error) {
    console.error('Portainer stacks error:', error.message);
    res.json([]);
  }
});

module.exports = router;
