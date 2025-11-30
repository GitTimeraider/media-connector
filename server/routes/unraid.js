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
    // Note: CPU usage and memory usage are NOT available in queries, only in subscriptions
    const query = `
      query {
        info {
          cpu {
            id
            manufacturer
            brand
            cores
            threads
            speed
            speedmax
            speedmin
          }
          memory {
            layout {
              size
              type
              bank
              clockSpeed
              manufacturer
            }
          }
          versions {
            core {
              unraid
              api
              kernel
            }
          }
          os {
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

    // GraphQL returns data in response.data.data
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Unraid docker error:', error.message);
    // Return empty data instead of 500 to prevent UI errors
    res.json({ dockerContainers: [] });
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
    
    // Use GraphQL mutation for docker actions
    // Unraid uses: dockerContainerStart, dockerContainerStop, dockerContainerRestart
    const actionName = action.charAt(0).toUpperCase() + action.slice(1);
    const mutation = `
      mutation {
        dockerContainer${actionName}(id: "${containerId}") {
          id
          state
        }
      }
    `;

    console.log('Sending mutation:', mutation);

    const response = await axios.post(`${instance.url}/graphql`,
      { query: mutation },
      { headers, timeout: 10000 }
    );

    console.log('Docker action response:', response.data);
    res.json(response.data.data || response.data);
  } catch (error) {
    console.error('Unraid docker action error:', error.message);
    console.error('Error response:', error.response?.data);
    res.status(500).json({ 
      error: error.message, 
      details: error.response?.data,
      graphqlErrors: error.response?.data?.errors 
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
