-- Schema do banco de dados para Sistema de Monitoramento de Bueiros
-- Estrutura não relacional usando MySQL com documentos JSON

USE sewer_monitoring;

-- Tabela de sensores
CREATE TABLE sensors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    sensor_type ENUM('water_level', 'gas_detector', 'combined') NOT NULL,
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    installation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_maintenance DATE,
    configuration JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de leituras dos sensores (estrutura não relacional com JSON)
CREATE TABLE sensor_readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sensor_id VARCHAR(50) NOT NULL,
    reading_data JSON NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_level ENUM('normal', 'warning', 'critical') DEFAULT 'normal',
    processed BOOLEAN DEFAULT FALSE,
    INDEX idx_sensor_timestamp (sensor_id, timestamp),
    INDEX idx_alert_level (alert_level),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id) ON DELETE CASCADE
);

-- Tabela de alertas
CREATE TABLE alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sensor_id VARCHAR(50) NOT NULL,
    alert_type ENUM('flood_risk', 'toxic_gas', 'maintenance_required', 'sensor_offline') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    message TEXT NOT NULL,
    alert_data JSON,
    status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    INDEX idx_sensor_status (sensor_id, status),
    INDEX idx_severity_created (severity, created_at),
    FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id) ON DELETE CASCADE
);

-- Tabela de configurações de alertas
CREATE TABLE alert_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id VARCHAR(50) NOT NULL,
    parameter_name VARCHAR(100) NOT NULL,
    threshold_warning DECIMAL(10, 4),
    threshold_critical DECIMAL(10, 4),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_sensor_parameter (sensor_id, parameter_name),
    FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id) ON DELETE CASCADE
);

-- Tabela de usuários (para autenticação)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operator', 'viewer') DEFAULT 'viewer',
    phone_number VARCHAR(20),
    whatsapp_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de logs do sistema
CREATE TABLE system_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    log_level ENUM('info', 'warning', 'error', 'critical') NOT NULL,
    component VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    log_data JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level_timestamp (log_level, timestamp),
    INDEX idx_component (component)
);

-- Inserir dados de exemplo
INSERT INTO sensors (sensor_id, location_name, latitude, longitude, sensor_type, configuration) VALUES
('SENSOR_001', 'Rua das Flores, 123', -23.5505, -46.6333, 'combined', '{"water_max_level": 90, "gas_threshold_co": 50, "gas_threshold_h2s": 20}'),
('SENSOR_002', 'Avenida Paulista, 456', -23.5618, -46.6565, 'water_level', '{"water_max_level": 85}'),
('SENSOR_003', 'Praça da Sé, 789', -23.5507, -46.6344, 'gas_detector', '{"gas_threshold_co": 45, "gas_threshold_h2s": 15}'),
('SENSOR_004', 'Rua Augusta, 321', -23.5540, -46.6520, 'combined', '{"water_max_level": 95, "gas_threshold_co": 55, "gas_threshold_h2s": 25}'),
('SENSOR_005', 'Vila Madalena, 654', -23.5447, -46.6890, 'water_level', '{"water_max_level": 80}');

-- Inserir configurações de alertas
INSERT INTO alert_configurations (sensor_id, parameter_name, threshold_warning, threshold_critical) VALUES
('SENSOR_001', 'water_level', 70.0, 90.0),
('SENSOR_001', 'gas_co', 30.0, 50.0),
('SENSOR_001', 'gas_h2s', 10.0, 20.0),
('SENSOR_002', 'water_level', 65.0, 85.0),
('SENSOR_003', 'gas_co', 25.0, 45.0),
('SENSOR_003', 'gas_h2s', 8.0, 15.0),
('SENSOR_004', 'water_level', 75.0, 95.0),
('SENSOR_004', 'gas_co', 35.0, 55.0),
('SENSOR_004', 'gas_h2s', 12.0, 25.0),
('SENSOR_005', 'water_level', 60.0, 80.0);

-- Inserir usuário administrador padrão
INSERT INTO users (username, email, password_hash, role, phone_number) VALUES
('admin', 'admin@sewermonitoring.com', '$2b$10$rQZ8kHp.TB.It.NuiNAHu.5J9FjbqJvPzwL0P1qRZZqQQQQQQQQQQ', 'admin', '+5511999999999');

-- Inserir alguns dados de exemplo de leituras
INSERT INTO sensor_readings (sensor_id, reading_data, alert_level) VALUES
('SENSOR_001', '{"water_level": 45.2, "gas_co": 12.5, "gas_h2s": 3.2, "temperature": 22.1, "humidity": 65.8}', 'normal'),
('SENSOR_002', '{"water_level": 78.9, "temperature": 21.5, "humidity": 72.3}', 'warning'),
('SENSOR_003', '{"gas_co": 52.1, "gas_h2s": 18.7, "temperature": 23.8, "humidity": 58.2}', 'critical'),
('SENSOR_004', '{"water_level": 32.1, "gas_co": 8.9, "gas_h2s": 2.1, "temperature": 20.9, "humidity": 69.4}', 'normal'),
('SENSOR_005', '{"water_level": 89.5, "temperature": 22.7, "humidity": 71.2}', 'critical');

-- Inserir alguns alertas de exemplo
INSERT INTO alerts (sensor_id, alert_type, severity, message, alert_data, status) VALUES
('SENSOR_002', 'flood_risk', 'medium', 'Nível de água elevado detectado', '{"water_level": 78.9, "threshold": 65.0}', 'active'),
('SENSOR_003', 'toxic_gas', 'high', 'Concentração crítica de CO detectada', '{"gas_co": 52.1, "threshold": 45.0}', 'active'),
('SENSOR_005', 'flood_risk', 'critical', 'Risco iminente de alagamento', '{"water_level": 89.5, "threshold": 80.0}', 'active');

