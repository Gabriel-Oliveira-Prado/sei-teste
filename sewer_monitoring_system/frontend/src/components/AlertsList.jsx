import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  Droplets, 
  Wind, 
  Wrench, 
  WifiOff,
  Clock,
  MapPin
} from 'lucide-react'
import { apiService } from '../services/apiService'

export default function AlertsList({ alerts = [] }) {
  
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await apiService.acknowledgeAlert(alertId)
      // A atualização será feita via WebSocket
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error)
    }
  }

  const handleResolveAlert = async (alertId) => {
    try {
      await apiService.resolveAlert(alertId)
      // A atualização será feita via WebSocket
    } catch (error) {
      console.error('Erro ao resolver alerta:', error)
    }
  }

  const getAlertIcon = (alertType) => {
    switch (alertType) {
      case 'flood_risk':
        return <Droplets className="h-4 w-4" />
      case 'toxic_gas':
        return <Wind className="h-4 w-4" />
      case 'maintenance_required':
        return <Wrench className="h-4 w-4" />
      case 'sensor_offline':
        return <WifiOff className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
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

  const getSeverityVariant = (severity) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50'
      case 'high':
        return 'text-orange-600 bg-orange-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const alertTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now - alertTime) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h atrás`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d atrás`
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Nenhum alerta ativo</p>
        <p className="text-sm text-gray-400">Sistema funcionando normalmente</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border-l-4 ${
            alert.severity === 'critical' ? 'border-l-red-500 bg-red-50' :
            alert.severity === 'high' ? 'border-l-orange-500 bg-orange-50' :
            alert.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
            'border-l-blue-500 bg-blue-50'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                {getAlertIcon(alert.alert_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge variant={getSeverityVariant(alert.severity)} className="text-xs">
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getAlertTypeLabel(alert.alert_type)}
                  </Badge>
                </div>
                
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {alert.message}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{alert.sensor_id}</span>
                  </div>
                  
                  {alert.location_name && (
                    <span className="truncate">{alert.location_name}</span>
                  )}
                  
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(alert.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Ações do alerta */}
          {alert.status === 'active' && (
            <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAcknowledgeAlert(alert.id)}
                className="text-xs"
              >
                Reconhecer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResolveAlert(alert.id)}
                className="text-xs"
              >
                Resolver
              </Button>
            </div>
          )}
          
          {/* Status do alerta */}
          {alert.status !== 'active' && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <Badge variant="outline" className="text-xs">
                {alert.status === 'acknowledged' ? 'Reconhecido' : 'Resolvido'}
                {alert.acknowledged_at && ` em ${new Date(alert.acknowledged_at).toLocaleString('pt-BR')}`}
                {alert.resolved_at && ` em ${new Date(alert.resolved_at).toLocaleString('pt-BR')}`}
              </Badge>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

