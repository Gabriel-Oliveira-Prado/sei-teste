import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Droplets, 
  Wind,
  MapPin,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import { apiService } from '../services/apiService'
import { useSocket } from '../contexts/SocketContext'
import MapComponent from './MapComponent'
import AlertsList from './AlertsList'
import ChartsSection from './ChartsSection'

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [mapData, setMapData] = useState([])
  const [recentAlerts, setRecentAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  
  const { socket } = useSocket()

  // Carregar dados iniciais
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        
        const [overviewData, mapDataResponse, alertsData] = await Promise.all([
          apiService.getDashboardOverview(),
          apiService.getMapData(),
          apiService.getRecentAlerts(10)
        ])
        
        setOverview(overviewData)
        setMapData(mapDataResponse)
        setRecentAlerts(alertsData)
        setLastUpdate(new Date())
        
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Escutar atualizações via WebSocket
  useEffect(() => {
    if (!socket) return

    const handleSensorReading = (data) => {
      console.log('Nova leitura de sensor:', data)
      // Atualizar dados do mapa se necessário
      setLastUpdate(new Date())
    }

    const handleNewAlert = (alert) => {
      console.log('Novo alerta:', alert)
      // Adicionar novo alerta à lista
      setRecentAlerts(prev => [alert, ...prev.slice(0, 9)])
      setLastUpdate(new Date())
    }

    const handleAlertResolved = (data) => {
      console.log('Alerta resolvido:', data)
      // Remover alerta da lista
      setRecentAlerts(prev => prev.filter(alert => alert.id !== data.id))
      setLastUpdate(new Date())
    }

    socket.on('sensor_reading', handleSensorReading)
    socket.on('new_alert', handleNewAlert)
    socket.on('alert_resolved', handleAlertResolved)

    return () => {
      socket.off('sensor_reading', handleSensorReading)
      socket.off('new_alert', handleNewAlert)
      socket.off('alert_resolved', handleAlertResolved)
    }
  }, [socket])

  const refreshData = async () => {
    try {
      const [overviewData, mapDataResponse, alertsData] = await Promise.all([
        apiService.getDashboardOverview(),
        apiService.getMapData(),
        apiService.getRecentAlerts(10)
      ])
      
      setOverview(overviewData)
      setMapData(mapDataResponse)
      setRecentAlerts(alertsData)
      setLastUpdate(new Date())
      
    } catch (error) {
      console.error('Erro ao atualizar dados:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <Button onClick={refreshData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sensores Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overview?.sensors?.active_sensors || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              de {overview?.sensors?.total_sensors || 0} sensores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overview?.alerts?.critical_alerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.alerts?.total_active_alerts || 0} alertas ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nível de Água</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {overview?.readings?.find(r => r.alert_level === 'warning')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              leituras em atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gases Tóxicos</CardTitle>
            <Wind className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {overview?.readings?.find(r => r.alert_level === 'critical')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              leituras críticas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção principal com mapa e alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Mapa de Sensores
            </CardTitle>
            <CardDescription>
              Localização e status dos sensores em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <MapComponent sensors={mapData} />
            </div>
          </CardContent>
        </Card>

        {/* Alertas recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Alertas Recentes
            </CardTitle>
            <CardDescription>
              Últimos alertas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertsList alerts={recentAlerts} />
          </CardContent>
        </Card>
      </div>

      {/* Seção de gráficos */}
      <ChartsSection />

      {/* Sensores com alertas */}
      {overview?.sensors_with_alerts?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Sensores Requerendo Atenção
            </CardTitle>
            <CardDescription>
              Sensores com alertas ativos ordenados por prioridade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.sensors_with_alerts.map((sensor) => (
                <div key={sensor.sensor_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      sensor.max_severity === 'critical' ? 'bg-red-500' :
                      sensor.max_severity === 'high' ? 'bg-orange-500' :
                      sensor.max_severity === 'medium' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`} />
                    <div>
                      <p className="font-medium">{sensor.sensor_id}</p>
                      <p className="text-sm text-gray-500">{sensor.location_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      sensor.max_severity === 'critical' ? 'destructive' :
                      sensor.max_severity === 'high' ? 'destructive' :
                      sensor.max_severity === 'medium' ? 'secondary' :
                      'default'
                    }>
                      {sensor.active_alerts} alerta{sensor.active_alerts !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline">
                      {sensor.max_severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

