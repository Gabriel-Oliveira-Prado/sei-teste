const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/dashboard/overview - Visão geral do dashboard
router.get('/overview', async (req, res) => {
  try {
    // Estatísticas gerais dos sensores
    const sensorStats = await db.query(`
      SELECT 
        COUNT(*) as total_sensors,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_sensors,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_sensors,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_sensors
      FROM sensors
    `);
    
    // Alertas ativos por severidade
    const alertStats = await db.query(`
      SELECT 
        COUNT(*) as total_active_alerts,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_alerts,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_alerts,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_alerts,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_alerts
      FROM alerts
      WHERE status = 'active'
    `);
    
    // Leituras recentes por nível de alerta
    const readingStats = await db.query(`
      SELECT 
        alert_level,
        COUNT(*) as count
      FROM sensor_readings
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY alert_level
    `);
    
    // Sensores com alertas ativos
    const sensorsWithAlerts = await db.query(`
      SELECT 
        s.sensor_id,
        s.location_name,
        s.latitude,
        s.longitude,
        s.sensor_type,
        COUNT(a.id) as active_alerts,
        MAX(a.severity) as max_severity,
        MAX(sr.timestamp) as last_reading
      FROM sensors s
      LEFT JOIN alerts a ON s.sensor_id = a.sensor_id AND a.status = 'active'
      LEFT JOIN sensor_readings sr ON s.sensor_id = sr.sensor_id
      WHERE s.status = 'active'
      GROUP BY s.id
      HAVING active_alerts > 0
      ORDER BY 
        CASE MAX(a.severity)
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        active_alerts DESC
    `);
    
    res.json({
      success: true,
      data: {
        sensors: sensorStats[0],
        alerts: alertStats[0],
        readings: readingStats,
        sensors_with_alerts: sensorsWithAlerts
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados do dashboard'
    });
  }
});

// GET /api/dashboard/map-data - Dados para o mapa
router.get('/map-data', async (req, res) => {
  try {
    const mapData = await db.query(`
      SELECT 
        s.sensor_id,
        s.location_name,
        s.latitude,
        s.longitude,
        s.sensor_type,
        s.status,
        COUNT(a.id) as active_alerts,
        COALESCE(MAX(CASE 
          WHEN a.severity = 'critical' THEN 4
          WHEN a.severity = 'high' THEN 3
          WHEN a.severity = 'medium' THEN 2
          WHEN a.severity = 'low' THEN 1
          ELSE 0
        END), 0) as max_severity_level,
        MAX(a.severity) as max_severity,
        MAX(sr.timestamp) as last_reading,
        sr_latest.reading_data as latest_reading_data,
        sr_latest.alert_level as latest_alert_level
      FROM sensors s
      LEFT JOIN alerts a ON s.sensor_id = a.sensor_id AND a.status = 'active'
      LEFT JOIN sensor_readings sr ON s.sensor_id = sr.sensor_id
      LEFT JOIN (
        SELECT DISTINCT
          sr1.sensor_id,
          sr1.reading_data,
          sr1.alert_level,
          sr1.timestamp
        FROM sensor_readings sr1
        INNER JOIN (
          SELECT sensor_id, MAX(timestamp) as max_timestamp
          FROM sensor_readings
          GROUP BY sensor_id
        ) sr2 ON sr1.sensor_id = sr2.sensor_id AND sr1.timestamp = sr2.max_timestamp
      ) sr_latest ON s.sensor_id = sr_latest.sensor_id
      GROUP BY s.id
      ORDER BY s.sensor_id
    `);
    
    res.json({
      success: true,
      data: mapData
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados do mapa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados do mapa'
    });
  }
});

// GET /api/dashboard/recent-alerts - Alertas recentes
router.get('/recent-alerts', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentAlerts = await db.query(`
      SELECT 
        a.*,
        s.location_name,
        s.latitude,
        s.longitude
      FROM alerts a
      LEFT JOIN sensors s ON a.sensor_id = s.sensor_id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json({
      success: true,
      data: recentAlerts
    });
    
  } catch (error) {
    console.error('Erro ao buscar alertas recentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar alertas recentes'
    });
  }
});

// GET /api/dashboard/charts/readings-timeline - Dados para gráfico de leituras ao longo do tempo
router.get('/charts/readings-timeline', async (req, res) => {
  try {
    const { hours = 24, sensor_id } = req.query;
    
    let whereClause = 'WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)';
    let params = [parseInt(hours)];
    
    if (sensor_id) {
      whereClause += ' AND sensor_id = ?';
      params.push(sensor_id);
    }
    
    const timelineData = await db.query(`
      SELECT 
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
        alert_level,
        COUNT(*) as count,
        AVG(CAST(JSON_EXTRACT(reading_data, '$.water_level') AS DECIMAL(10,2))) as avg_water_level,
        AVG(CAST(JSON_EXTRACT(reading_data, '$.gas_co') AS DECIMAL(10,2))) as avg_gas_co,
        AVG(CAST(JSON_EXTRACT(reading_data, '$.gas_h2s') AS DECIMAL(10,2))) as avg_gas_h2s
      FROM sensor_readings
      ${whereClause}
      GROUP BY hour, alert_level
      ORDER BY hour ASC
    `, params);
    
    res.json({
      success: true,
      data: timelineData
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados do gráfico de timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados do gráfico de timeline'
    });
  }
});

// GET /api/dashboard/charts/alert-distribution - Distribuição de alertas
router.get('/charts/alert-distribution', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const distributionData = await db.query(`
      SELECT 
        alert_type,
        severity,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM alerts
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY alert_type, severity, DATE(created_at)
      ORDER BY date DESC, count DESC
    `, [parseInt(days)]);
    
    res.json({
      success: true,
      data: distributionData
    });
    
  } catch (error) {
    console.error('Erro ao buscar distribuição de alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar distribuição de alertas'
    });
  }
});

// GET /api/dashboard/system-health - Saúde do sistema
router.get('/system-health', async (req, res) => {
  try {
    // Verificar sensores offline (sem leituras nas últimas 2 horas)
    const offlineSensors = await db.query(`
      SELECT s.sensor_id, s.location_name, MAX(sr.timestamp) as last_reading
      FROM sensors s
      LEFT JOIN sensor_readings sr ON s.sensor_id = sr.sensor_id
      WHERE s.status = 'active'
      GROUP BY s.id
      HAVING last_reading IS NULL OR last_reading < DATE_SUB(NOW(), INTERVAL 2 HOUR)
    `);
    
    // Estatísticas de performance
    const performanceStats = await db.query(`
      SELECT 
        COUNT(*) as total_readings_today,
        COUNT(DISTINCT sensor_id) as active_sensors_today,
        AVG(TIMESTAMPDIFF(SECOND, LAG(timestamp) OVER (PARTITION BY sensor_id ORDER BY timestamp), timestamp)) as avg_reading_interval
      FROM sensor_readings
      WHERE DATE(timestamp) = CURDATE()
    `);
    
    res.json({
      success: true,
      data: {
        offline_sensors: offlineSensors,
        performance: performanceStats[0],
        system_status: offlineSensors.length === 0 ? 'healthy' : 'warning'
      }
    });
    
  } catch (error) {
    console.error('Erro ao verificar saúde do sistema:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar saúde do sistema'
    });
  }
});

module.exports = router;

