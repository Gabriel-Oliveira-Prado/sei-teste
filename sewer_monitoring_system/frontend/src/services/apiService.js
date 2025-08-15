import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Interceptor para adicionar token automaticamente
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Interceptor para lidar com respostas
    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Dashboard
  async getDashboardOverview() {
    const response = await this.api.get('/dashboard/overview')
    return response.data
  }

  async getMapData() {
    const response = await this.api.get('/dashboard/map-data')
    return response.data
  }

  async getRecentAlerts(limit = 10) {
    const response = await this.api.get(`/dashboard/recent-alerts?limit=${limit}`)
    return response.data
  }

  async getReadingsTimeline(hours = 24, sensorId = null) {
    const params = new URLSearchParams({ hours })
    if (sensorId) params.append('sensor_id', sensorId)
    
    const response = await this.api.get(`/dashboard/charts/readings-timeline?${params}`)
    return response.data
  }

  async getAlertDistribution(days = 7) {
    const response = await this.api.get(`/dashboard/charts/alert-distribution?days=${days}`)
    return response.data
  }

  async getSystemHealth() {
    const response = await this.api.get('/dashboard/system-health')
    return response.data
  }

  // Sensores
  async getSensors() {
    const response = await this.api.get('/sensors')
    return response.data
  }

  async getSensor(sensorId) {
    const response = await this.api.get(`/sensors/${sensorId}`)
    return response.data
  }

  async getSensorReadings(sensorId, params = {}) {
    const queryParams = new URLSearchParams(params)
    const response = await this.api.get(`/sensors/${sensorId}/readings?${queryParams}`)
    return response.data
  }

  async createSensor(sensorData) {
    const response = await this.api.post('/sensors', sensorData)
    return response.data
  }

  async updateSensor(sensorId, sensorData) {
    const response = await this.api.put(`/sensors/${sensorId}`, sensorData)
    return response.data
  }

  async sendSensorReading(sensorId, readingData) {
    const response = await this.api.post(`/sensors/${sensorId}/readings`, {
      reading_data: readingData
    })
    return response.data
  }

  // Alertas
  async getAlerts(params = {}) {
    const queryParams = new URLSearchParams(params)
    const response = await this.api.get(`/alerts?${queryParams}`)
    return response.data
  }

  async getAlert(alertId) {
    const response = await this.api.get(`/alerts/${alertId}`)
    return response.data
  }

  async getAlertStats() {
    const response = await this.api.get('/alerts/stats')
    return response.data
  }

  async createAlert(alertData) {
    const response = await this.api.post('/alerts', alertData)
    return response.data
  }

  async acknowledgeAlert(alertId) {
    const response = await this.api.put(`/alerts/${alertId}/acknowledge`)
    return response.data
  }

  async resolveAlert(alertId) {
    const response = await this.api.put(`/alerts/${alertId}/resolve`)
    return response.data
  }

  // Relatórios
  async getSensorReport(params = {}) {
    const queryParams = new URLSearchParams(params)
    const response = await this.api.get(`/reports/sensors?${queryParams}`)
    return response.data
  }

  async getAlertReport(params = {}) {
    const queryParams = new URLSearchParams(params)
    const response = await this.api.get(`/reports/alerts?${queryParams}`)
    return response.data
  }

  async getPerformanceReport(params = {}) {
    const queryParams = new URLSearchParams(params)
    const response = await this.api.get(`/reports/performance?${queryParams}`)
    return response.data
  }

  async getSummaryReport(period = 7) {
    const response = await this.api.get(`/reports/summary?period=${period}`)
    return response.data
  }

  async exportReport(reportType, format = 'json', filters = {}) {
    const response = await this.api.post('/reports/export', {
      report_type: reportType,
      format,
      filters
    })
    return response.data
  }

  // Health check
  async getHealthCheck() {
    const response = await this.api.get('/health')
    return response.data
  }
}

export const apiService = new ApiService()

