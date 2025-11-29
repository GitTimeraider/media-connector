import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle auth errors
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(username, password) {
    const response = await this.client.post('/auth/login', { username, password });
    return response.data;
  }

  async guestLogin() {
    const response = await axios.get(`${API_BASE_URL}/auth/guest`);
    return response.data;
  }

  async verifyToken() {
    const response = await this.client.get('/auth/verify');
    return response.data;
  }

  async forgotPassword(username) {
    const response = await this.client.post('/auth/forgot-password', { username });
    return response.data;
  }

  // User management endpoints
  async getUsers() {
    const response = await this.client.get('/auth/users');
    return response.data;
  }

  async createUser(username, password, role) {
    const response = await this.client.post('/auth/users', { username, password, role });
    return response.data;
  }

  async updateUser(id, updates) {
    const response = await this.client.put(`/auth/users/${id}`, updates);
    return response.data;
  }

  async deleteUser(id) {
    const response = await this.client.delete(`/auth/users/${id}`);
    return response.data;
  }

  async resetUserPassword(id, password) {
    const response = await this.client.post(`/auth/users/${id}/reset-password`, { password });
    return response.data;
  }

  // Profile endpoints
  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  async updateProfile(updates) {
    const response = await this.client.put('/auth/profile', updates);
    return response.data;
  }

  // Config endpoints
  async getServices() {
    const response = await this.client.get('/config/services');
    return response.data;
  }

  async getServiceInstances(type) {
    const response = await this.client.get(`/config/services/${type}`);
    return response.data;
  }

  async addService(type, data) {
    const response = await this.client.post(`/config/services/${type}`, data);
    return response.data;
  }

  async updateService(type, id, data) {
    const response = await this.client.put(`/config/services/${type}/${id}`, data);
    return response.data;
  }

  async deleteService(type, id) {
    const response = await this.client.delete(`/config/services/${type}/${id}`);
    return response.data;
  }

  async testService(type, data) {
    const response = await this.client.post(`/config/test/${type}`, data);
    return response.data;
  }

  // Sonarr endpoints
  async getSonarrStatus(instanceId) {
    const response = await this.client.get(`/sonarr/status/${instanceId}`);
    return response.data;
  }

  async getSonarrSeries(instanceId) {
    const response = await this.client.get(`/sonarr/series/${instanceId}`);
    return response.data;
  }

  async searchSonarr(instanceId, term) {
    const response = await this.client.get(`/sonarr/search/${instanceId}`, { params: { term } });
    return response.data;
  }

  async addSonarrSeries(instanceId, data) {
    const response = await this.client.post(`/sonarr/series/${instanceId}`, data);
    return response.data;
  }

  async getSonarrQueue(instanceId) {
    const response = await this.client.get(`/sonarr/queue/${instanceId}`);
    return response.data;
  }

  async getSonarrQualityProfiles(instanceId) {
    const response = await this.client.get(`/sonarr/qualityprofile/${instanceId}`);
    return response.data;
  }

  async getSonarrRootFolders(instanceId) {
    const response = await this.client.get(`/sonarr/rootfolder/${instanceId}`);
    return response.data;
  }

  async getSonarrTags(instanceId) {
    const response = await this.client.get(`/sonarr/tag/${instanceId}`);
    return response.data;
  }

  // Radarr endpoints
  async getRadarrStatus(instanceId) {
    const response = await this.client.get(`/radarr/status/${instanceId}`);
    return response.data;
  }

  async getRadarrMovies(instanceId) {
    const response = await this.client.get(`/radarr/movie/${instanceId}`);
    return response.data;
  }

  async searchRadarr(instanceId, term) {
    const response = await this.client.get(`/radarr/search/${instanceId}`, { params: { term } });
    return response.data;
  }

  async addRadarrMovie(instanceId, data) {
    const response = await this.client.post(`/radarr/movie/${instanceId}`, data);
    return response.data;
  }

  async getRadarrQueue(instanceId) {
    const response = await this.client.get(`/radarr/queue/${instanceId}`);
    return response.data;
  }

  async getRadarrQualityProfiles(instanceId) {
    const response = await this.client.get(`/radarr/qualityprofile/${instanceId}`);
    return response.data;
  }

  async getRadarrRootFolders(instanceId) {
    const response = await this.client.get(`/radarr/rootfolder/${instanceId}`);
    return response.data;
  }

  async getRadarrTags(instanceId) {
    const response = await this.client.get(`/radarr/tag/${instanceId}`);
    return response.data;
  }

  // Lidarr endpoints
  async getLidarrStatus(instanceId) {
    const response = await this.client.get(`/lidarr/status/${instanceId}`);
    return response.data;
  }

  async getLidarrArtists(instanceId) {
    const response = await this.client.get(`/lidarr/artist/${instanceId}`);
    return response.data;
  }

  // Readarr endpoints
  async getReadarrStatus(instanceId) {
    const response = await this.client.get(`/readarr/status/${instanceId}`);
    return response.data;
  }

  async getReadarrAuthors(instanceId) {
    const response = await this.client.get(`/readarr/author/${instanceId}`);
    return response.data;
  }

  // SABnzbd endpoints
  async getSabnzbdStatus(instanceId) {
    const response = await this.client.get(`/sabnzbd/status/${instanceId}`);
    return response.data;
  }

  async getSabnzbdQueue(instanceId) {
    const response = await this.client.get(`/sabnzbd/queue/${instanceId}`);
    return response.data;
  }

  async pauseSabnzbd(instanceId) {
    const response = await this.client.post(`/sabnzbd/pause/${instanceId}`);
    return response.data;
  }

  async resumeSabnzbd(instanceId) {
    const response = await this.client.post(`/sabnzbd/resume/${instanceId}`);
    return response.data;
  }

  async addToSabnzbd(instanceId, url) {
    const response = await this.client.post(`/sabnzbd/add/${instanceId}`, { url });
    return response.data;
  }

  async deleteSabnzbd(instanceId, nzoId) {
    const response = await this.client.delete(`/sabnzbd/queue/${instanceId}/${nzoId}`);
    return response.data;
  }

  // NZBGet endpoints
  async getNzbgetStatus(instanceId) {
    const response = await this.client.get(`/nzbget/status/${instanceId}`);
    return response.data;
  }

  // qBittorrent endpoints
  async getQbittorrentStatus(instanceId) {
    const response = await this.client.get(`/qbittorrent/status/${instanceId}`);
    return response.data;
  }

  async getQbittorrentTorrents(instanceId) {
    const response = await this.client.get(`/qbittorrent/torrents/${instanceId}`);
    return response.data;
  }

  async addToQbittorrent(instanceId, url) {
    const response = await this.client.post(`/qbittorrent/add/${instanceId}`, { url });
    return response.data;
  }

  async pauseQbittorrent(instanceId, hash) {
    const response = await this.client.post(`/qbittorrent/pause/${instanceId}`, { hash });
    return response.data;
  }

  async deleteQbittorrent(instanceId, hash) {
    const response = await this.client.delete(`/qbittorrent/torrents/${instanceId}/${hash}`);
    return response.data;
  }

  // Deluge endpoints
  async getDelugeStatus(instanceId) {
    const response = await this.client.get(`/deluge/status/${instanceId}`);
    return response.data;
  }

  async addToDeluge(instanceId, url) {
    const response = await this.client.post(`/deluge/add/${instanceId}`, { url });
    return response.data;
  }

  // Transmission endpoints
  async getTransmissionStatus(instanceId) {
    const response = await this.client.get(`/transmission/status/${instanceId}`);
    return response.data;
  }

  // Overseerr endpoints
  async getOverseerrRequests(instanceId) {
    const response = await this.client.get(`/overseerr/requests/${instanceId}`);
    return response.data;
  }

  async searchOverseerr(instanceId, query) {
    const response = await this.client.get(`/overseerr/search/${instanceId}`, { params: { query } });
    return response.data;
  }

  // Tautulli endpoints
  async getTautulliStatus(instanceId) {
    const response = await this.client.get(`/tautulli/status/${instanceId}`);
    return response.data;
  }

  async getTautulliActivity(instanceId) {
    const response = await this.client.get(`/tautulli/activity/${instanceId}`);
    return response.data;
  }

  // Prowlarr endpoints
  async getProwlarrStatus(instanceId) {
    const response = await this.client.get(`/prowlarr/status/${instanceId}`);
    return response.data;
  }
  async searchProwlarr(instanceId, params) {
    const response = await this.client.get(`/prowlarr/search/${instanceId}`, { params });
    return response.data;
  }

  // TMDB endpoints
  async getTrendingContent() {
    const response = await this.client.get('/tmdb/trending');
    return response.data;
  }

  async getTrendingMovies() {
    const response = await this.client.get('/tmdb/trending/movies');
    return response.data;
  }

  async getTrendingTVShows() {
    const response = await this.client.get('/tmdb/trending/tv');
    return response.data;
  }

  async getPopularMovies() {
    const response = await this.client.get('/tmdb/movies/popular');
    return response.data;
  }

  async getUpcomingMovies() {
    const response = await this.client.get('/tmdb/movies/upcoming');
    return response.data;
  }

  async getPopularTVShows() {
    const response = await this.client.get('/tmdb/tv/popular');
    return response.data;
  }

  // Recent downloads
  async getRecentRadarrDownloads(instanceId) {
    const response = await this.client.get(`/radarr/recent/${instanceId}`);
    return response.data;
  }

  async getRecentSonarrDownloads(instanceId) {
    const response = await this.client.get(`/sonarr/recent/${instanceId}`);
    return response.data;
  }

  // Unraid endpoints
  async getUnraidStatus(instanceId) {
    const response = await this.client.get(`/unraid/status/${instanceId}`);
    return response.data;
  }

  async getUnraidDocker(instanceId) {
    const response = await this.client.get(`/unraid/docker/${instanceId}`);
    return response.data;
  }

  async getUnraidArray(instanceId) {
    const response = await this.client.get(`/unraid/array/${instanceId}`);
    return response.data;
  }

  async unraidDockerAction(instanceId, containerId, action) {
    const response = await this.client.post(`/unraid/docker/action/${instanceId}`, { containerId, action });
    return response.data;
  }

  // System endpoints
  async getSystemInfo() {
    const response = await this.client.get('/system/info');
    return response.data;
  }
}

const apiService = new ApiService();
export default apiService;
