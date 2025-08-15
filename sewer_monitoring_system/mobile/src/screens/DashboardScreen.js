import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation, onLogout }) {
  const [overview, setOverview] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [overviewData, alertsData, healthData] = await Promise.all([
        apiService.getDashboardOverview(),
        apiService.getRecentAlerts(5),
        apiService.getSystemHealth()
      ]);

      setOverview(overviewData.data);
      setRecentAlerts(alertsData.data);
      setSystemHealth(healthData.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy': return 'Saudável';
      case 'warning': return 'Atenção';
      case 'critical': return 'Crítico';
      default: return 'Desconhecido';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - alertTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header com botão de logout */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bem-vindo!</Text>
          <Text style={styles.lastUpdateText}>
            Última atualização: {new Date().toLocaleTimeString('pt-BR')}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Status do Sistema */}
      {systemHealth && (
        <View style={styles.systemHealthCard}>
          <Text style={styles.cardTitle}>Status do Sistema</Text>
          <View style={styles.systemHealthContent}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(systemHealth.system_status) }]} />
            <Text style={styles.systemHealthText}>
              {getStatusText(systemHealth.system_status)}
            </Text>
          </View>
        </View>
      )}

      {/* Cards de Estatísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={styles.statNumber}>
              {overview?.sensors?.active_sensors || 0}
            </Text>
            <Text style={styles.statLabel}>Sensores Ativos</Text>
            <Text style={styles.statSubtext}>
              de {overview?.sensors?.total_sensors || 0} sensores
            </Text>
          </View>

          <View style={[styles.statCard, styles.statCardRed]}>
            <Text style={styles.statNumber}>
              {overview?.alerts?.critical_alerts || 0}
            </Text>
            <Text style={styles.statLabel}>Alertas Críticos</Text>
            <Text style={styles.statSubtext}>
              {overview?.alerts?.total_active_alerts || 0} ativos
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <Text style={styles.statNumber}>
              {overview?.readings?.find(r => r.alert_level === 'warning')?.count || 0}
            </Text>
            <Text style={styles.statLabel}>Nível de Água</Text>
            <Text style={styles.statSubtext}>em atenção</Text>
          </View>

          <View style={[styles.statCard, styles.statCardOrange]}>
            <Text style={styles.statNumber}>
              {overview?.readings?.find(r => r.alert_level === 'critical')?.count || 0}
            </Text>
            <Text style={styles.statLabel}>Gases Tóxicos</Text>
            <Text style={styles.statSubtext}>críticos</Text>
          </View>
        </View>
      </View>

      {/* Navegação Rápida */}
      <View style={styles.quickNavContainer}>
        <Text style={styles.sectionTitle}>Acesso Rápido</Text>
        <View style={styles.quickNavGrid}>
          <TouchableOpacity
            style={styles.quickNavButton}
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.quickNavIcon}>🗺️</Text>
            <Text style={styles.quickNavText}>Mapa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavButton}
            onPress={() => navigation.navigate('Alerts')}
          >
            <Text style={styles.quickNavIcon}>⚠️</Text>
            <Text style={styles.quickNavText}>Alertas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavButton}
            onPress={() => navigation.navigate('Reports')}
          >
            <Text style={styles.quickNavIcon}>📊</Text>
            <Text style={styles.quickNavText}>Relatórios</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Alertas Recentes */}
      <View style={styles.alertsContainer}>
        <Text style={styles.sectionTitle}>Alertas Recentes</Text>
        {recentAlerts.length > 0 ? (
          recentAlerts.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <View style={[
                  styles.alertSeverityBadge,
                  { backgroundColor: 
                    alert.severity === 'critical' ? '#ef4444' :
                    alert.severity === 'high' ? '#f97316' :
                    alert.severity === 'medium' ? '#eab308' : '#3b82f6'
                  }
                ]}>
                  <Text style={styles.alertSeverityText}>
                    {alert.severity.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.alertTime}>
                  {formatTimeAgo(alert.created_at)}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertLocation}>
                {alert.sensor_id} - {alert.location_name}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.noAlertsContainer}>
            <Text style={styles.noAlertsIcon}>✅</Text>
            <Text style={styles.noAlertsText}>Nenhum alerta ativo</Text>
            <Text style={styles.noAlertsSubtext}>Sistema funcionando normalmente</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  systemHealthCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  systemHealthContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  systemHealthText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  statsContainer: {
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  statCardRed: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  statCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  statCardOrange: {
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 10,
    color: '#9ca3af',
  },
  quickNavContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  quickNavGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickNavButton: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: (width - 64) / 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickNavIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickNavText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  alertsContainer: {
    margin: 16,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertSeverityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alertSeverityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  alertMessage: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  alertLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  noAlertsContainer: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noAlertsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noAlertsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  noAlertsSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
});

