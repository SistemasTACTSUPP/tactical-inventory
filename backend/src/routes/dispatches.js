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
    const { date, employeeId, employeeName, service, site, dispatchType, items, receiptImage } = req.body;

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
      const insertQuery = isPostgreSQL
        ? `INSERT INTO dispatches 
           (date, employee_id, employee_name, service, site, dispatch_type, status, total_items, created_by, receipt_image)
           VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', $7, $8, $9) RETURNING id`
        : `INSERT INTO dispatches 
           (date, employee_id, employee_name, service, site, dispatch_type, status, total_items, created_by, receipt_image)
           VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?, ?)`;
      
      const totalItems = items.reduce((sum, item) => sum + (item.qty || 0), 0);
      const [dispatchResult] = await connection.execute(
        insertQuery,
        [date, employeeId, employeeName, service, site, dispatchType || 'Normal', 
         totalItems, req.user.name, receiptImage || null]
      );

      const dispatchId = isPostgreSQL 
        ? (dispatchResult[0]?.id || dispatchResult.id)
        : (dispatchResult.insertId || dispatchResult[0]?.id);


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

// Actualizar salida
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, employeeId, employeeName, service, site, dispatchType, items } = req.body;

    if (!date || !employeeId || !employeeName || !service || !site || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Obtener la salida original para verificar permisos
    const [dispatches] = await pool.execute(
      'SELECT site, status FROM dispatches WHERE id = ?',
      [id]
    );

    if (dispatches.length === 0) {
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    const originalDispatch = dispatches[0];

    // Solo se pueden modificar salidas pendientes
    if (originalDispatch.status === 'Aprobado') {
      return res.status(400).json({ error: 'No se pueden modificar salidas aprobadas' });
    }

    // Verificar permisos
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      
      if (roleSiteMap[req.user.role] !== originalDispatch.site || roleSiteMap[req.user.role] !== site) {
        return res.status(403).json({ error: 'No puedes modificar salidas de este inventario' });
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Obtener items originales para revertir stock
      const [originalItems] = await connection.execute(
        'SELECT code, qty FROM dispatch_items WHERE dispatch_id = ?',
        [id]
      );

      // Revertir stock original
      for (const item of originalItems) {
        await connection.execute(
          `UPDATE inventory_items 
           SET stock_new = stock_new + ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE code = ? AND site = ?`,
          [item.qty, item.code, originalDispatch.site]
        );
      }

      // Eliminar items antiguos
      await connection.execute('DELETE FROM dispatch_items WHERE dispatch_id = ?', [id]);

      // Actualizar salida
      await connection.execute(
        `UPDATE dispatches 
         SET date = ?, employee_id = ?, employee_name = ?, service = ?, site = ?, 
             dispatch_type = ?, total_items = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [date, employeeId, employeeName, service, site, dispatchType || 'Normal',
         items.reduce((sum, item) => sum + item.qty, 0), id]
      );

      // Crear nuevos items
      for (const item of items) {
        await connection.execute(
          'INSERT INTO dispatch_items (dispatch_id, code, description, qty) VALUES (?, ?, ?, ?)',
          [id, item.code, item.description, item.qty]
        );

        // Actualizar stock en inventario
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
      emitInventoryUpdate(site, { type: 'dispatch-updated', dispatchId: id });
      
      res.json({ message: 'Salida actualizada correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar salida:', error);
    res.status(500).json({ error: 'Error al actualizar salida' });
  }
});

// Eliminar salida
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la salida para verificar permisos
    const [dispatches] = await pool.execute(
      'SELECT site, status FROM dispatches WHERE id = ?',
      [id]
    );

    if (dispatches.length === 0) {
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    const dispatch = dispatches[0];

    // Verificar permisos: Admin puede eliminar cualquier salida, usuarios de almacén solo las de su sitio
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      
      if (roleSiteMap[req.user.role] !== dispatch.site) {
        return res.status(403).json({ error: 'No puedes eliminar salidas de este inventario' });
      }
    }

    // Solo se pueden eliminar salidas pendientes o canceladas
    if (dispatch.status === 'Aprobado') {
      return res.status(400).json({ error: 'No se pueden eliminar salidas aprobadas' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Obtener items de la salida para revertir stock (solo si estaba aprobada)
      if (dispatch.status === 'Aprobado') {
        const [items] = await connection.execute(
          'SELECT code, qty FROM dispatch_items WHERE dispatch_id = ?',
          [id]
        );

        // Revertir stock en inventario
        for (const item of items) {
          await connection.execute(
            `UPDATE inventory_items 
             SET stock_new = stock_new + ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE code = ? AND site = ?`,
            [item.qty, item.code, dispatch.site]
          );
        }
      }

      // Eliminar items de salida
      await connection.execute('DELETE FROM dispatch_items WHERE dispatch_id = ?', [id]);
      
      // Eliminar salida
      await connection.execute('DELETE FROM dispatches WHERE id = ?', [id]);

      await connection.commit();
      
      // Emitir eventos en tiempo real
      emitInventoryUpdate(dispatch.site, { type: 'dispatch-deleted', dispatchId: id });
      
      res.json({ message: 'Salida eliminada correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al eliminar salida:', error);
    res.status(500).json({ error: 'Error al eliminar salida' });
  }
});

export default router;

