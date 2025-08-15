const axios = require('axios');
const db = require('../config/database');

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com/send';
    this.token = process.env.WHATSAPP_TOKEN || 'demo_token';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || 'demo_phone';
    this.isEnabled = process.env.NODE_ENV === 'production'; // Apenas em produção
  }

  // Enviar alerta via WhatsApp
  async sendAlert(alert) {
    try {
      if (!this.isEnabled) {
        console.log(`📱 [SIMULADO] WhatsApp - Alerta ${alert.id}: ${alert.message}`);
        return true; // Simular sucesso em desenvolvimento
      }

      // Buscar usuários que devem receber notificações
      const recipients = await this.getAlertRecipients(alert);
      
      if (recipients.length === 0) {
        console.log('Nenhum destinatário encontrado para o alerta');
        return false;
      }

      const message = this.formatAlertMessage(alert);
      let sentCount = 0;

      for (const recipient of recipients) {
        try {
          const sent = await this.sendMessage(recipient.phone_number, message);
          if (sent) {
            sentCount++;
            
            // Registrar envio no log
            await this.logMessageSent(alert.id, recipient.id, 'success');
          }
        } catch (error) {
          console.error(`Erro ao enviar para ${recipient.phone_number}:`, error);
          await this.logMessageSent(alert.id, recipient.id, 'failed', error.message);
        }
      }

      return sentCount > 0;

    } catch (error) {
      console.error('Erro no serviço WhatsApp:', error);
      return false;
    }
  }

  // Buscar destinatários para o alerta
  async getAlertRecipients(alert) {
    try {
      // Buscar usuários que devem receber notificações baseado na severidade
      const severityFilter = alert.severity === 'critical' ? 
        "role IN ('admin', 'operator')" : 
        "role = 'admin'";

      const recipients = await db.query(`
        SELECT id, username, phone_number, role
        FROM users
        WHERE whatsapp_notifications = TRUE 
        AND phone_number IS NOT NULL 
        AND phone_number != ''
        AND ${severityFilter}
      `);

      return recipients;
    } catch (error) {
      console.error('Erro ao buscar destinatários:', error);
      return [];
    }
  }

  // Formatar mensagem de alerta
  formatAlertMessage(alert) {
    const severityEmoji = {
      'critical': '🚨',
      'high': '⚠️',
      'medium': '🔶',
      'low': '🔵'
    };

    const typeEmoji = {
      'flood_risk': '🌊',
      'toxic_gas': '☠️',
      'maintenance_required': '🔧',
      'sensor_offline': '📡'
    };

    const emoji = severityEmoji[alert.severity] || '⚠️';
    const typeIcon = typeEmoji[alert.alert_type] || '📊';

    return `${emoji} *ALERTA DO SISTEMA DE MONITORAMENTO* ${typeIcon}

*Sensor:* ${alert.sensor_id}
*Local:* ${alert.location_name || 'Não informado'}
*Tipo:* ${this.getAlertTypeDescription(alert.alert_type)}
*Severidade:* ${this.getSeverityDescription(alert.severity)}

*Descrição:*
${alert.message}

*Data/Hora:* ${new Date(alert.created_at).toLocaleString('pt-BR')}

_Sistema de Monitoramento de Bueiros_
_Responda com "OK" para confirmar recebimento_`;
  }

  // Enviar mensagem individual
  async sendMessage(phoneNumber, message) {
    try {
      if (!this.isEnabled) {
        console.log(`📱 [SIMULADO] Enviando para ${phoneNumber}: ${message.substring(0, 50)}...`);
        return true;
      }

      // Implementação real da API do WhatsApp Business
      const response = await axios.post(`${this.apiUrl}/messages`, {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.status === 200;

    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      return false;
    }
  }

  // Registrar envio de mensagem
  async logMessageSent(alertId, userId, status, errorMessage = null) {
    try {
      await db.query(`
        INSERT INTO system_logs (log_level, component, message, log_data)
        VALUES (?, 'whatsapp', ?, ?)
      `, [
        status === 'success' ? 'info' : 'error',
        `WhatsApp message ${status} for alert ${alertId}`,
        JSON.stringify({
          alert_id: alertId,
          user_id: userId,
          status,
          error: errorMessage,
          timestamp: new Date()
        })
      ]);
    } catch (error) {
      console.error('Erro ao registrar log de WhatsApp:', error);
    }
  }

  // Enviar mensagem de teste
  async sendTestMessage(phoneNumber) {
    const testMessage = `🧪 *TESTE DO SISTEMA DE MONITORAMENTO*

Este é um teste de conectividade do sistema de alertas via WhatsApp.

*Data/Hora:* ${new Date().toLocaleString('pt-BR')}

Se você recebeu esta mensagem, o sistema está funcionando corretamente.

_Sistema de Monitoramento de Bueiros_`;

    return await this.sendMessage(phoneNumber, testMessage);
  }

  // Processar resposta recebida (webhook)
  async processIncomingMessage(phoneNumber, message) {
    try {
      const normalizedMessage = message.toLowerCase().trim();
      
      // Verificar se é confirmação de alerta
      if (['ok', 'recebido', 'confirmado', 'ciente'].includes(normalizedMessage)) {
        // Buscar usuário pelo telefone
        const [user] = await db.query(
          'SELECT id FROM users WHERE phone_number = ?',
          [phoneNumber]
        );

        if (user) {
          // Registrar confirmação
          await db.query(`
            INSERT INTO system_logs (log_level, component, message, log_data)
            VALUES ('info', 'whatsapp', 'Alert confirmation received', ?)
          `, [JSON.stringify({
            user_id: user.id,
            phone_number: phoneNumber,
            message: normalizedMessage,
            timestamp: new Date()
          })]);

          // Enviar confirmação de recebimento
          await this.sendMessage(phoneNumber, '✅ Confirmação recebida. Obrigado!');
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao processar mensagem recebida:', error);
      return false;
    }
  }

  // Obter descrição do tipo de alerta
  getAlertTypeDescription(alertType) {
    const descriptions = {
      'flood_risk': 'Risco de Alagamento',
      'toxic_gas': 'Gás Tóxico Detectado',
      'maintenance_required': 'Manutenção Necessária',
      'sensor_offline': 'Sensor Offline'
    };
    
    return descriptions[alertType] || alertType;
  }

  // Obter descrição da severidade
  getSeverityDescription(severity) {
    const descriptions = {
      'critical': 'CRÍTICA',
      'high': 'ALTA',
      'medium': 'MÉDIA',
      'low': 'BAIXA'
    };
    
    return descriptions[severity] || severity.toUpperCase();
  }

  // Verificar status do serviço
  getServiceStatus() {
    return {
      enabled: this.isEnabled,
      api_url: this.apiUrl,
      has_token: !!this.token,
      has_phone_id: !!this.phoneNumberId,
      environment: process.env.NODE_ENV
    };
  }
}

module.exports = new WhatsAppService();

