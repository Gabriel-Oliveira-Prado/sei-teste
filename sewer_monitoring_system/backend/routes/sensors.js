const express = require('express');
const router = express.Router();
const db = require('../config/database');
const alertService = require('../services/alertService');

// GET /api/sensors - Listar todos os sensores
router.get('/', async (req, res) => {
  try {
    const sensors = await db.query(`
      SELECT s.*, 
             COUNT(sr.id) as total_readings,
             MAX(sr.timestamp) as last_reading,
             (SELECT COUNT(*) FROM alerts a WHERE a.sensor_id = s.sensor_id AND a.status = 'active') as active_alerts
      FROM sensors s
      LEFT JOIN sensor_readings sr ON s.sensor_id = sr.sensor_id
      GROUP BY s.id
      ORDER BY s.sensor_id
    `);
    
    res.json({
      success: true,
      data: sensors,
      count: sensors.length
    });
  } catch (error) {
    console.error('Erro ao buscar sensores:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar sensores'
    });
  }
});

// GET /api/sensors/:sensorId - Buscar sensor específico
router.get('/:sensorId', async (req, res) => {
  try {
    const { sensorId } = req.params;
    
    const [sensor] = await db.query(`
      SELECT s.*, 
             COUNT(sr.id) as total_readings,
             MAX(sr.timestamp) as last_reading
      FROM sensors s
      LEFT JOIN sensor_readings sr ON s.sensor_id = sr.sensor_id
      WHERE s.sensor_id = ?
      GROUP BY s.id
    `, [sensorId]);
    
    if (!sensor) {
      return res.status(404).json({
        success: false,
        error: 'Sensor não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: sensor
    });
  } catch (error) {
    console.error('Erro ao buscar sensor:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar sensor'
    });
  }
});

// POST /api/sensors/:sensorId/readings - Receber dados do sensor
router.post('/:sensorId/readings', async (req, res) => {
  try {
    const { sensorId } = req.params;
    const { reading_data } = req.body;
    
    if (!reading_data) {
      return res.status(400).json({
        success: false,
        error: 'Dados de leitura são obrigatórios'
      });
    }
    
    // Verificar se sensor existe
    const [sensor] = await db.query('SELECT * FROM sensors WHERE sensor_id = ?', [sensorId]);
    if (!sensor) {
      return res.status(404).json({
        success: false,
        error: 'Sensor não encontrado'
      });
    }
    
    // Determinar nível de alerta baseado nos dados
    const alertLevel = await alertService.evaluateReading(sensorId, reading_data);
    
    // Inserir leitura no banco
    const result = await db.query(`
      INSERT INTO sensor_readings (sensor_id, reading_data, alert_level)
      VALUES (?, ?, ?)
    `, [sensorId, JSON.stringify(reading_data), alertLevel]);
    
    // Emitir atualização via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard').emit('sensor_reading', {
        sensor_id: sensorId,
        reading_data,
        alert_level: alertLevel,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      data: {
        id: result.insertId,
        sensor_id: sensorId,
        alert_level: alertLevel,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Erro ao processar leitura do sensor:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar leitura do sensor'
    });
  }
});

// GET /api/sensors/:sensorId/readings - Buscar leituras do sensor
router.get('/:sensorId/readings', async (req, res) => {
  try {
    const { sensorId } = req.params;
    const { limit = 100, offset = 0, start_date, end_date } = req.query;
    
    let whereClause = 'WHERE sensor_id = ?';
    let params = [sensorId];
    
    if (start_date) {
      whereClause += ' AND timestamp >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND timestamp <= ?';
      params.push(end_date);
    }
    
    const readings = await db.query(`
      SELECT * FROM sensor_readings 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    
    res.json({
      success: true,
      data: readings,
      count: readings.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar leituras:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar leituras'
    });
  }
});

// POST /api/sensors - Criar novo sensor
router.post('/', async (req, res) => {
  try {
    const { sensor_id, location_name, latitude, longitude, sensor_type, configuration } = req.body;
    
    if (!sensor_id || !location_name || !latitude || !longitude || !sensor_type) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: sensor_id, location_name, latitude, longitude, sensor_type'
      });
    }
    
    const result = await db.query(`
      INSERT INTO sensors (sensor_id, location_name, latitude, longitude, sensor_type, configuration)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [sensor_id, location_name, latitude, longitude, sensor_type, JSON.stringify(configuration || {})]);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        sensor_id,
        location_name,
        latitude,
        longitude,
        sensor_type
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar sensor:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({
        success: false,
        error: 'Sensor com este ID já existe'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao criar sensor'
      });
    }
  }
});

// PUT /api/sensors/:sensorId - Atualizar sensor
router.put('/:sensorId', async (req, res) => {
  try {
    const { sensorId } = req.params;
    const { location_name, latitude, longitude, sensor_type, status, configuration } = req.body;
    
    const updates = [];
    const params = [];
    
    if (location_name) {
      updates.push('location_name = ?');
      params.push(location_name);
    }
    
    if (latitude) {
      updates.push('latitude = ?');
      params.push(latitude);
    }
    
    if (longitude) {
      updates.push('longitude = ?');
      params.push(longitude);
    }
    
    if (sensor_type) {
      updates.push('sensor_type = ?');
      params.push(sensor_type);
    }
    
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    
    if (configuration) {
      updates.push('configuration = ?');
      params.push(JSON.stringify(configuration));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum campo para atualizar'
      });
    }
    
    params.push(sensorId);
    
    const result = await db.query(`
      UPDATE sensors 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE sensor_id = ?
    `, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sensor não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Sensor atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar sensor:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar sensor'
    });
  }
});

module.exports = router;

