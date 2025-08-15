import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform
} from 'react-native';
import { apiService } from '../services/apiService';

// Componente de mapa simplificado para web
const SimpleMapView = ({ sensors, onMarkerPress }) => {
  return (
    <View style={styles.mapPlaceholder}>
      <Text style={styles.mapPlaceholderTitle}>Mapa de Sensores</Text>
      <Text style={styles.mapPlaceholderSubtitle}>
        {sensors.length} sensores encontrados
      </Text>
      
      <ScrollView style={styles.sensorsList}>
        {sensors.map((sensor) => (
          <TouchableOpacity
            key={sensor.sensor_id}
            style={styles.sensorItem}
            onPress={() => onMarkerPress(sensor)}
          >
            <View style={[
              styles.sensorIndicator,
              { backgroundColor: getSensorColor(sensor.max_severity_level, sensor.latest_alert_level, sensor.status) }
            ]} />
            <View style={styles.sensorInfo}>
              <Text style={styles.sensorId}>{sensor.sensor_id}</Text>
              <Text style={styles.sensorLocation}>{sensor.location_name}</Text>
              <Text style={styles.sensorCoords}>
                {sensor.latitude.toFixed(4)}, {sensor.longitude.toFixed(4)}
              </Text>
            </View>
            <View style={styles.sensorStatus}>
              <Text style={styles.sensorStatusText}>
                {sensor.active_alerts || 0} alertas
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

function getSensorColor(severityLevel, alertLevel, status) {
  if (status !== 'active') return '#6b7280'; // gray for inactive
  if (severityLevel >= 4) return '#ef4444'; // red for critical
  if (severityLevel >= 3) return '#f97316'; // orange for high
  if (severityLevel >= 2) return '#eab308'; // yellow for medium
  if (alertLevel === 'warning') return '#eab308'; // yellow for warning
  if (alertLevel === 'critical') return '#ef4444'; // red for critical
  return '#10b981'; // green for normal
}

export default function MapScreen() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      const response = await apiService.getMapData();
      setSensors(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados do mapa:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do mapa');
    } finally {
      setLoading(false);
    }
  };

  const getSensorTypeLabel = (sensorType) => {
    switch (sensorType) {
      case 'water_level':
        return 'Nível de Água';
      case 'gas_detector':
        return 'Detector de Gás';
      case 'combined':
        return 'Combinado';
      default:
        return sensorType;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'maintenance':
        return 'Manutenção';
      default:
        return status;
    }
  };

  const formatReadingData = (readingData) => {
    try {
      const data = typeof readingData === 'string' ? JSON.parse(readingData) : readingData;
      
      return Object.entries(data)
        .filter(([key, value]) => value !== null && value !== undefined)
        .map(([key, value]) => {
          const label = getParameterLabel(key);
          const unit = getParameterUnit(key);
          return { label, value: `${value}${unit}` };
        });
    } catch (error) {
      return [];
    }
  };

  const getParameterLabel = (parameter) => {
    const labels = {
      'water_level': 'Nível de Água',
      'gas_co': 'CO',
      'gas_h2s': 'H2S',
      'gas_ch4': 'CH4',
      'temperature': 'Temperatura',
      'humidity': 'Umidade'
    };
    return labels[parameter] || parameter;
  };

  const getParameterUnit = (parameter) => {
    const units = {
      'water_level': '%',
      'gas_co': 'ppm',
      'gas_h2s': 'ppm',
      'gas_ch4': 'ppm',
      'temperature': '°C',
      'humidity': '%'
    };
    return units[parameter] || '';
  };

  const handleMarkerPress = (sensor) => {
    setSelectedSensor(sensor);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Carregando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SimpleMapView 
        sensors={sensors} 
        onMarkerPress={handleMarkerPress}
      />

      {/* Legenda */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legenda</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#eab308' }]} />
          <Text style={styles.legendText}>Atenção</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Crítico</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#6b7280' }]} />
          <Text style={styles.legendText}>Offline</Text>
        </View>
      </View>

      {/* Modal de detalhes do sensor */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSensor && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedSensor.sensor_id}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLocation}>{selectedSensor.location_name}</Text>

                <View style={styles.modalSection}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Tipo:</Text>
                    <Text style={styles.modalValue}>
                      {getSensorTypeLabel(selectedSensor.sensor_type)}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Status:</Text>
                    <Text style={[
                      styles.modalValue,
                      { color: selectedSensor.status === 'active' ? '#10b981' : '#ef4444' }
                    ]}>
                      {getStatusLabel(selectedSensor.status)}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Alertas Ativos:</Text>
                    <Text style={styles.modalValue}>{selectedSensor.active_alerts || 0}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Coordenadas:</Text>
                    <Text style={styles.modalValue}>
                      {selectedSensor.latitude.toFixed(4)}, {selectedSensor.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>

                {selectedSensor.latest_reading_data && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Última Leitura</Text>
                    {formatReadingData(selectedSensor.latest_reading_data).map((item, index) => (
                      <View key={index} style={styles.modalRow}>
                        <Text style={styles.modalLabel}>{item.label}:</Text>
                        <Text style={styles.modalValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedSensor.last_reading && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalTimestamp}>
                      {new Date(selectedSensor.last_reading).toLocaleString('pt-BR')}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  mapPlaceholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  mapPlaceholderSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  sensorsList: {
    flex: 1,
  },
  sensorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sensorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  sensorInfo: {
    flex: 1,
  },
  sensorId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  sensorLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  sensorCoords: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  sensorStatus: {
    alignItems: 'flex-end',
  },
  sensorStatusText: {
    fontSize: 12,
    color: '#374151',
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  modalLocation: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  modalTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

