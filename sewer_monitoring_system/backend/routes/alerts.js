const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/alerts - Listar alertas
router.get('/', async (req, res) => {
  try {
    const { status = 'active', limit = 50, offset = 0, severity, sensor_id } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (status && status !== 'all') {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }
    
    if (severity) {
      whereClause += ' AND a.severity = ?';
      params.push(severity);
    }
    
    if (sensor_id) {
      whereClause += ' AND a.sensor_id = ?';
      params.push(sensor_id);
    }
    
    const alerts = await db.query(`
      SELECT a.*, s.location_name, s.latitude, s.longitude
      FROM alerts a
      LEFT JOIN sensors s ON a.sensor_id = s.sensor_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar alertas'
    });
  }
});

// GET /api/alerts/stats - Estatísticas de alertas
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END) as acknowledged,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN severity = 'critical' AND status = 'active' THEN 1 ELSE 0 END) as critical_active,
        SUM(CASE WHEN severity = 'high' AND status = 'active' THEN 1 ELSE 0 END) as high_active,
        SUM(CASE WHEN severity = 'medium' AND status = 'active' THEN 1 ELSE 0 END) as medium_active,
        SUM(CASE WHEN severity = 'low' AND status = 'active' THEN 1 ELSE 0 END) as low_active
      FROM alerts
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    
    const alertsByType = await db.query(`
      SELECT 
        alert_type,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
      FROM alerts
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY alert_type
    `);
    
    res.json({
      success: true,
      data: {
        summary: stats[0],
        by_type: alertsByType
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas de alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas de alertas'
    });
  }
});

// POST /api/alerts - Criar novo alerta
router.post('/', async (req, res) => {
  try {
    const { sensor_id, alert_type, severity, message, alert_data } = req.body;
    
    if (!sensor_id || !alert_type || !severity || !message) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: sensor_id, alert_type, severity, message'
      });
    }
    
    const result = await db.query(`
      INSERT INTO alerts (sensor_id, alert_type, severity, message, alert_data)
      VALUES (?, ?, ?, ?, ?)
    `, [sensor_id, alert_type, severity, message, JSON.stringify(alert_data || {})]);
    
    // Emitir alerta via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard').emit('new_alert', {
        id: result.insertId,
        sensor_id,
        alert_type,
        severity,
        message,
        created_at: new Date()
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        sensor_id,
        alert_type,
        severity,
        message,
        created_at: new Date()
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar alerta'
    });
  }
});

// PUT /api/alerts/:alertId/acknowledge - Reconhecer alerta
router.put('/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    const result = await db.query(`
      UPDATE alerts 
      SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'active'
    `, [alertId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alerta não encontrado ou já processado'
      });
    }
    
    // Emitir atualização via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard').emit('alert_acknowledged', {
        id: alertId,
        acknowledged_at: new Date()
      });
    }
    
    res.json({
      success: true,
      message: 'Alerta reconhecido com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao reconhecer alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao reconhecer alerta'
    });
  }
});

// PUT /api/alerts/:alertId/resolve - Resolver alerta
router.put('/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    const result = await db.query(`
      UPDATE alerts 
      SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [alertId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alerta não encontrado'
      });
    }
    
    // Emitir atualização via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard').emit('alert_resolved', {
        id: alertId,
        resolved_at: new Date()
      });
    }
    
    res.json({
      success: true,
      message: 'Alerta resolvido com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao resolver alerta'
    });
  }
});

// GET /api/alerts/:alertId - Buscar alerta específico
router.get('/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    const [alert] = await db.query(`
      SELECT a.*, s.location_name, s.latitude, s.longitude
      FROM alerts a
      LEFT JOIN sensors s ON a.sensor_id = s.sensor_id
      WHERE a.id = ?
    `, [alertId]);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alerta não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: alert
    });
    
  } catch (error) {
    console.error('Erro ao buscar alerta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar alerta'
    });
  }
});

module.exports = router;

