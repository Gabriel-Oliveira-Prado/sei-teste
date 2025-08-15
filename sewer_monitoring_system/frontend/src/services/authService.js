import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/api/auth`,
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
      (response) => response.data.data,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  async login(username, password) {
    const response = await this.api.post('/login', {
      username,
      password
    })
    return response
  }

  async register(userData) {
    const response = await this.api.post('/register', userData)
    return response
  }

  async getProfile() {
    const response = await this.api.get('/profile')
    return response
  }

  async updateProfile(userData) {
    const response = await this.api.put('/profile', userData)
    return response
  }

  async changePassword(currentPassword, newPassword) {
    const response = await this.api.post('/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
    return response
  }
}

export const authService = new AuthService()

