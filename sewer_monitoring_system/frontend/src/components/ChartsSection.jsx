import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { apiService } from '../services/apiService'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function ChartsSection() {
  const [timelineData, setTimelineData] = useState([])
  const [alertDistribution, setAlertDistribution] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('24')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadChartsData = async () => {
      try {
        setLoading(true)
        
        const [timeline, distribution] = await Promise.all([
          apiService.getReadingsTimeline(parseInt(selectedPeriod)),
          apiService.getAlertDistribution(7)
        ])
        
        setTimelineData(processTimelineData(timeline))
        setAlertDistribution(processAlertDistribution(distribution))
        
      } catch (error) {
        console.error('Erro ao carregar dados dos gráficos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadChartsData()
  }, [selectedPeriod])

  const processTimelineData = (data) => {
    // Agrupar dados por hora e calcular médias
    const grouped = data.reduce((acc, item) => {
      const hour = new Date(item.hour).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      
      if (!acc[hour]) {
        acc[hour] = {
          hour,
          normal: 0,
          warning: 0,
          critical: 0,
          avg_water_level: 0,
          avg_gas_co: 0,
          count: 0
        }
      }
      
      acc[hour][item.alert_level] += item.count
      acc[hour].avg_water_level += item.avg_water_level || 0
      acc[hour].avg_gas_co += item.avg_gas_co || 0
      acc[hour].count += 1
      
      return acc
    }, {})

    return Object.values(grouped).map(item => ({
      ...item,
      avg_water_level: item.count > 0 ? (item.avg_water_level / item.count).toFixed(1) : 0,
      avg_gas_co: item.count > 0 ? (item.avg_gas_co / item.count).toFixed(1) : 0
    }))
  }

  const processAlertDistribution = (data) => {
    // Agrupar por tipo de alerta
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.alert_type]) {
        acc[item.alert_type] = {
          name: getAlertTypeLabel(item.alert_type),
          value: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      }
      
      acc[item.alert_type].value += item.count
      acc[item.alert_type][item.severity] += item.count
      
      return acc
    }, {})

    return Object.values(grouped)
  }

  const getAlertTypeLabel = (alertType) => {
    switch (alertType) {
      case 'flood_risk':
        return 'Risco de Alagamento'
      case 'toxic_gas':
        return 'Gás Tóxico'
      case 'maintenance_required':
        return 'Manutenção'
      case 'sensor_offline':
        return 'Sensor Offline'
      default:
        return alertType
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Análise de Dados</h3>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">Últimas 6 horas</SelectItem>
            <SelectItem value="12">Últimas 12 horas</SelectItem>
            <SelectItem value="24">Últimas 24 horas</SelectItem>
            <SelectItem value="48">Últimas 48 horas</SelectItem>
            <SelectItem value="168">Última semana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de linha - Leituras ao longo do tempo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Leituras dos Sensores ao Longo do Tempo
            </CardTitle>
            <CardDescription>
              Evolução dos níveis de água e gases nas últimas {selectedPeriod} horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => `Hora: ${label}`}
                    formatter={(value, name) => [
                      `${value}${name.includes('water') ? '%' : name.includes('gas') ? 'ppm' : ''}`,
                      name === 'avg_water_level' ? 'Nível de Água Médio' :
                      name === 'avg_gas_co' ? 'CO Médio' : name
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avg_water_level" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Nível de Água (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg_gas_co" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="CO (ppm)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de barras - Alertas por nível */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Alertas por Nível
            </CardTitle>
            <CardDescription>
              Distribuição de alertas por severidade nas últimas {selectedPeriod} horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="normal" stackId="a" fill="#22c55e" name="Normal" />
                  <Bar dataKey="warning" stackId="a" fill="#eab308" name="Atenção" />
                  <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Crítico" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de pizza - Distribuição de tipos de alerta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2" />
              Tipos de Alertas
            </CardTitle>
            <CardDescription>
              Distribuição por tipo de alerta na última semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {alertDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Leituras</p>
                <p className="text-2xl font-bold text-blue-600">
                  {timelineData.reduce((sum, item) => sum + item.normal + item.warning + item.critical, 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alertas Críticos</p>
                <p className="text-2xl font-bold text-red-600">
                  {timelineData.reduce((sum, item) => sum + item.critical, 0)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Normalidade</p>
                <p className="text-2xl font-bold text-green-600">
                  {timelineData.length > 0 ? (
                    (timelineData.reduce((sum, item) => sum + item.normal, 0) / 
                     timelineData.reduce((sum, item) => sum + item.normal + item.warning + item.critical, 0) * 100).toFixed(1)
                  ) : 0}%
                </p>
              </div>
              <PieChartIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

