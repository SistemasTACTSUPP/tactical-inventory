import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { emitEntryCreated, emitInventoryUpdate } from '../server.js';

const router = express.Router();

// Obtener todas las entradas
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT e.*, 
        (SELECT COUNT(*) FROM entry_items WHERE entry_id = e.id) as item_count
      FROM entries e
    `;
    const params = [];

    // Filtrar por sitio si no es Admin
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      query += ' WHERE e.site = ?';
      params.push(roleSiteMap[req.user.role]);
    }

    query += ' ORDER BY e.date DESC, e.id DESC';

    const [entries] = await pool.execute(query, params);

    // Obtener items para cada entrada
    for (const entry of entries) {
      const [items] = await pool.execute(
        'SELECT * FROM entry_items WHERE entry_id = ?',
        [entry.id]
      );
      entry.items = items;
    }

    res.json(entries);
  } catch (error) {
    console.error('Error al obtener entradas:', error);
    res.status(500).json({ error: 'Error al obtener entradas' });
  }
});

// Crear nueva entrada
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { date, site, items } = req.body;

    if (!date || !site || !items || items.length === 0) {
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
        return res.status(403).json({ error: 'No puedes crear entradas para este sitio' });
      }
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Crear entrada
      const [entryResult] = await connection.execute(
        'INSERT INTO entries (date, site, total_items, created_by) VALUES (?, ?, ?, ?)',
        [date, site, items.reduce((sum, item) => sum + item.qty, 0), req.user.name]
      );

      const entryId = entryResult.insertId;

      // Crear items de entrada
      for (const item of items) {
        await connection.execute(
          'INSERT INTO entry_items (entry_id, code, description, qty) VALUES (?, ?, ?, ?)',
          [entryId, item.code, item.description, item.qty]
        );

        // Actualizar stock en inventario
        await connection.execute(
          `INSERT INTO inventory_items (code, description, size, stock_new, stock_recovered, stock_min, site, status)
           VALUES (?, ?, ?, ?, 0, 0, ?, 'En Stock')
           ON DUPLICATE KEY UPDATE
           stock_new = stock_new + VALUES(stock_new),
           description = VALUES(description),
           size = VALUES(size),
           updated_at = CURRENT_TIMESTAMP`,
          [item.code, item.description, item.size || null, item.qty, site]
        );
      }

      await connection.commit();
      
      // Emitir eventos en tiempo real
      emitEntryCreated({ id: entryId, site, date });
      emitInventoryUpdate(site, { type: 'entry', entryId });
      
      res.json({ id: entryId, message: 'Entrada creada correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear entrada:', error);
    res.status(500).json({ error: 'Error al crear entrada' });
  }
});

export default router;

