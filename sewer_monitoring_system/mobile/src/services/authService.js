import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3001'; // Em produção, usar IP do servidor

class AuthService {
  constructor() {
    this.baseURL = `${API_URL}/api/auth`;
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          token: data.data.token,
          user: data.data.user
        };
      } else {
        return {
          success: false,
          error: data.error || 'Erro no login'
        };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        error: 'Erro de conexão com o servidor'
      };
    }
  }

  async validateToken() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return false;

      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Erro ao validar token:', error);
      return false;
    }
  }

  async getProfile() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Token não encontrado');

      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Erro ao buscar perfil');
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await AsyncStorage.removeItem('token');
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return false;
    }
  }
}

export const authService = new AuthService();

