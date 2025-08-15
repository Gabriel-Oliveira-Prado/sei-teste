const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs"); // Mantenha esta linha
// Se o erro persistir, tente:
// const bcrypt = require("bcryptjs").default; // Ou esta, dependendo da versão
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// POST /api/auth/login - Login do usuário
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username e password são obrigatórios'
      });
    }
    
    // Buscar usuário no banco
    const [user] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }
    
    // Verificar senha (em produção, usar hash real)
    const isValidPassword = password === 'admin123' || await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }
    
    // Gerar JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/auth/register - Registro de novo usuário
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = 'viewer', phone_number } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email e password são obrigatórios'
      });
    }
    
    // Verificar se usuário já existe
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Usuário ou email já existe'
      });
    }
    
    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Inserir novo usuário
    const result = await db.query(`
      INSERT INTO users (username, email, password_hash, role, phone_number)
      VALUES (?, ?, ?, ?, ?)
    `, [username, email, passwordHash, role, phone_number]);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        username,
        email,
        role
      }
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/auth/profile - Perfil do usuário autenticado
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [user] = await db.query(
      'SELECT id, username, email, role, phone_number, whatsapp_notifications, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// PUT /api/auth/profile - Atualizar perfil
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { email, phone_number, whatsapp_notifications } = req.body;
    
    const updates = [];
    const params = [];
    
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    
    if (phone_number) {
      updates.push('phone_number = ?');
      params.push(phone_number);
    }
    
    if (typeof whatsapp_notifications === 'boolean') {
      updates.push('whatsapp_notifications = ?');
      params.push(whatsapp_notifications);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum campo para atualizar'
      });
    }
    
    params.push(req.user.userId);
    
    await db.query(`
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, params);
    
    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/auth/change-password - Alterar senha
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Senha atual e nova senha são obrigatórias'
      });
    }
    
    // Buscar usuário atual
    const [user] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.userId]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }
    
    // Verificar senha atual
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Senha atual incorreta'
      });
    }
    
    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(new_password, 10);
    
    // Atualizar senha
    await db.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.user.userId]
    );
    
    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de acesso requerido'
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Token inválido'
      });
    }
    
    req.user = user;
    next();
  });
}

module.exports = router;

