const express = require('express');
const router = express.Router();
const axios = require('axios');
const configManager = require('../config/services');

router.get('/instances', (req, res) => {
  const instances = configManager.getServices('unraid');
  res.json(instances);
});

router.get('/status/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

    // Get system info via GraphQL API
    const query = `
      query {
        info {
          os {
            platform
            distro
            release
            uptime
          }
          cpu {
            manufacturer
            brand
            cores
            threads
          }
          memory {
            total
            free
            used
          }
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`, 
      { query },
      { headers, timeout: 10000 }
    );

    res.json(response.data.data);
  } catch (error) {
    console.error('Unraid status error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/docker/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

    // Get Docker containers via GraphQL API
    const query = `
      query {
        dockerContainers {
          id
          names
          state
          status
          autoStart
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    res.json(response.data.data);
  } catch (error) {
    console.error('Unraid docker error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/vms/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

    // Get VMs via GraphQL API
    const query = `
      query {
        vms {
          name
          state
          autoStart
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    res.json(response.data.data);
  } catch (error) {
    console.error('Unraid VMs error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.get('/array/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

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
            size
            status
            temp
          }
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`,
      { query },
      { headers, timeout: 10000 }
    );

    res.json(response.data.data);
  } catch (error) {
    console.error('Unraid array error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

router.post('/docker/action/:instanceId', async (req, res) => {
  try {
    const instances = configManager.getServices('unraid');
    const instance = instances.find(i => i.id === req.params.instanceId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const headers = {
      'x-api-key': instance.apiKey,
      'Content-Type': 'application/json'
    };

    const { containerId, action } = req.body;
    
    // Use GraphQL mutation for docker actions
    const mutation = `
      mutation {
        dockerContainer${action.charAt(0).toUpperCase() + action.slice(1)}(id: "${containerId}") {
          id
          state
        }
      }
    `;

    const response = await axios.post(`${instance.url}/graphql`,
      { query: mutation },
      { headers, timeout: 10000 }
    );

    res.json(response.data.data);
  } catch (error) {
    console.error('Unraid docker action error:', error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

module.exports = router;
