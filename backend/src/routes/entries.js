import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { emitEntryCreated, emitInventoryUpdate } from '../server.js';

const router = express.Router();

// Detectar si es PostgreSQL
const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || 
                     process.env.DB_PORT === '5432' || 
                     process.env.DB_TYPE === 'postgresql';

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
      query += isPostgreSQL ? ' WHERE e.site = $1' : ' WHERE e.site = ?';
      params.push(roleSiteMap[req.user.role]);
    }

    query += ' ORDER BY e.date DESC, e.id DESC';

    const [entries] = await pool.execute(query, params);

    // Obtener items para cada entrada
    for (const entry of entries) {
      const queryItem = isPostgreSQL 
        ? 'SELECT * FROM entry_items WHERE entry_id = $1'
        : 'SELECT * FROM entry_items WHERE entry_id = ?';
      const [items] = await pool.execute(queryItem, [entry.id]);
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

    // Para PostgreSQL, usar transacciones SQL directamente
    // Para MySQL, usar getConnection() si está disponible
    let connection = null;
    let useTransaction = false;

    try {
      // Intentar obtener conexión solo para MySQL
      if (!isPostgreSQL && typeof pool.getConnection === 'function') {
        connection = await pool.getConnection();
        if (connection && typeof connection.beginTransaction === 'function') {
          await connection.beginTransaction();
          useTransaction = true;
        }
      } else if (isPostgreSQL) {
        // Para PostgreSQL, iniciar transacción con SQL
        await pool.execute('BEGIN');
      }

      const executeQuery = connection || pool;

      // Crear entrada
      const insertEntryQuery = isPostgreSQL
        ? 'INSERT INTO entries (date, site, total_items, created_by) VALUES ($1, $2, $3, $4) RETURNING id'
        : 'INSERT INTO entries (date, site, total_items, created_by) VALUES (?, ?, ?, ?)';
      
      const [entryResult] = await executeQuery.execute(
        insertEntryQuery,
        [date, site, items.reduce((sum, item) => sum + item.qty, 0), req.user.name]
      );

      // Obtener el ID de la entrada insertada
      let entryId;
      if (isPostgreSQL) {
        entryId = entryResult[0]?.id || entryResult.id;
      } else {
        entryId = entryResult.insertId;
      }

      // Crear items de entrada
      for (const item of items) {
        const insertItemQuery = isPostgreSQL
          ? 'INSERT INTO entry_items (entry_id, code, description, qty) VALUES ($1, $2, $3, $4)'
          : 'INSERT INTO entry_items (entry_id, code, description, qty) VALUES (?, ?, ?, ?)';
        
        await executeQuery.execute(
          insertItemQuery,
          [entryId, item.code, item.description, item.qty]
        );

        // Actualizar stock en inventario - sintaxis diferente para PostgreSQL y MySQL
        if (isPostgreSQL) {
          await executeQuery.execute(
            `INSERT INTO inventory_items (code, description, size, stock_new, stock_recovered, stock_min, site, status)
             VALUES ($1, $2, $3, $4, 0, 0, $5, 'En Stock')
             ON CONFLICT (code, site) DO UPDATE SET
             stock_new = inventory_items.stock_new + EXCLUDED.stock_new,
             description = EXCLUDED.description,
             size = EXCLUDED.size,
             updated_at = CURRENT_TIMESTAMP`,
            [item.code, item.description, item.size || null, item.qty, site]
          );
        } else {
          await executeQuery.execute(
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
      }

      // Commit transacción
      if (useTransaction && connection) {
        await connection.commit();
      } else if (isPostgreSQL) {
        await pool.execute('COMMIT');
      }
      
      // Emitir eventos en tiempo real
      emitEntryCreated({ id: entryId, site, date });
      emitInventoryUpdate(site, { type: 'entry', entryId });
      
      res.json({ id: entryId, message: 'Entrada creada correctamente' });
    } catch (error) {
      // Rollback transacción
      if (useTransaction && connection) {
        await connection.rollback();
      } else if (isPostgreSQL) {
        await pool.execute('ROLLBACK');
      }
      throw error;
    } finally {
      // Solo release si es MySQL
      if (connection && typeof connection.release === 'function') {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error al crear entrada:', error);
    res.status(500).json({ error: 'Error al crear entrada' });
  }
});

// Actualizar entrada
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, site, items } = req.body;

    if (!date || !site || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Obtener la entrada original para verificar permisos
    const queryEntry = isPostgreSQL
      ? 'SELECT site FROM entries WHERE id = $1'
      : 'SELECT site FROM entries WHERE id = ?';
    const [entries] = await pool.execute(queryEntry, [id]);

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    const originalEntry = entries[0];

    // Verificar permisos
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      
      if (roleSiteMap[req.user.role] !== originalEntry.site || roleSiteMap[req.user.role] !== site) {
        return res.status(403).json({ error: 'No puedes modificar entradas de este inventario' });
      }
    }

    let connection = null;
    let useTransaction = false;

    try {
      if (!isPostgreSQL && typeof pool.getConnection === 'function') {
        connection = await pool.getConnection();
        if (connection && typeof connection.beginTransaction === 'function') {
          await connection.beginTransaction();
          useTransaction = true;
        }
      } else if (isPostgreSQL) {
        await pool.execute('BEGIN');
      }

      const executeQuery = connection || pool;

      // Obtener items originales para revertir stock
      const queryItems = isPostgreSQL
        ? 'SELECT code, qty FROM entry_items WHERE entry_id = $1'
        : 'SELECT code, qty FROM entry_items WHERE entry_id = ?';
      const [originalItems] = await executeQuery.execute(queryItems, [id]);

      // Revertir stock original
      for (const item of originalItems) {
        const updateStockQuery = isPostgreSQL
          ? `UPDATE inventory_items 
             SET stock_new = GREATEST(0, stock_new - $1),
                 updated_at = CURRENT_TIMESTAMP
             WHERE code = $2 AND site = $3`
          : `UPDATE inventory_items 
             SET stock_new = GREATEST(0, stock_new - ?),
                 updated_at = CURRENT_TIMESTAMP
             WHERE code = ? AND site = ?`;
        await executeQuery.execute(updateStockQuery, [item.qty, item.code, originalEntry.site]);
      }

      // Eliminar items antiguos
      const deleteItemsQuery = isPostgreSQL
        ? 'DELETE FROM entry_items WHERE entry_id = $1'
        : 'DELETE FROM entry_items WHERE entry_id = ?';
      await executeQuery.execute(deleteItemsQuery, [id]);

      // Actualizar entrada
      const updateEntryQuery = isPostgreSQL
        ? 'UPDATE entries SET date = $1, site = $2, total_items = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4'
        : 'UPDATE entries SET date = ?, site = ?, total_items = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      await executeQuery.execute(updateEntryQuery, [date, site, items.reduce((sum, item) => sum + item.qty, 0), id]);

      // Crear nuevos items
      for (const item of items) {
        const insertItemQuery = isPostgreSQL
          ? 'INSERT INTO entry_items (entry_id, code, description, qty) VALUES ($1, $2, $3, $4)'
          : 'INSERT INTO entry_items (entry_id, code, description, qty) VALUES (?, ?, ?, ?)';
        await executeQuery.execute(insertItemQuery, [id, item.code, item.description, item.qty]);

        // Actualizar stock en inventario
        if (isPostgreSQL) {
          await executeQuery.execute(
            `INSERT INTO inventory_items (code, description, size, stock_new, stock_recovered, stock_min, site, status)
             VALUES ($1, $2, $3, $4, 0, 0, $5, 'En Stock')
             ON CONFLICT (code, site) DO UPDATE SET
             stock_new = inventory_items.stock_new + EXCLUDED.stock_new,
             description = EXCLUDED.description,
             size = EXCLUDED.size,
             updated_at = CURRENT_TIMESTAMP`,
            [item.code, item.description, item.size || null, item.qty, site]
          );
        } else {
          await executeQuery.execute(
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
      }

      if (useTransaction && connection) {
        await connection.commit();
      } else if (isPostgreSQL) {
        await pool.execute('COMMIT');
      }
      
      // Emitir eventos en tiempo real
      emitInventoryUpdate(site, { type: 'entry-updated', entryId: id });
      
      res.json({ message: 'Entrada actualizada correctamente' });
    } catch (error) {
      if (useTransaction && connection) {
        await connection.rollback();
      } else if (isPostgreSQL) {
        await pool.execute('ROLLBACK');
      }
      throw error;
    } finally {
      if (connection && typeof connection.release === 'function') {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error al actualizar entrada:', error);
    res.status(500).json({ error: 'Error al actualizar entrada' });
  }
});

// Eliminar entrada
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la entrada para verificar permisos
    const queryEntry = isPostgreSQL
      ? 'SELECT site FROM entries WHERE id = $1'
      : 'SELECT site FROM entries WHERE id = ?';
    const [entries] = await pool.execute(queryEntry, [id]);

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    const entry = entries[0];

    // Verificar permisos
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      
      if (roleSiteMap[req.user.role] !== entry.site) {
        return res.status(403).json({ error: 'No puedes eliminar entradas de este inventario' });
      }
    }

    let connection = null;
    let useTransaction = false;

    try {
      if (!isPostgreSQL && typeof pool.getConnection === 'function') {
        connection = await pool.getConnection();
        if (connection && typeof connection.beginTransaction === 'function') {
          await connection.beginTransaction();
          useTransaction = true;
        }
      } else if (isPostgreSQL) {
        await pool.execute('BEGIN');
      }

      const executeQuery = connection || pool;

      // Obtener items de la entrada para revertir stock
      const queryItems = isPostgreSQL
        ? 'SELECT code, qty FROM entry_items WHERE entry_id = $1'
        : 'SELECT code, qty FROM entry_items WHERE entry_id = ?';
      const [items] = await executeQuery.execute(queryItems, [id]);

      // Revertir stock en inventario
      for (const item of items) {
        const updateStockQuery = isPostgreSQL
          ? `UPDATE inventory_items 
             SET stock_new = GREATEST(0, stock_new - $1),
                 updated_at = CURRENT_TIMESTAMP
             WHERE code = $2 AND site = $3`
          : `UPDATE inventory_items 
             SET stock_new = GREATEST(0, stock_new - ?),
                 updated_at = CURRENT_TIMESTAMP
             WHERE code = ? AND site = ?`;
        await executeQuery.execute(updateStockQuery, [item.qty, item.code, entry.site]);
      }

      // Eliminar items de entrada
      const deleteItemsQuery = isPostgreSQL
        ? 'DELETE FROM entry_items WHERE entry_id = $1'
        : 'DELETE FROM entry_items WHERE entry_id = ?';
      await executeQuery.execute(deleteItemsQuery, [id]);
      
      // Eliminar entrada
      const deleteEntryQuery = isPostgreSQL
        ? 'DELETE FROM entries WHERE id = $1'
        : 'DELETE FROM entries WHERE id = ?';
      await executeQuery.execute(deleteEntryQuery, [id]);

      if (useTransaction && connection) {
        await connection.commit();
      } else if (isPostgreSQL) {
        await pool.execute('COMMIT');
      }
      
      // Emitir eventos en tiempo real
      emitInventoryUpdate(entry.site, { type: 'entry-deleted', entryId: id });
      
      res.json({ message: 'Entrada eliminada correctamente' });
    } catch (error) {
      if (useTransaction && connection) {
        await connection.rollback();
      } else if (isPostgreSQL) {
        await pool.execute('ROLLBACK');
      }
      throw error;
    } finally {
      if (connection && typeof connection.release === 'function') {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error al eliminar entrada:', error);
    res.status(500).json({ error: 'Error al eliminar entrada' });
  }
});

export default router;
