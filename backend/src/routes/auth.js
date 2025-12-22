import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const router = express.Router();

// Login con código de acceso
router.post('/login', async (req, res) => {
  try {
    // Aceptar tanto 'code' como 'accessCode' para compatibilidad
    const accessCode = req.body.code || req.body.accessCode;

    if (!accessCode) {
      return res.status(400).json({ error: 'Código de acceso requerido' });
    }

    // Buscar usuario por código de acceso
    const [users] = await pool.execute(
      'SELECT id, access_code, role, name FROM users WHERE access_code = ?',
      [accessCode]
    );

    if (users.length === 0) {
      console.error(`❌ Intento de login con código inválido: ${accessCode}`);
      return res.status(401).json({ error: 'Código de acceso inválido' });
    }

    const user = users[0];
    console.log(`✅ Login exitoso: ${user.name} (${user.role})`);

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;

