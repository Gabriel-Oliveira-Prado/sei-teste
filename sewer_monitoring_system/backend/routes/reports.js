const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/reports/sensors - Relatório de sensores
router.get('/sensors', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      sensor_id, 
      location, 
      sensor_type, 
      status,
      limit = 100, 
      offset = 0,
      export_format 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (start_date) {
      whereClause += ' AND sr.timestamp >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND sr.timestamp <= ?';
      params.push(end_date);
    }
    
    if (sensor_id) {
      whereClause += ' AND s.sensor_id = ?';
      params.push(sensor_id);
    }
    
    if (location) {
      whereClause += ' AND s.location_name LIKE ?';
      params.push(`%${location}%`);
    }
    
    if (sensor_type) {
      whereClause += ' AND s.sensor_type = ?';
      params.push(sensor_type);
    }
    
    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }
    
    const reportData = await db.query(`
      SELECT 
        s.sensor_id,
        s.location_name,
        s.latitude,
        s.longitude,
        s.sensor_type,
        s.status,
        sr.timestamp,
        sr.reading_data,
        sr.alert_level,
        COUNT(a.id) as alerts_count
      FROM sensors s
      LEFT JOIN sensor_readings sr ON s.sensor_id = sr.sensor_id
      LEFT JOIN alerts a ON s.sensor_id = a.sensor_id AND a.created_at BETWEEN COALESCE(?, '1900-01-01') AND COALESCE(?, '2100-12-31')
      ${whereClause}
      GROUP BY s.id, sr.id
      ORDER BY sr.timestamp DESC
      LIMIT ? OFFSET ?
    `, [start_date || '1900-01-01', end_date || '2100-12-31', ...params, parseInt(limit), parseInt(offset)]);
    
    // Contar total de registros para paginação
    const [countResult] = await db.query(`
      SELECT COUNT(DISTINCT sr.id) as total
      FROM sensors s
      LEFT JOIN sensor_readings sr ON s.sensor_id = sr.sensor_id
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: reportData,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar relatório de sensores:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar relatório de sensores'
    });
  }
});

// GET /api/reports/alerts - Relatório de alertas
router.get('/alerts', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      sensor_id, 
      alert_type, 
      severity, 
      status,
      limit = 100, 
      offset = 0 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (start_date) {
      whereClause += ' AND a.created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND a.created_at <= ?';
      params.push(end_date);
    }
    
    if (sensor_id) {
      whereClause += ' AND a.sensor_id = ?';
      params.push(sensor_id);
    }
    
    if (alert_type) {
      whereClause += ' AND a.alert_type = ?';
      params.push(alert_type);
    }
    
    if (severity) {
      whereClause += ' AND a.severity = ?';
      params.push(severity);
    }
    
    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }
    
    const alertsReport = await db.query(`
      SELECT 
        a.*,
        s.location_name,
        s.latitude,
        s.longitude,
        s.sensor_type,
        TIMESTAMPDIFF(MINUTE, a.created_at, COALESCE(a.resolved_at, NOW())) as duration_minutes
      FROM alerts a
      LEFT JOIN sensors s ON a.sensor_id = s.sensor_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    
    // Estatísticas do relatório
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_alerts,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(resolved_at, NOW()))) as avg_duration_minutes,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_count
      FROM alerts a
      LEFT JOIN sensors s ON a.sensor_id = s.sensor_id
      ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: alertsReport,
      statistics: stats[0],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar relatório de alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar relatório de alertas'
    });
  }
});

// GET /api/reports/performance - Relatório de performance
router.get('/performance', async (req, res) => {
  try {
    const { start_date, end_date, sensor_id } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (start_date) {
      whereClause += ' AND timestamp >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND timestamp <= ?';
      params.push(end_date);
    }
    
    if (sensor_id) {
      whereClause += ' AND sensor_id = ?';
      params.push(sensor_id);
    }
    
    // Estatísticas de leituras por sensor
    const sensorPerformance = await db.query(`
      SELECT 
        sr.sensor_id,
        s.location_name,
        COUNT(*) as total_readings,
        COUNT(CASE WHEN sr.alert_level = 'normal' THEN 1 END) as normal_readings,
        COUNT(CASE WHEN sr.alert_level = 'warning' THEN 1 END) as warning_readings,
        COUNT(CASE WHEN sr.alert_level = 'critical' THEN 1 END) as critical_readings,
        MIN(sr.timestamp) as first_reading,
        MAX(sr.timestamp) as last_reading,
        AVG(TIMESTAMPDIFF(SECOND, 
          LAG(sr.timestamp) OVER (PARTITION BY sr.sensor_id ORDER BY sr.timestamp), 
          sr.timestamp
        )) as avg_interval_seconds
      FROM sensor_readings sr
      LEFT JOIN sensors s ON sr.sensor_id = s.sensor_id
      ${whereClause}
      GROUP BY sr.sensor_id
      ORDER BY total_readings DESC
    `, params);
    
    // Tendências por dia
    const dailyTrends = await db.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total_readings,
        COUNT(DISTINCT sensor_id) as active_sensors,
        COUNT(CASE WHEN alert_level = 'critical' THEN 1 END) as critical_readings,
        COUNT(CASE WHEN alert_level = 'warning' THEN 1 END) as warning_readings
      FROM sensor_readings
      ${whereClause}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
      LIMIT 30
    `, params);
    
    res.json({
      success: true,
      data: {
        sensor_performance: sensorPerformance,
        daily_trends: dailyTrends
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar relatório de performance:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar relatório de performance'
    });
  }
});

// GET /api/reports/summary - Relatório resumo
router.get('/summary', async (req, res) => {
  try {
    const { period = '7' } = req.query; // dias
    
    const summary = await db.query(`
      SELECT 
        'sensors' as category,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM sensors
      
      UNION ALL
      
      SELECT 
        'readings' as category,
        COUNT(*) as total,
        COUNT(CASE WHEN alert_level = 'normal' THEN 1 END) as normal,
        COUNT(CASE WHEN alert_level = 'warning' THEN 1 END) as warning,
        COUNT(CASE WHEN alert_level = 'critical' THEN 1 END) as critical
      FROM sensor_readings
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
      
      UNION ALL
      
      SELECT 
        'alerts' as category,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM alerts
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [parseInt(period), parseInt(period)]);
    
    // Top sensores com mais alertas
    const topAlertSensors = await db.query(`
      SELECT 
        s.sensor_id,
        s.location_name,
        COUNT(a.id) as alert_count,
        MAX(a.severity) as max_severity
      FROM sensors s
      LEFT JOIN alerts a ON s.sensor_id = a.sensor_id 
        AND a.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY s.id
      HAVING alert_count > 0
      ORDER BY alert_count DESC
      LIMIT 5
    `, [parseInt(period)]);
    
    res.json({
      success: true,
      data: {
        period_days: parseInt(period),
        summary: summary,
        top_alert_sensors: topAlertSensors,
        generated_at: new Date()
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar relatório resumo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar relatório resumo'
    });
  }
});

// POST /api/reports/export - Exportar relatório
router.post('/export', async (req, res) => {
  try {
    const { report_type, format = 'json', filters = {} } = req.body;
    
    if (!report_type) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de relatório é obrigatório'
      });
    }
    
    // Simular exportação (em produção, geraria arquivo CSV/PDF)
    const exportData = {
      report_type,
      format,
      filters,
      generated_at: new Date(),
      status: 'completed',
      download_url: `/api/reports/download/${Date.now()}.${format}`
    };
    
    res.json({
      success: true,
      data: exportData
    });
    
  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao exportar relatório'
    });
  }
});

module.exports = router;

