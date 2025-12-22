import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { emitInventoryUpdate, getIO } from '../server.js';

const router = express.Router();

// Obtener todas las recuperaciones
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM recoveries WHERE 1=1';
    const params = [];

    // Filtrar según el rol (lógica más compleja para recuperaciones)
    if (req.user.role !== 'Admin') {
      // Los usuarios de almacén ven recuperaciones que van a su sitio o desechos
      query += ` AND id IN (
        SELECT DISTINCT recovery_id FROM recovery_items 
        WHERE destination = ? OR destination = 'Desecho'
      )`;
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      params.push(roleSiteMap[req.user.role]);
    }

    query += ' ORDER BY date DESC, id DESC';

    const [recoveries] = await pool.execute(query, params);

    // Obtener items para cada recuperación
    for (const recovery of recoveries) {
      const [items] = await pool.execute(
        'SELECT * FROM recovery_items WHERE recovery_id = ?',
        [recovery.id]
      );
      recovery.items = items;
      
      // Calcular flags
      recovery.hasRecovered = items.some(item => item.destination !== 'Desecho');
      recovery.hasDesecho = items.some(item => item.destination === 'Desecho');
    }

    res.json(recoveries);
  } catch (error) {
    console.error('Error al obtener recuperaciones:', error);
    res.status(500).json({ error: 'Error al obtener recuperaciones' });
  }
});

// Crear nueva recuperación
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { date, employeeId, employeeName, items } = req.body;

    if (!date || !employeeId || !employeeName || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Crear recuperación
      const [recoveryResult] = await connection.execute(
        'INSERT INTO recoveries (date, employee_id, employee_name, total_items, created_by) VALUES (?, ?, ?, ?, ?)',
        [date, employeeId, employeeName, items.reduce((sum, item) => sum + item.qty, 0), req.user.name]
      );

      const recoveryId = recoveryResult.insertId;

      // Crear items de recuperación y actualizar inventario
      for (const item of items) {
        await connection.execute(
          'INSERT INTO recovery_items (recovery_id, code, description, qty, destination) VALUES (?, ?, ?, ?, ?)',
          [recoveryId, item.code, item.description, item.qty, item.destination]
        );

        // Si no es desecho, actualizar stock en el inventario destino
        if (item.destination !== 'Desecho') {
          await connection.execute(
            `INSERT INTO inventory_items 
             (code, description, size, stock_new, stock_recovered, stock_min, site, status)
             VALUES (?, ?, ?, 0, ?, 0, ?, 'En Stock')
             ON DUPLICATE KEY UPDATE
             stock_recovered = stock_recovered + VALUES(stock_recovered),
             updated_at = CURRENT_TIMESTAMP`,
            [item.code, item.description, item.size || null, item.qty, item.destination]
          );

          // Emitir actualización en tiempo real
          emitInventoryUpdate(item.destination, { type: 'recovery', recoveryId });
          
          // Emitir evento global de nueva recuperación
          const io = getIO();
          if (io) {
            io.emit('recovery-created', { id: recoveryId, destination: item.destination });
          }
        }
      }

      await connection.commit();
      res.json({ id: recoveryId, message: 'Recuperación creada correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear recuperación:', error);
    res.status(500).json({ error: 'Error al crear recuperación' });
  }
});

export default router;

