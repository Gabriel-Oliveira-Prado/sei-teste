import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar,
  MapPin,
  AlertTriangle,
  Activity,
  Search,
  RefreshCw
} from 'lucide-react'
import { apiService } from '../services/apiService'

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sensors')
  const [reportData, setReportData] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    sensor_id: '',
    location: '',
    sensor_type: '',
    status: '',
    alert_type: '',
    severity: '',
    limit: 50,
    offset: 0
  })
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    current: 1
  })

  const tabs = [
    { id: 'sensors', label: 'Sensores', icon: Activity },
    { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
    { id: 'performance', label: 'Performance', icon: FileText },
    { id: 'summary', label: 'Resumo', icon: FileText }
  ]

  useEffect(() => {
    loadReportData()
  }, [activeTab, filters])

  const loadReportData = async () => {
    try {
      setLoading(true)
      
      let data, stats
      
      switch (activeTab) {
        case 'sensors':
          const sensorReport = await apiService.getSensorReport(filters)
          data = sensorReport.data
          setPagination(sensorReport.pagination || {})
          break
          
        case 'alerts':
          const alertReport = await apiService.getAlertReport(filters)
          data = alertReport.data
          stats = alertReport.statistics
          break
          
        case 'performance':
          const perfReport = await apiService.getPerformanceReport(filters)
          data = perfReport.data
          break
          
        case 'summary':
          const summaryReport = await apiService.getSummaryReport(7)
          data = summaryReport.data
          break
          
        default:
          data = []
      }
      
      setReportData(data)
      
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset pagination
    }))
  }

  const handleExport = async (format = 'json') => {
    try {
      const result = await apiService.exportReport(activeTab, format, filters)
      console.log('Relatório exportado:', result)
      // Em produção, faria download do arquivo
      alert(`Relatório exportado com sucesso! URL: ${result.download_url}`)
    } catch (error) {
      console.error('Erro ao exportar relatório:', error)
      alert('Erro ao exportar relatório')
    }
  }

  const renderFilters = () => {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start_date">Data Inicial</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="end_date">Data Final</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
            
            {activeTab === 'sensors' && (
              <>
                <div>
                  <Label htmlFor="sensor_type">Tipo de Sensor</Label>
                  <Select value={filters.sensor_type} onValueChange={(value) => handleFilterChange('sensor_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os tipos</SelectItem>
                      <SelectItem value="water_level">Nível de Água</SelectItem>
                      <SelectItem value="gas_detector">Detector de Gás</SelectItem>
                      <SelectItem value="combined">Combinado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {activeTab === 'alerts' && (
              <>
                <div>
                  <Label htmlFor="alert_type">Tipo de Alerta</Label>
                  <Select value={filters.alert_type} onValueChange={(value) => handleFilterChange('alert_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os tipos</SelectItem>
                      <SelectItem value="flood_risk">Risco de Alagamento</SelectItem>
                      <SelectItem value="toxic_gas">Gás Tóxico</SelectItem>
                      <SelectItem value="maintenance_required">Manutenção</SelectItem>
                      <SelectItem value="sensor_offline">Sensor Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="severity">Severidade</Label>
                  <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as severidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as severidades</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="sensor_id">ID do Sensor</Label>
              <Input
                id="sensor_id"
                placeholder="Ex: SENSOR_001"
                value={filters.sensor_id}
                onChange={(e) => handleFilterChange('sensor_id', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                placeholder="Ex: Rua das Flores"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-4">
            <Button onClick={loadReportData} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            <Button onClick={() => setFilters({
              start_date: '',
              end_date: '',
              sensor_id: '',
              location: '',
              sensor_type: '',
              status: '',
              alert_type: '',
              severity: '',
              limit: 50,
              offset: 0
            })} variant="outline">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderSensorReport = () => {
    if (!Array.isArray(reportData)) return null
    
    return (
      <div className="space-y-4">
        {reportData.map((item, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-semibold">{item.sensor_id}</h3>
                    <p className="text-sm text-gray-500">{item.location_name}</p>
                  </div>
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                  <Badge variant="outline">
                    {item.sensor_type}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {item.alerts_count} alertas
                  </p>
                  {item.timestamp && (
                    <p className="text-xs text-gray-400">
                      {new Date(item.timestamp).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderAlertReport = () => {
    if (!Array.isArray(reportData)) return null
    
    return (
      <div className="space-y-4">
        {reportData.map((alert) => (
          <Card key={alert.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant={
                      alert.severity === 'critical' ? 'destructive' :
                      alert.severity === 'high' ? 'destructive' :
                      alert.severity === 'medium' ? 'secondary' :
                      'outline'
                    }>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline">
                      {alert.alert_type}
                    </Badge>
                    <Badge variant={alert.status === 'active' ? 'destructive' : 'default'}>
                      {alert.status}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold mb-1">{alert.message}</h3>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{alert.sensor_id}</span>
                    <span>{alert.location_name}</span>
                    <span>{new Date(alert.created_at).toLocaleString('pt-BR')}</span>
                    {alert.duration_minutes && (
                      <span>Duração: {Math.floor(alert.duration_minutes / 60)}h {alert.duration_minutes % 60}min</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderPerformanceReport = () => {
    if (!reportData.sensor_performance) return null
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportData.sensor_performance.map((sensor) => (
            <Card key={sensor.sensor_id}>
              <CardHeader>
                <CardTitle className="text-lg">{sensor.sensor_id}</CardTitle>
                <CardDescription>{sensor.location_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total de Leituras:</span>
                    <span className="font-medium">{sensor.total_readings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Leituras Normais:</span>
                    <span className="font-medium text-green-600">{sensor.normal_readings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Leituras de Atenção:</span>
                    <span className="font-medium text-yellow-600">{sensor.warning_readings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Leituras Críticas:</span>
                    <span className="font-medium text-red-600">{sensor.critical_readings}</span>
                  </div>
                  {sensor.avg_interval_seconds && (
                    <div className="flex justify-between">
                      <span className="text-sm">Intervalo Médio:</span>
                      <span className="font-medium">{Math.round(sensor.avg_interval_seconds)}s</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderSummaryReport = () => {
    if (!reportData.summary) return null
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportData.summary.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="capitalize">{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-bold">{category.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ativos/Normais:</span>
                    <span className="text-green-600">{category.active || category.normal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inativos/Atenção:</span>
                    <span className="text-yellow-600">{category.inactive || category.warning}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manutenção/Críticos:</span>
                    <span className="text-red-600">{category.maintenance || category.critical}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {reportData.top_alert_sensors?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Sensores com Mais Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.top_alert_sensors.map((sensor) => (
                  <div key={sensor.sensor_id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{sensor.sensor_id}</p>
                      <p className="text-sm text-gray-500">{sensor.location_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{sensor.alert_count} alertas</p>
                      <Badge variant={
                        sensor.max_severity === 'critical' ? 'destructive' :
                        sensor.max_severity === 'high' ? 'destructive' :
                        'secondary'
                      }>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
          <p className="text-gray-500">Análise detalhada dos dados do sistema</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={() => handleExport('json')} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button onClick={loadReportData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {activeTab === 'sensors' && renderSensorReport()}
            {activeTab === 'alerts' && renderAlertReport()}
            {activeTab === 'performance' && renderPerformanceReport()}
            {activeTab === 'summary' && renderSummaryReport()}
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {filters.offset + 1} a {Math.min(filters.offset + filters.limit, pagination.total)} de {pagination.total} resultados
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('offset', Math.max(0, filters.offset - filters.limit))}
              disabled={filters.offset === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('offset', filters.offset + filters.limit)}
              disabled={filters.offset + filters.limit >= pagination.total}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

