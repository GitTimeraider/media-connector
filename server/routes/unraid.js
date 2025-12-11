const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');
const urlValidator = require('../utils/urlValidator');

// Helper function to validate instance URL
function validateInstanceUrl(instance) {
  const validation = urlValidator.validateServiceUrl(instance.url);
  if (!validation.valid) {
    throw new Error(`Invalid instance URL: ${validation.error}`);
  }
  return validation.url;
}

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('unraid');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    // Validate URL for SSRF protection
    validateInstanceUrl(instance);

    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key to headers if available
    if (instance.apiKey) {
      headers['x-api-key'] = instance.apiKey;
      headers['Authorization'] = `Bearer ${instance.apiKey}`;
    }

    // Get system info and metrics via GraphQL API
    // Note: info contains hardware specs, metrics contains live utilization data
    const query = `
      query {
        info {
          cpu {
            brand
            cores
            threads
            speed
          }
          memory {
            layout {
              size
              type
              clockSpeed
            }
          }
          os {
            hostname
            distro
            release
            platform
            uptime
          }
          system {
            manufacturer
            model
          }
        }
        metrics {
          cpu {
            percentTotal
          }
          memory {
            total
            used
            free
            available
            percentTotal
          }
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`, 
      { query },
      { headers, timeout: 10000 }
    );

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Unraid status error:', error.message);
    console.error('Full error:', error.response?.data || error);
    // Return empty data instead of 500 to prevent UI errors
    res.json({ info: null, metrics: null });
  }
});

