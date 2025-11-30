const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', async (req, res) => {
  const instances = await configManager.getServices('unraid');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key to headers if available
    if (instance.apiKey) {
      headers['x-api-key'] = instance.apiKey;
      headers['Authorization'] = `Bearer ${instance.apiKey}`;
    }

    // Get system info via GraphQL API
    const query = `
      query {
        info {
          cpu {
            manufacturer
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
        }
      }
    `;

    console.log(`Attempting Unraid status request to: ${instance.url}/graphql`);
    
    const response = await axios.post(`${instance.url}/graphql`, 
      { query },
      { headers, timeout: 10000 }
    );

    console.log('Unraid status response:', JSON.stringify(response.data, null, 2));

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Unraid status error:', error.message);
    // Return empty data instead of 500 to prevent UI errors
    res.json({ info: null });
  }
});

router.get('/docker/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

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

    console.log(`Attempting Unraid docker request to: ${instance.url}/graphql`);

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    console.log('Unraid docker response:', JSON.stringify(response.data, null, 2));

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      const containers = response.data.data.docker?.containers || [];
      console.log(`Found ${containers.length} Docker containers`);
      res.json(response.data.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Unraid docker error:', error.message);
    console.error('Error details:', error.response?.data);
    // Return empty data instead of 500 to prevent UI errors
    res.json({ docker: { containers: [] } });
  }
});

router.get('/vms/:instanceId', async (req, res) => {
  try {
    const instances = await configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

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

    console.log(`Attempting Unraid VMs request to: ${instance.url}/graphql`);

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

    console.log(`Attempting Unraid array request to: ${instance.url}/graphql`);

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

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

    const { containerId, action } = req.body;
    
    console.log('Docker action request:', { containerId, action, instanceId: req.params.instanceId });
    
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
      console.error('Container not found:', containerId);
      return res.status(404).json({ error: 'Container not found', containerId });
    }
    
    // Get the container name (first name without leading slash)
    const containerName = (container.names[0] || '').replace(/^\//, '');
    console.log('Found container:', { id: container.id, name: containerName, state: container.state });
    
    // Use GraphQL mutation for docker actions
    // Try multiple mutation formats to find the one Unraid accepts
    const actionCap = action.charAt(0).toUpperCase() + action.slice(1);
    
    const mutationFormats = [
      // Format 1: Nested under docker with action as method
      `mutation { docker { ${action}(name: "${containerName}") } }`,
      // Format 2: Nested with capitalized action
      `mutation { docker { ${actionCap}(name: "${containerName}") } }`,
      // Format 3: Direct mutation lowercase
      `mutation { ${action}(name: "${containerName}") }`,
      // Format 4: Direct mutation capitalized
      `mutation { ${actionCap}(name: "${containerName}") }`,
      // Format 5: With container prefix
      `mutation { docker { container${actionCap}(name: "${containerName}") } }`,
      // Format 6: Try with ID instead of name
      `mutation { docker { ${action}(id: "${containerId}") } }`,
    ];

    console.log('[Unraid Docker] Attempting action:', action);
    console.log('[Unraid Docker] Container ID:', containerId);
    console.log('[Unraid Docker] Container name:', containerName);

    let response;
    let lastError;
    
    try {
      for (let i = 0; i < mutationFormats.length; i++) {
        const mutation = mutationFormats[i];
        console.log(`[Unraid Docker] Attempt ${i + 1}/${mutationFormats.length}:`, mutation);
        
        try {
          response = await axios.post(`${instance.url}/graphql`,
            { query: mutation },
            { headers, timeout: 10000 }
          );
          
          // Check if response has errors
          if (response.data && response.data.errors) {
            console.error(`[Unraid Docker] Attempt ${i + 1} - GraphQL errors:`, JSON.stringify(response.data.errors, null, 2));
            lastError = response.data.errors[0];
            continue; // Try next format
          }
          
          // Success!
          console.log(`[Unraid Docker] Attempt ${i + 1} succeeded!`, JSON.stringify(response.data, null, 2));
          break;
          
        } catch (axiosError) {
          console.error(`[Unraid Docker] Attempt ${i + 1} failed:`, axiosError.message);
          if (axiosError.response?.data) {
            console.error(`[Unraid Docker] Error data:`, JSON.stringify(axiosError.response.data, null, 2));
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
      console.error('[Unraid Docker] All mutation formats failed');
      return res.status(500).json({ 
        error: 'Docker action failed - all mutation formats rejected',
        lastError: lastError,
        container: { id: containerId, name: containerName },
        action: action,
        triedFormats: mutationFormats
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
