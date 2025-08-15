import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  Bell, 
  Wifi, 
  WifiOff,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import { apiService } from '../services/apiService'

export default function Header({ onMenuClick }) {
  const { connected } = useSocket()
  const [systemHealth, setSystemHealth] = useState(null)
  const [activeAlerts, setActiveAlerts] = useState(0)

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        const health = await apiService.getSystemHealth()
        setSystemHealth(health)
      } catch (error) {
        console.error('Erro ao buscar saúde do sistema:', error)
      }
    }

    const fetchActiveAlerts = async () => {
      try {
        const alerts = await apiService.getAlerts({ status: 'active', limit: 1 })
        setActiveAlerts(alerts.length)
      } catch (error) {
        console.error('Erro ao buscar alertas ativos:', error)
      }
    }

    fetchSystemHealth()
    fetchActiveAlerts()

    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      fetchSystemHealth()
      fetchActiveAlerts()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const getSystemStatusColor = () => {
    if (!systemHealth) return 'bg-gray-500'
    
    switch (systemHealth.system_status) {
      case 'healthy':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getSystemStatusText = () => {
    if (!systemHealth) return 'Carregando...'
    
    switch (systemHealth.system_status) {
      case 'healthy':
        return 'Sistema Saudável'
      case 'warning':
        return 'Atenção Necessária'
      case 'critical':
        return 'Sistema Crítico'
      default:
        return 'Status Desconhecido'
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Sistema de Monitoramento de Bueiros
            </h1>
            <p className="text-sm text-gray-500">
              Monitoramento em tempo real de sensores urbanos
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {connected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 hidden sm:inline">Conectado</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 hidden sm:inline">Desconectado</span>
              </>
            )}
          </div>

          {/* System Health */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getSystemStatusColor()}`} />
            <span className="text-sm text-gray-600 hidden md:inline">
              {getSystemStatusText()}
            </span>
          </div>

          {/* Active Alerts */}
          <div className="relative">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              {activeAlerts > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeAlerts > 99 ? '99+' : activeAlerts}
                </Badge>
              )}
            </Button>
          </div>

          {/* System Status Details */}
          {systemHealth && (
            <div className="hidden lg:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">
                  {systemHealth.performance?.active_sensors_today || 0} sensores ativos
                </span>
              </div>
              
              {systemHealth.offline_sensors?.length > 0 && (
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-gray-600">
                    {systemHealth.offline_sensors.length} offline
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

