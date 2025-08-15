import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { apiService } from '../services/apiService';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, resolved

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      const params = {};
      if (filter === 'active') {
        params.status = 'active';
      } else if (filter === 'resolved') {
        params.status = 'resolved';
      }

      const response = await apiService.getAlerts(params);
      setAlerts(response.data);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      Alert.alert('Erro', 'Não foi possível carregar os alertas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await apiService.acknowledgeAlert(alertId);
      Alert.alert('Sucesso', 'Alerta reconhecido com sucesso');
      loadAlerts(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
      Alert.alert('Erro', 'Não foi possível reconhecer o alerta');
    }
  };

  const handleResolveAlert = async (alertId) => {
    Alert.alert(
      'Resolver Alerta',
      'Tem certeza que deseja marcar este alerta como resolvido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.resolveAlert(alertId);
              Alert.alert('Sucesso', 'Alerta resolvido com sucesso');
              loadAlerts(); // Recarregar lista
            } catch (error) {
              console.error('Erro ao resolver alerta:', error);
              Alert.alert('Erro', 'Não foi possível resolver o alerta');
            }
          }
        }
      ]
    );
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getAlertTypeLabel = (alertType) => {
    switch (alertType) {
      case 'flood_risk':
        return 'Risco de Alagamento';
      case 'toxic_gas':
        return 'Gás Tóxico';
      case 'maintenance_required':
        return 'Manutenção';
      case 'sensor_offline':
        return 'Sensor Offline';
      default:
        return alertType;
    }
  };

  const getAlertIcon = (alertType) => {
    switch (alertType) {
      case 'flood_risk':
        return '💧';
      case 'toxic_gas':
        return '💨';
      case 'maintenance_required':
        return '🔧';
      case 'sensor_offline':
        return '📡';
      default:
        return '⚠️';
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

  const renderAlert = ({ item: alert }) => (
    <View style={[
      styles.alertCard,
      { borderLeftColor: getSeverityColor(alert.severity) }
    ]}>
      <View style={styles.alertHeader}>
        <View style={styles.alertHeaderLeft}>
          <Text style={styles.alertIcon}>{getAlertIcon(alert.alert_type)}</Text>
          <View style={styles.alertHeaderText}>
            <View style={styles.alertBadges}>
              <View style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(alert.severity) }
              ]}>
                <Text style={styles.severityText}>
                  {alert.severity.toUpperCase()}
                </Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {getAlertTypeLabel(alert.alert_type)}
                </Text>
              </View>
            </View>
            <Text style={styles.alertTime}>
              {formatTimeAgo(alert.created_at)}
            </Text>
          </View>
        </View>
        
        {alert.status === 'active' && (
          <View style={styles.activeIndicator} />
        )}
      </View>

      <Text style={styles.alertMessage}>{alert.message}</Text>
      
      <View style={styles.alertLocation}>
        <Text style={styles.locationText}>
          📍 {alert.sensor_id} - {alert.location_name}
        </Text>
      </View>

      {alert.status === 'active' && (
        <View style={styles.alertActions}>
          <TouchableOpacity
            style={styles.acknowledgeButton}
            onPress={() => handleAcknowledgeAlert(alert.id)}
          >
            <Text style={styles.acknowledgeButtonText}>Reconhecer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.resolveButton}
            onPress={() => handleResolveAlert(alert.id)}
          >
            <Text style={styles.resolveButtonText}>Resolver</Text>
          </TouchableOpacity>
        </View>
      )}

      {alert.status !== 'active' && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {alert.status === 'acknowledged' ? '✓ Reconhecido' : '✅ Resolvido'}
            {alert.acknowledged_at && ` em ${new Date(alert.acknowledged_at).toLocaleDateString('pt-BR')}`}
            {alert.resolved_at && ` em ${new Date(alert.resolved_at).toLocaleDateString('pt-BR')}`}
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>
        {filter === 'active' ? '✅' : filter === 'resolved' ? '📋' : '⚠️'}
      </Text>
      <Text style={styles.emptyTitle}>
        {filter === 'active' ? 'Nenhum alerta ativo' : 
         filter === 'resolved' ? 'Nenhum alerta resolvido' : 
         'Nenhum alerta encontrado'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'active' ? 'Sistema funcionando normalmente' : 
         filter === 'resolved' ? 'Não há alertas resolvidos ainda' : 
         'Não há alertas no sistema'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Carregando alertas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Ativos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'resolved' && styles.filterButtonActive]}
          onPress={() => setFilter('resolved')}
        >
          <Text style={[styles.filterText, filter === 'resolved' && styles.filterTextActive]}>
            Resolvidos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de alertas */}
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={alerts.length === 0 ? styles.emptyListContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertHeaderText: {
    flex: 1,
  },
  alertBadges: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  severityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  typeText: {
    color: '#374151',
    fontSize: 10,
    fontWeight: '500',
  },
  alertTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  alertMessage: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
    lineHeight: 22,
  },
  alertLocation: {
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  acknowledgeButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
  },
  acknowledgeButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  resolveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 8,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

