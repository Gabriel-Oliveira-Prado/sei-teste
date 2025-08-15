import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { apiService } from '../services/apiService';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState('summary');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    { id: 'summary', label: 'Resumo', icon: '📊' },
    { id: 'sensors', label: 'Sensores', icon: '📡' },
    { id: 'alerts', label: 'Alertas', icon: '⚠️' },
    { id: 'performance', label: 'Performance', icon: '📈' }
  ];

  useEffect(() => {
    loadReportData();
  }, [activeTab]);

  const loadReportData = async () => {
    try {
      let data;
      
      switch (activeTab) {
        case 'summary':
          const summaryResponse = await apiService.getSummaryReport(7);
          data = summaryResponse.data;
          break;
          
        case 'sensors':
          const sensorResponse = await apiService.getSensorReport({ limit: 20 });
          data = sensorResponse.data;
          break;
          
        case 'alerts':
          const alertResponse = await apiService.getAlertReport({ limit: 20 });
          data = alertResponse.data;
          break;
          
        case 'performance':
          const perfResponse = await apiService.getPerformanceReport();
          data = perfResponse.data;
          break;
          
        default:
          data = null;
      }
      
      setReportData(data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do relatório');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReportData();
  };

  const renderSummaryReport = () => {
    if (!reportData?.summary) return null;

    return (
      <View style={styles.reportContent}>
        {reportData.summary.map((category, index) => (
          <View key={index} style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{category.category}</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatNumber}>{category.total}</Text>
                <Text style={styles.summaryStatLabel}>Total</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatNumber, { color: '#10b981' }]}>
                  {category.active || category.normal}
                </Text>
                <Text style={styles.summaryStatLabel}>Ativos/Normais</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatNumber, { color: '#eab308' }]}>
                  {category.inactive || category.warning}
                </Text>
                <Text style={styles.summaryStatLabel}>Inativos/Atenção</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatNumber, { color: '#ef4444' }]}>
                  {category.maintenance || category.critical}
                </Text>
                <Text style={styles.summaryStatLabel}>Manutenção/Críticos</Text>
              </View>
            </View>
          </View>
        ))}

        {reportData.top_alert_sensors?.length > 0 && (
          <View style={styles.topAlertsCard}>
            <Text style={styles.cardTitle}>Top 5 Sensores com Mais Alertas</Text>
            {reportData.top_alert_sensors.map((sensor, index) => (
              <View key={sensor.sensor_id} style={styles.topAlertItem}>
                <View style={styles.topAlertRank}>
                  <Text style={styles.topAlertRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topAlertInfo}>
                  <Text style={styles.topAlertSensor}>{sensor.sensor_id}</Text>
                  <Text style={styles.topAlertLocation}>{sensor.location_name}</Text>
                </View>
                <View style={styles.topAlertStats}>
                  <Text style={styles.topAlertCount}>{sensor.alert_count}</Text>
                  <Text style={styles.topAlertCountLabel}>alertas</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSensorReport = () => {
    if (!Array.isArray(reportData)) return null;

    return (
      <View style={styles.reportContent}>
        {reportData.map((sensor, index) => (
          <View key={index} style={styles.sensorCard}>
            <View style={styles.sensorHeader}>
              <Text style={styles.sensorId}>{sensor.sensor_id}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: sensor.status === 'active' ? '#10b981' : '#6b7280' }
              ]}>
                <Text style={styles.statusText}>{sensor.status}</Text>
              </View>
            </View>
            <Text style={styles.sensorLocation}>{sensor.location_name}</Text>
            <View style={styles.sensorStats}>
              <Text style={styles.sensorStat}>
                Tipo: {sensor.sensor_type}
              </Text>
              <Text style={styles.sensorStat}>
                Alertas: {sensor.alerts_count || 0}
              </Text>
            </View>
            {sensor.timestamp && (
              <Text style={styles.sensorTimestamp}>
                {new Date(sensor.timestamp).toLocaleString('pt-BR')}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderAlertReport = () => {
    if (!Array.isArray(reportData)) return null;

    return (
      <View style={styles.reportContent}>
        {reportData.map((alert) => (
          <View key={alert.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={[
                styles.severityBadge,
                { backgroundColor: 
                  alert.severity === 'critical' ? '#ef4444' :
                  alert.severity === 'high' ? '#f97316' :
                  alert.severity === 'medium' ? '#eab308' : '#3b82f6'
                }
              ]}>
                <Text style={styles.severityText}>{alert.severity}</Text>
              </View>
              <Text style={styles.alertType}>{alert.alert_type}</Text>
            </View>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <View style={styles.alertInfo}>
              <Text style={styles.alertSensor}>{alert.sensor_id}</Text>
              <Text style={styles.alertLocation}>{alert.location_name}</Text>
            </View>
            <Text style={styles.alertTimestamp}>
              {new Date(alert.created_at).toLocaleString('pt-BR')}
            </Text>
            {alert.duration_minutes && (
              <Text style={styles.alertDuration}>
                Duração: {Math.floor(alert.duration_minutes / 60)}h {alert.duration_minutes % 60}min
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderPerformanceReport = () => {
    if (!reportData?.sensor_performance) return null;

    return (
      <View style={styles.reportContent}>
        {reportData.sensor_performance.map((sensor) => (
          <View key={sensor.sensor_id} style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>{sensor.sensor_id}</Text>
            <Text style={styles.performanceLocation}>{sensor.location_name}</Text>
            
            <View style={styles.performanceStats}>
              <View style={styles.performanceStatRow}>
                <Text style={styles.performanceStatLabel}>Total de Leituras:</Text>
                <Text style={styles.performanceStatValue}>{sensor.total_readings}</Text>
              </View>
              <View style={styles.performanceStatRow}>
                <Text style={styles.performanceStatLabel}>Leituras Normais:</Text>
                <Text style={[styles.performanceStatValue, { color: '#10b981' }]}>
                  {sensor.normal_readings}
                </Text>
              </View>
              <View style={styles.performanceStatRow}>
                <Text style={styles.performanceStatLabel}>Leituras de Atenção:</Text>
                <Text style={[styles.performanceStatValue, { color: '#eab308' }]}>
                  {sensor.warning_readings}
                </Text>
              </View>
              <View style={styles.performanceStatRow}>
                <Text style={styles.performanceStatLabel}>Leituras Críticas:</Text>
                <Text style={[styles.performanceStatValue, { color: '#ef4444' }]}>
                  {sensor.critical_readings}
                </Text>
              </View>
              {sensor.avg_interval_seconds && (
                <View style={styles.performanceStatRow}>
                  <Text style={styles.performanceStatLabel}>Intervalo Médio:</Text>
                  <Text style={styles.performanceStatValue}>
                    {Math.round(sensor.avg_interval_seconds)}s
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Carregando relatório...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'summary':
        return renderSummaryReport();
      case 'sensors':
        return renderSensorReport();
      case 'alerts':
        return renderAlertReport();
      case 'performance':
        return renderPerformanceReport();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  reportContent: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  topAlertsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  topAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  topAlertRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topAlertRankText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topAlertInfo: {
    flex: 1,
  },
  topAlertSensor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  topAlertLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  topAlertStats: {
    alignItems: 'center',
  },
  topAlertCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  topAlertCountLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  sensorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sensorId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sensorLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  sensorStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sensorStat: {
    fontSize: 12,
    color: '#374151',
  },
  sensorTimestamp: {
    fontSize: 10,
    color: '#9ca3af',
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    textTransform: 'uppercase',
  },
  alertType: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  alertMessage: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  alertInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertSensor: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  alertLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  alertTimestamp: {
    fontSize: 10,
    color: '#9ca3af',
  },
  alertDuration: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  performanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  performanceLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  performanceStats: {
    space: 8,
  },
  performanceStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  performanceStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
});

