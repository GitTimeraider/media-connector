import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
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

  // qBittorrent endpoints
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
  async addToDeluge(instanceId, url) {
    const response = await this.client.post(`/deluge/add/${instanceId}`, { url });
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
  async getTautulliActivity(instanceId) {
    const response = await this.client.get(`/tautulli/activity/${instanceId}`);
    return response.data;
  }

  // Prowlarr endpoints
  async searchProwlarr(instanceId, params) {
    const response = await this.client.get(`/prowlarr/search/${instanceId}`, { params });
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