router.get('/docker/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    validateInstanceUrl(instance);

    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key to headers if available
    if (instance.apiKey) {
      headers['x-api-key'] = instance.apiKey;
      headers['Authorization'] = `Bearer ${instance.apiKey}`;
    }

    // Get Docker containers via GraphQL API
    const query = `
      query {
        docker {
          containers {
            id
            names
            image
            state
            status
            autoStart
          }
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Unraid docker error:', error.message);
    console.error('Full error:', error.response?.data || error);
    // Return empty data instead of 500 to prevent UI errors
    res.json({ docker: { containers: [] } });
  }
});

router.get('/vms/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    validateInstanceUrl(instance);

    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (instance.apiKey) {
      headers['x-api-key'] = instance.apiKey;
      headers['Authorization'] = `Bearer ${instance.apiKey}`;
    }

    // Get VMs via GraphQL API
    const query = `
      query {
        vms {
          domains {
            id
            uuid
            name
            state
            autoStart
          }
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Unraid VMs error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/array/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    validateInstanceUrl(instance);

    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (instance.apiKey) {
      headers['x-api-key'] = instance.apiKey;
      headers['Authorization'] = `Bearer ${instance.apiKey}`;
    }

    // Get array status via GraphQL API
    const query = `
      query {
        array {
          state
          capacity {
            disks {
              free
              used
              total
            }
          }
          disks {
            name
            device
            size
            status
            temp
            type
          }
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Unraid array error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.post('/docker/action/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    validateInstanceUrl(instance);

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

    const { containerId, action } = req.body;
    
    console.log('[Unraid Docker] Received action request:', { containerId, action, type: typeof containerId });
    
    // Validate action to prevent GraphQL injection
    const validActions = ['start', 'stop'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be start or stop' });
    }
    
    // Validate containerId - must be provided and be a non-empty string
    // Unraid uses PrefixedID format like "docker/container/abc123" or Docker hashes
    if (!containerId || typeof containerId !== 'string' || containerId.trim().length === 0) {
      console.error('[Unraid Docker] Invalid containerId:', containerId);
      return res.status(400).json({ error: 'Container ID is required', received: containerId });
    }
    
    // Validate containerId format - be permissive but block obvious injection attempts
    // Allow: alphanumeric, slashes, underscores, hyphens, dots, colons, @, spaces (container names can have spaces)
    // Block: quotes, semicolons, backticks, angle brackets (GraphQL/command injection)
    if (/['"`;><\\{}[\]|&$()!*?]/.test(containerId)) {
      console.error('[Unraid Docker] Container ID contains forbidden characters:', containerId);
      return res.status(400).json({ error: 'Container ID contains invalid characters', received: containerId });
    }
    
    // Additional length check to prevent abuse
    if (containerId.length > 200) {
      return res.status(400).json({ error: 'Container ID too long' });
    }
    
    // First get the container to find its actual name
    const containerQuery = `
      query {
        docker {
          containers {
            id
            names
            state
          }
        }
      }
    `;
    
    const containerResponse = await axios.post(`${instance.url}/graphql`,
      { query: containerQuery },
      { headers, timeout: 10000 }
    );
    
    const containers = containerResponse.data?.data?.docker?.containers || [];
    const container = containers.find(c => c.id === containerId);
    
    if (!container) {
      console.error('[Unraid Docker] Container not found:', containerId);
      return res.status(404).json({ error: 'Container not found', containerId });
    }
    
    // Get the container name (first name without leading slash)
    const containerName = (container.names[0] || '').replace(/^\//, '');
    
    // Use GraphQL mutation for docker actions with variables (prevents injection)
    // Try multiple mutation formats to find the one Unraid accepts
    const actionCap = action.charAt(0).toUpperCase() + action.slice(1);
    
    // Based on error messages:
    // - Field "stop" must have a selection of subfields
    // - Argument "id" of type "PrefixedID!" is required
    // - Unknown argument "name"
    const mutationFormats = [
      // Format 1: With ID and subfields using variables (secure)
      { query: `mutation DockerAction($id: String!) { docker { ${action}(id: $id) { id name state } } }`, variables: { id: containerId } },
      // Format 2: Try with just id and name as subfields
      { query: `mutation DockerAction($id: String!) { docker { ${action}(id: $id) { id name } } }`, variables: { id: containerId } },
      // Format 3: Try with all possible subfields
      { query: `mutation DockerAction($id: String!) { docker { ${action}(id: $id) { id names image state status autoStart } } }`, variables: { id: containerId } },
      // Format 4: Try capitalized action
      { query: `mutation DockerAction($id: String!) { docker { ${actionCap}(id: $id) { id name state } } }`, variables: { id: containerId } },
      // Format 5: Try different subfield selection
      { query: `mutation DockerAction($id: String!) { docker { ${action}(id: $id) { id } } }`, variables: { id: containerId } },
    ];

    console.log('[Unraid Docker] Action on container:', action, containerName);

    let response;
    let lastError;
    
    try {
      for (let i = 0; i < mutationFormats.length; i++) {
        const mutationData = mutationFormats[i];
        
        try {
          response = await axios.post(`${instance.url}/graphql`,
            mutationData,
            { headers, timeout: 10000 }
          );
          
          // Check if response has errors
          if (response.data && response.data.errors) {
            lastError = response.data.errors[0];
            continue; // Try next format
          }
          
          // Success!
          console.log('[Unraid Docker] Successfully completed action:', action, containerName);
          break;
          
        } catch (axiosError) {
          if (axiosError.response?.data) {
            lastError = axiosError.response.data;
          } else {
            lastError = axiosError.message;
          }
          // Try next format
          continue;
        }
      }
    } catch (loopError) {
      console.error('[Unraid Docker] Unexpected error in mutation loop:', loopError);
      return res.status(500).json({ 
        error: 'Unexpected error during Docker action',
        message: loopError.message,
        container: { id: containerId, name: containerName },
        action: action
      });
    }
    
    // If all attempts failed
    if (!response || (response.data && response.data.errors)) {
      console.error('[Unraid Docker] Failed action:', action, containerName, lastError?.message || lastError);
      return res.status(500).json({ 
        error: `Docker action failed - unable to ${action} container`,
        lastError: lastError,
        container: { name: containerName },
        action: action
      });
    }
    
    // Check for GraphQL errors in response
    if (response && response.data && response.data.errors) {
      console.error('[Unraid Docker] GraphQL errors:', JSON.stringify(response.data.errors, null, 2));
      return res.status(400).json({
        error: 'GraphQL mutation failed',
        graphqlErrors: response.data.errors,
        container: { id: containerId, name: containerName },
        action: action
      });
    }
    
    if (response && response.data) {
      console.log('[Unraid Docker] Action successful');
      return res.json(response.data.data || response.data);
    }
    
    // Should not reach here, but just in case
    console.error('[Unraid Docker] No response received');
    return res.status(500).json({ 
      error: 'No response from Unraid server',
      container: { id: containerId, name: containerName },
      action: action
    });
    
  } catch (error) {
    // This is the outer catch for any unexpected errors
    console.error('[Unraid Docker] Unexpected error:', error.message);
    console.error('[Unraid Docker] Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Unexpected server error',
      message: error.message,
      container: { id: containerId, name: containerName },
      action: action
    });
  }
});

// Start real-time subscription for instance
router.post('/subscribe/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });
    validateInstanceUrl(instance);

    // Get the UnraidSubscriptionManager from app locals (set in server/index.js)
    const unraidManager = req.app.locals.unraidManager;
    
    // Subscribe to real-time stats
    unraidManager.subscribe(req.params.instanceId, instance.url, instance.apiKey);
    
    res.json({ success: true, instanceId: req.params.instanceId });
  } catch (error) {
    console.error('Unraid subscription error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Stop real-time subscription for instance
router.delete('/subscribe/:instanceId', async (req, res) => {
  try {
    const unraidManager = req.app.locals.unraidManager;
    unraidManager.unsubscribe(req.params.instanceId);
    
    res.json({ success: true, instanceId: req.params.instanceId });
  } catch (error) {
    console.error('Unraid unsubscribe error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
