import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default function MapComponent({ sensors = [] }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!mapRef.current) return

    // Inicializar mapa apenas uma vez
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([-23.5505, -46.6333], 12)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current)
    }

    // Limpar marcadores existentes
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker)
    })
    markersRef.current = []

    // Adicionar novos marcadores
    sensors.forEach(sensor => {
      const color = getSensorColor(sensor.max_severity_level, sensor.latest_alert_level)
      
      const customIcon = L.divIcon({
        className: 'custom-sensor-marker',
        html: `
          <div class="sensor-marker" style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: ${color};
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${getSensorIcon(sensor.sensor_type)}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })

      const marker = L.marker([sensor.latitude, sensor.longitude], { icon: customIcon })
        .addTo(mapInstanceRef.current)

      // Popup com informações do sensor
      const popupContent = `
        <div class="sensor-popup">
          <h3 class="font-bold text-lg mb-2">${sensor.sensor_id}</h3>
          <p class="text-sm text-gray-600 mb-2">${sensor.location_name}</p>
          
          <div class="space-y-1 mb-3">
            <div class="flex justify-between">
              <span class="text-sm">Tipo:</span>
              <span class="text-sm font-medium">${getSensorTypeLabel(sensor.sensor_type)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm">Status:</span>
              <span class="text-sm font-medium ${getStatusColor(sensor.status)}">${getStatusLabel(sensor.status)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm">Alertas Ativos:</span>
              <span class="text-sm font-medium">${sensor.active_alerts || 0}</span>
            </div>
          </div>

          ${sensor.latest_reading_data ? `
            <div class="border-t pt-2">
              <p class="text-xs text-gray-500 mb-1">Última Leitura:</p>
              ${formatReadingData(sensor.latest_reading_data)}
            </div>
          ` : ''}

          ${sensor.last_reading ? `
            <p class="text-xs text-gray-400 mt-2">
              ${new Date(sensor.last_reading).toLocaleString('pt-BR')}
            </p>
          ` : ''}
        </div>
      `

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup'
      })

      markersRef.current.push(marker)
    })

    // Ajustar zoom para mostrar todos os sensores
    if (sensors.length > 0) {
      const group = new L.featureGroup(markersRef.current)
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
    }

  }, [sensors])

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
        <h4 className="font-semibold text-sm mb-2">Legenda</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Normal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Atenção</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Crítico</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Offline</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Funções auxiliares
function getSensorColor(severityLevel, alertLevel) {
  if (severityLevel >= 4) return '#ef4444' // critical - red
  if (severityLevel >= 3) return '#f97316' // high - orange  
  if (severityLevel >= 2) return '#eab308' // medium - yellow
  if (alertLevel === 'warning') return '#eab308' // warning - yellow
  if (alertLevel === 'critical') return '#ef4444' // critical - red
  return '#22c55e' // normal - green
}

function getSensorIcon(sensorType) {
  switch (sensorType) {
    case 'water_level':
      return '💧'
    case 'gas_detector':
      return '💨'
    case 'combined':
      return '🔬'
    default:
      return '📊'
  }
}

function getSensorTypeLabel(sensorType) {
  switch (sensorType) {
    case 'water_level':
      return 'Nível de Água'
    case 'gas_detector':
      return 'Detector de Gás'
    case 'combined':
      return 'Combinado'
    default:
      return sensorType
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'active':
      return 'Ativo'
    case 'inactive':
      return 'Inativo'
    case 'maintenance':
      return 'Manutenção'
    default:
      return status
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'active':
      return 'text-green-600'
    case 'inactive':
      return 'text-red-600'
    case 'maintenance':
      return 'text-yellow-600'
    default:
      return 'text-gray-600'
  }
}

function formatReadingData(readingData) {
  try {
    const data = typeof readingData === 'string' ? JSON.parse(readingData) : readingData
    
    return Object.entries(data)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        const label = getParameterLabel(key)
        const unit = getParameterUnit(key)
        return `<div class="flex justify-between text-xs">
          <span>${label}:</span>
          <span class="font-medium">${value}${unit}</span>
        </div>`
      })
      .join('')
  } catch (error) {
    return '<p class="text-xs text-gray-500">Dados não disponíveis</p>'
  }
}

function getParameterLabel(parameter) {
  const labels = {
    'water_level': 'Nível de Água',
    'gas_co': 'CO',
    'gas_h2s': 'H2S',
    'gas_ch4': 'CH4',
    'temperature': 'Temperatura',
    'humidity': 'Umidade'
  }
  return labels[parameter] || parameter
}

function getParameterUnit(parameter) {
  const units = {
    'water_level': '%',
    'gas_co': 'ppm',
    'gas_h2s': 'ppm',
    'gas_ch4': 'ppm',
    'temperature': '°C',
    'humidity': '%'
  }
  return units[parameter] || ''
}

