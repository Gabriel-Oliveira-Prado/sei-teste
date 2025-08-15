import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3001'; // Em produção, usar IP do servidor

class ApiService {
  constructor() {
    this.baseURL = `${API_URL}/api`;
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        },
        ...options
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Erro na requisição');
      }
    } catch (error) {
      console.error('Erro na API:', error);
      throw error;
    }
  }

  // Dashboard
  async getDashboardOverview() {
    return await this.makeRequest('/dashboard/overview');
  }

  async getMapData() {
    return await this.makeRequest('/dashboard/map-data');
  }

  async getRecentAlerts(limit = 10) {
    return await this.makeRequest(`/dashboard/recent-alerts?limit=${limit}`);
  }

  async getReadingsTimeline(hours = 24, sensorId = null) {
    const params = new URLSearchParams({ hours });
    if (sensorId) params.append('sensor_id', sensorId);
    
    return await this.makeRequest(`/dashboard/charts/readings-timeline?${params}`);
  }

  async getSystemHealth() {
    return await this.makeRequest('/dashboard/system-health');
  }

  // Sensores
  async getSensors() {
    return await this.makeRequest('/sensors');
  }

  async getSensor(sensorId) {
    return await this.makeRequest(`/sensors/${sensorId}`);
  }

  async getSensorReadings(sensorId, params = {}) {
    const queryParams = new URLSearchParams(params);
    return await this.makeRequest(`/sensors/${sensorId}/readings?${queryParams}`);
  }

  // Alertas
  async getAlerts(params = {}) {
    const queryParams = new URLSearchParams(params);
    return await this.makeRequest(`/alerts?${queryParams}`);
  }

  async getAlert(alertId) {
    return await this.makeRequest(`/alerts/${alertId}`);
  }

  async getAlertStats() {
    return await this.makeRequest('/alerts/stats');
  }

  async acknowledgeAlert(alertId) {
    return await this.makeRequest(`/alerts/${alertId}/acknowledge`, {
      method: 'PUT'
    });
  }

  async resolveAlert(alertId) {
    return await this.makeRequest(`/alerts/${alertId}/resolve`, {
      method: 'PUT'
    });
  }

  // Relatórios
  async getSensorReport(params = {}) {
    const queryParams = new URLSearchParams(params);
    return await this.makeRequest(`/reports/sensors?${queryParams}`);
  }

  async getAlertReport(params = {}) {
    const queryParams = new URLSearchParams(params);
    return await this.makeRequest(`/reports/alerts?${queryParams}`);
  }

  async getPerformanceReport(params = {}) {
    const queryParams = new URLSearchParams(params);
    return await this.makeRequest(`/reports/performance?${queryParams}`);
  }

  async getSummaryReport(period = 7) {
    return await this.makeRequest(`/reports/summary?period=${period}`);
  }

  // Health check
  async getHealthCheck() {
    return await this.makeRequest('/health');
  }
}

export const apiService = new ApiService();

