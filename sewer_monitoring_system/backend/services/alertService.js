const db = require('../config/database');
const whatsappService = require('./whatsappService');

class AlertService {
  constructor() {
    this.alertCheckInterval = null;
    this.isMonitoring = false;
  }

  // Iniciar monitoramento de alertas
  startAlertMonitoring(io) {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoramento de alertas já está ativo');
      return;
    }

    this.io = io;
    this.isMonitoring = true;
    
    const interval = process.env.ALERT_CHECK_INTERVAL || 30000; // 30 segundos
    
    this.alertCheckInterval = setInterval(async () => {
      try {
        await this.checkAndProcessAlerts();
      } catch (error) {
        console.error('Erro no monitoramento de alertas:', error);
      }
    }, interval);
    
    console.log(`✅ Monitoramento de alertas iniciado (intervalo: ${interval}ms)`);
  }

  // Parar monitoramento de alertas
  stopAlertMonitoring() {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
      this.isMonitoring = false;
      console.log('🛑 Monitoramento de alertas parado');
    }
  }

  // Avaliar leitura do sensor e determinar nível de alerta
  async evaluateReading(sensorId, readingData) {
    try {
      // Buscar configurações de alerta para o sensor
      const alertConfigs = await db.query(`
        SELECT parameter_name, threshold_warning, threshold_critical, enabled
        FROM alert_configurations
        WHERE sensor_id = ? AND enabled = TRUE
      `, [sensorId]);

      let alertLevel = 'normal';
      const triggeredAlerts = [];

      // Verificar cada parâmetro
      for (const config of alertConfigs) {
        const paramValue = readingData[config.parameter_name];
        
        if (paramValue !== undefined && paramValue !== null) {
          if (config.threshold_critical && paramValue >= config.threshold_critical) {
            alertLevel = 'critical';
            triggeredAlerts.push({
              parameter: config.parameter_name,
              value: paramValue,
              threshold: config.threshold_critical,
              level: 'critical'
            });
          } else if (config.threshold_warning && paramValue >= config.threshold_warning) {
            if (alertLevel !== 'critical') {
              alertLevel = 'warning';
            }
            triggeredAlerts.push({
              parameter: config.parameter_name,
              value: paramValue,
              threshold: config.threshold_warning,
              level: 'warning'
            });
          }
        }
      }

      // Criar alertas se necessário
      if (triggeredAlerts.length > 0) {
        await this.createAlertsFromReading(sensorId, triggeredAlerts, readingData);
      }

      return alertLevel;

    } catch (error) {
      console.error('Erro ao avaliar leitura:', error);
      return 'normal';
    }
  }

  // Criar alertas baseados na leitura
  async createAlertsFromReading(sensorId, triggeredAlerts, readingData) {
    try {
      for (const alert of triggeredAlerts) {
        const alertType = this.getAlertType(alert.parameter);
        const severity = alert.level === 'critical' ? 'critical' : 'medium';
        const message = this.generateAlertMessage(sensorId, alert);

        // Verificar se já existe alerta ativo similar
        const [existingAlert] = await db.query(`
          SELECT id FROM alerts
          WHERE sensor_id = ? AND alert_type = ? AND status = 'active'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `, [sensorId, alertType]);

        if (!existingAlert) {
          // Criar novo alerta
          const result = await db.query(`
            INSERT INTO alerts (sensor_id, alert_type, severity, message, alert_data)
            VALUES (?, ?, ?, ?, ?)
          `, [
            sensorId,
            alertType,
            severity,
            message,
            JSON.stringify({
              parameter: alert.parameter,
              value: alert.value,
              threshold: alert.threshold,
              reading_data: readingData
            })
          ]);

          // Emitir alerta via WebSocket
          if (this.io) {
            this.io.to('dashboard').emit('new_alert', {
              id: result.insertId,
              sensor_id: sensorId,
              alert_type: alertType,
              severity,
              message,
              created_at: new Date()
            });
          }

          console.log(`🚨 Novo alerta criado: ${message}`);
        }
      }
    } catch (error) {
      console.error('Erro ao criar alertas:', error);
    }
  }

  // Verificar e processar alertas pendentes
  async checkAndProcessAlerts() {
    try {
      // Buscar alertas ativos que precisam ser enviados via WhatsApp
      const pendingAlerts = await db.query(`
        SELECT a.*, s.location_name
        FROM alerts a
        LEFT JOIN sensors s ON a.sensor_id = s.sensor_id
        WHERE a.status = 'active' 
        AND a.whatsapp_sent = FALSE
        AND a.severity IN ('critical', 'high')
        ORDER BY a.created_at ASC
        LIMIT 10
      `);

      for (const alert of pendingAlerts) {
        try {
          // Enviar via WhatsApp
          const sent = await whatsappService.sendAlert(alert);
          
          if (sent) {
            // Marcar como enviado
            await db.query(
              'UPDATE alerts SET whatsapp_sent = TRUE WHERE id = ?',
              [alert.id]
            );
            
            console.log(`📱 Alerta ${alert.id} enviado via WhatsApp`);
          }
        } catch (error) {
          console.error(`Erro ao enviar alerta ${alert.id}:`, error);
        }
      }

      // Verificar sensores offline
      await this.checkOfflineSensors();

    } catch (error) {
      console.error('Erro ao processar alertas:', error);
    }
  }

  // Verificar sensores offline
  async checkOfflineSensors() {
    try {
      const offlineSensors = await db.query(`
        SELECT s.sensor_id, s.location_name, MAX(sr.timestamp) as last_reading
        FROM sensors s
        LEFT JOIN sensor_readings sr ON s.sensor_id = sr.sensor_id
        WHERE s.status = 'active'
        GROUP BY s.id
        HAVING last_reading IS NULL OR last_reading < DATE_SUB(NOW(), INTERVAL 2 HOUR)
      `);

      for (const sensor of offlineSensors) {
        // Verificar se já existe alerta de sensor offline
        const [existingAlert] = await db.query(`
          SELECT id FROM alerts
          WHERE sensor_id = ? AND alert_type = 'sensor_offline' AND status = 'active'
        `, [sensor.sensor_id]);

        if (!existingAlert) {
          // Criar alerta de sensor offline
          await db.query(`
            INSERT INTO alerts (sensor_id, alert_type, severity, message, alert_data)
            VALUES (?, 'sensor_offline', 'high', ?, ?)
          `, [
            sensor.sensor_id,
            `Sensor ${sensor.sensor_id} (${sensor.location_name}) está offline`,
            JSON.stringify({
              last_reading: sensor.last_reading,
              offline_since: new Date()
            })
          ]);

          console.log(`📡 Sensor offline detectado: ${sensor.sensor_id}`);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sensores offline:', error);
    }
  }

  // Determinar tipo de alerta baseado no parâmetro
  getAlertType(parameter) {
    const typeMap = {
      'water_level': 'flood_risk',
      'gas_co': 'toxic_gas',
      'gas_h2s': 'toxic_gas',
      'gas_ch4': 'toxic_gas'
    };
    
    return typeMap[parameter] || 'maintenance_required';
  }

  // Gerar mensagem de alerta
  generateAlertMessage(sensorId, alert) {
    const parameterNames = {
      'water_level': 'nível de água',
      'gas_co': 'concentração de CO',
      'gas_h2s': 'concentração de H2S',
      'gas_ch4': 'concentração de CH4'
    };

    const paramName = parameterNames[alert.parameter] || alert.parameter;
    const level = alert.level === 'critical' ? 'crítico' : 'elevado';
    
    return `${level.charAt(0).toUpperCase() + level.slice(1)} ${paramName} detectado no sensor ${sensorId}: ${alert.value} (limite: ${alert.threshold})`;
  }

  // Resolver alerta automaticamente
  async resolveAlert(alertId, reason = 'Resolvido automaticamente') {
    try {
      await db.query(`
        UPDATE alerts 
        SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status != 'resolved'
      `, [alertId]);

      // Emitir atualização via WebSocket
      if (this.io) {
        this.io.to('dashboard').emit('alert_resolved', {
          id: alertId,
          resolved_at: new Date(),
          reason
        });
      }

      console.log(`✅ Alerta ${alertId} resolvido: ${reason}`);
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
    }
  }
}

module.exports = new AlertService();

