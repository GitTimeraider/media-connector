const axios = require('axios');
const urlValidator = require('./urlValidator');

class ApiClient {
  constructor(baseURL, apiKey, options = {}) {
    // Validate baseURL for SSRF protection
    const validation = urlValidator.validateServiceUrl(baseURL);
    if (!validation.valid) {
      throw new Error(`Invalid baseURL: ${validation.error}`);
    }

    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: options.timeout || 30000,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      config => {
        console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      error => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          console.error('API Error: No response received');
        } else {
          console.error('API Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Validate endpoint to prevent SSRF - must be relative path
  validateEndpoint(endpoint) {
    if (!endpoint.startsWith('/')) {
      throw new Error('Endpoint must be a relative path starting with /');
    }
    // Prevent absolute URLs or protocol-relative URLs
    if (endpoint.includes('://') || endpoint.startsWith('//')) {
      throw new Error('Endpoint cannot contain absolute URLs');
    }
    return endpoint;
  }

  async get(endpoint, params = {}) {
    this.validateEndpoint(endpoint);
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post(endpoint, data = {}) {
    this.validateEndpoint(endpoint);
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put(endpoint, data = {}) {
    this.validateEndpoint(endpoint);
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async delete(endpoint) {
    this.validateEndpoint(endpoint);
    const response = await this.client.delete(endpoint);
    return response.data;
  }
}

module.exports = ApiClient;
