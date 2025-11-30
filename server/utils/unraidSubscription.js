const WebSocket = require('ws');
const { EventEmitter } = require('events');

class UnraidSubscriptionManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // instanceId -> { ws, subscriptions }
  }

  async subscribe(instanceId, url, apiKey) {
    // Close existing connection if any
    if (this.connections.has(instanceId)) {
      this.unsubscribe(instanceId);
    }

    try {
      // Convert http(s) URL to ws(s)
      const wsUrl = url.replace(/^http/, 'ws') + '/graphql';
      
      console.log(`Connecting to Unraid WebSocket: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl, {
        headers: {
          'x-api-key': apiKey,
          'Sec-WebSocket-Protocol': 'graphql-ws'
        }
      });

      // GraphQL WebSocket subprotocol initialization
      ws.on('open', () => {
        console.log(`WebSocket connected to Unraid instance ${instanceId}`);
        
        // Send connection_init message
        ws.send(JSON.stringify({
          type: 'connection_init',
          payload: {}
        }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'connection_ack':
              console.log(`Connection acknowledged for instance ${instanceId}`);
              // Start subscription after connection is acknowledged
              this.startSystemStatsSubscription(ws, instanceId);
              break;
              
            case 'data':
              // Emit system stats data
              if (message.payload && message.payload.data) {
                this.emit(`stats:${instanceId}`, message.payload.data);
              }
              break;
              
            case 'error':
              console.error(`WebSocket error for instance ${instanceId}:`, message.payload);
              this.emit(`error:${instanceId}`, message.payload);
              break;
              
            case 'complete':
              console.log(`Subscription complete for instance ${instanceId}`);
              break;
              
            default:
              console.log(`Unknown message type: ${message.type}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for instance ${instanceId}:`, error.message);
        this.emit(`error:${instanceId}`, error);
      });

      ws.on('close', () => {
        console.log(`WebSocket closed for instance ${instanceId}`);
        this.connections.delete(instanceId);
        this.emit(`close:${instanceId}`);
      });

      this.connections.set(instanceId, { ws, subscriptions: new Set() });
      
      return true;
    } catch (error) {
      console.error(`Failed to connect WebSocket for instance ${instanceId}:`, error);
      throw error;
    }
  }

  startSystemStatsSubscription(ws, instanceId) {
    const subscriptionId = 'system-stats';
    
    // GraphQL subscription query for real-time system stats
    const query = `
      subscription {
        info {
          cpu {
            manufacturer
            brand
            cores
            threads
            speed
            usage
            temperature
          }
          memory {
            total
            free
            used
            active
            available
          }
          os {
            uptime
            hostname
            distro
            release
          }
        }
      }
    `;

    const message = {
      id: subscriptionId,
      type: 'start',
      payload: {
        query: query,
        variables: {}
      }
    };

    ws.send(JSON.stringify(message));
    
    const connection = this.connections.get(instanceId);
    if (connection) {
      connection.subscriptions.add(subscriptionId);
    }
    
    console.log(`Started system stats subscription for instance ${instanceId}`);
  }

  unsubscribe(instanceId) {
    const connection = this.connections.get(instanceId);
    if (connection) {
      // Stop all subscriptions
      connection.subscriptions.forEach(subId => {
        connection.ws.send(JSON.stringify({
          id: subId,
          type: 'stop'
        }));
      });
      
      // Close WebSocket
      connection.ws.close();
      this.connections.delete(instanceId);
      
      console.log(`Unsubscribed from instance ${instanceId}`);
    }
  }

  unsubscribeAll() {
    this.connections.forEach((_, instanceId) => {
      this.unsubscribe(instanceId);
    });
  }

  isConnected(instanceId) {
    const connection = this.connections.get(instanceId);
    return connection && connection.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = UnraidSubscriptionManager;
