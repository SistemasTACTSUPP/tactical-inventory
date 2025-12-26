import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Obtener inventario por sitio
router.get('/:site', authenticateToken, async (req, res) => {
  try {
    let { site } = req.params;
    // Normalizar el sitio a mayúsculas y manejar variaciones
    site = site.toUpperCase();
    if (site === 'ACUNA' || site === 'ACUÑA') {
      site = 'ACUÑA';
    }
    
    const allowedSites = ['CEDIS', 'ACUÑA', 'NLD'];
    
    if (!allowedSites.includes(site)) {
      return res.status(400).json({ error: `Sitio inválido: ${req.params.site}. Sitios permitidos: ${allowedSites.join(', ')}` });
    }

    // Verificar permisos
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      
      if (roleSiteMap[req.user.role] !== site) {
        return res.status(403).json({ error: 'Acceso denegado a este inventario' });
      }
    }

    const [items] = await pool.execute(
      'SELECT * FROM inventory_items WHERE site = ? ORDER BY code',
      [site]
    );

    // Transformar campos de snake_case a camelCase para el frontend
    const transformedItems = items.map(item => ({
      id: item.id,
      code: item.code,
      description: item.description,
      size: item.size,
      stockNew: item.stock_new,
      stockRecovered: item.stock_recovered,
      stockMin: item.stock_min,
      status: item.status,
      site: item.site,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    res.json(transformedItems);
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
});

// Crear o actualizar item de inventario
router.post('/:site', authenticateToken, async (req, res) => {
  try {
    const { site } = req.params;
    const { code, description, size, stockNew, stockRecovered, stockMin } = req.body;

    // Verificar permisos: Admin puede crear en cualquier sitio, usuarios de almacén solo en su sitio
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      
      if (roleSiteMap[req.user.role] !== site) {
        return res.status(403).json({ error: 'No puedes crear artículos en este inventario' });
      }
    }

    // Calcular status
    const totalStock = (stockNew || 0) + (stockRecovered || 0);
    let status = 'En Stock';
    if (totalStock === 0) {
      status = 'Agotado';
    } else if (totalStock <= (stockMin || 0)) {
      status = 'Reordenar';
    }

    const [result] = await pool.execute(
      `INSERT INTO inventory_items 
       (code, description, size, stock_new, stock_recovered, stock_min, site, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       description = VALUES(description),
       size = VALUES(size),
       stock_new = VALUES(stock_new),
       stock_recovered = VALUES(stock_recovered),
       stock_min = VALUES(stock_min),
       status = VALUES(status),
       updated_at = CURRENT_TIMESTAMP`,
      [code, description, size || null, stockNew || 0, stockRecovered || 0, stockMin || 0, site, status]
    );

    res.json({ 
      id: result.insertId, 
      message: 'Item actualizado correctamente' 
    });
  } catch (error) {
    console.error('Error al guardar item:', error);
    res.status(500).json({ error: 'Error al guardar item' });
  }
});

// Actualizar item específico
router.put('/:site/:id', authenticateToken, async (req, res) => {
  try {
    const { site, id } = req.params;
    const { description, size, stockMin } = req.body;

    // Verificar permisos: Admin puede actualizar en cualquier sitio, usuarios de almacén solo en su sitio
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      
      if (roleSiteMap[req.user.role] !== site) {
        return res.status(403).json({ error: 'No puedes modificar artículos en este inventario' });
      }
    }

    await pool.execute(
      `UPDATE inventory_items 
       SET description = ?, size = ?, stock_min = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND site = ?`,
      [description, size || null, stockMin || 0, id, site]
    );

    res.json({ message: 'Item actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar item:', error);
    res.status(500).json({ error: 'Error al actualizar item' });
  }
});

// Eliminar item de inventario
router.delete('/:site/:id', authenticateToken, async (req, res) => {
  try {
    const { site, id } = req.params;

    // Verificar permisos: Admin puede eliminar en cualquier sitio, usuarios de almacén solo en su sitio
    if (req.user.role !== 'Admin') {
      const roleSiteMap = {
        'AlmacenCedis': 'CEDIS',
        'AlmacenAcuna': 'ACUÑA',
        'AlmacenNld': 'NLD'
      };
      
      if (roleSiteMap[req.user.role] !== site) {
        return res.status(403).json({ error: 'No puedes eliminar artículos en este inventario' });
      }
    }

    const [result] = await pool.execute(
      'DELETE FROM inventory_items WHERE id = ? AND site = ?',
      [id, site]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    res.json({ message: 'Item eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar item:', error);
    res.status(500).json({ error: 'Error al eliminar item' });
  }
});

// Actualizar stock (usado en entradas/salidas)
router.patch('/:site/:id/stock', authenticateToken, async (req, res) => {
  try {
    const { site, id } = req.params;
    const { stockNew, stockRecovered } = req.body;

    // Obtener item actual
    const [items] = await pool.execute(
      'SELECT stock_new, stock_recovered, stock_min FROM inventory_items WHERE id = ? AND site = ?',
      [id, site]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const item = items[0];
    const newStockNew = stockNew !== undefined ? stockNew : item.stock_new;
    const newStockRecovered = stockRecovered !== undefined ? stockRecovered : item.stock_recovered;
    const totalStock = newStockNew + newStockRecovered;

    // Calcular status
    let status = 'En Stock';
    if (totalStock === 0) {
      status = 'Agotado';
    } else if (totalStock <= item.stock_min) {
      status = 'Reordenar';
    }

    await pool.execute(
      `UPDATE inventory_items 
       SET stock_new = ?, stock_recovered = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND site = ?`,
      [newStockNew, newStockRecovered, status, id, site]
    );

    res.json({ message: 'Stock actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
});

export default router;

