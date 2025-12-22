import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { emitInventoryUpdate, getIO } from '../server.js';

const router = express.Router();

// Obtener todas las salidas
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM dispatches WHERE 1=1';
    const params = [];

    // Filtrar por sitio si no es Admin
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      query += ' AND site = ?';
      params.push(roleSiteMap[req.user.role]);
    }

    query += ' ORDER BY date DESC, id DESC';

    const [dispatches] = await pool.execute(query, params);

    // Obtener items para cada salida
    for (const dispatch of dispatches) {
      const [items] = await pool.execute(
        'SELECT * FROM dispatch_items WHERE dispatch_id = ?',
        [dispatch.id]
      );
      dispatch.items = items;
    }

    res.json(dispatches);
  } catch (error) {
    console.error('Error al obtener salidas:', error);
    res.status(500).json({ error: 'Error al obtener salidas' });
  }
});

// Crear nueva salida
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { date, employeeId, employeeName, service, site, dispatchType, items } = req.body;

    if (!date || !employeeId || !employeeName || !service || !site || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar permisos
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      
      if (roleSiteMap[req.user.role] !== site) {
        return res.status(403).json({ error: 'No puedes crear salidas para este sitio' });
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Crear salida
      const [dispatchResult] = await connection.execute(
        `INSERT INTO dispatches 
         (date, employee_id, employee_name, service, site, dispatch_type, status, total_items, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?)`,
        [date, employeeId, employeeName, service, site, dispatchType || 'Normal', 
         items.reduce((sum, item) => sum + item.qty, 0), req.user.name]
      );

      const dispatchId = dispatchResult.insertId;

      // Crear items de salida
      for (const item of items) {
        await connection.execute(
          'INSERT INTO dispatch_items (dispatch_id, code, description, qty) VALUES (?, ?, ?, ?)',
          [dispatchId, item.code, item.description, item.qty]
        );

        // Actualizar stock en inventario (reducir stock nuevo primero, luego recuperado)
        await connection.execute(
          `UPDATE inventory_items 
           SET stock_new = GREATEST(0, stock_new - ?),
               updated_at = CURRENT_TIMESTAMP
           WHERE code = ? AND site = ? AND stock_new >= ?`,
          [item.qty, item.code, site, item.qty]
        );

        // Si no hay suficiente stock nuevo, reducir del recuperado
        await connection.execute(
          `UPDATE inventory_items 
           SET stock_recovered = GREATEST(0, stock_recovered - ?),
               updated_at = CURRENT_TIMESTAMP
           WHERE code = ? AND site = ? AND stock_new = 0 AND stock_recovered >= ?`,
          [item.qty, item.code, site, item.qty]
        );
      }

      await connection.commit();
      
      // Emitir eventos en tiempo real
      emitInventoryUpdate(site, { type: 'dispatch', dispatchId });
      
      // Emitir evento global de nueva salida
      const { getIO } = await import('../server.js');
      const io = getIO();
      if (io) {
        io.emit('dispatch-created', { id: dispatchId, site, date });
      }

      res.json({ id: dispatchId, message: 'Salida creada correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear salida:', error);
    res.status(500).json({ error: 'Error al crear salida' });
  }
});

// Aprobar salida (solo Admin)
router.patch('/:id/approve', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute(
      `UPDATE dispatches 
       SET status = 'Aprobado', approved_by = ?, approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.name, id]
    );

    res.json({ message: 'Salida aprobada correctamente' });
  } catch (error) {
    console.error('Error al aprobar salida:', error);
    res.status(500).json({ error: 'Error al aprobar salida' });
  }
});

export default router;

