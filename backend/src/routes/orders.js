import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Detectar si es PostgreSQL
const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || 
                     process.env.DB_PORT === '5432' || 
                     process.env.DB_TYPE === 'postgresql';

// Obtener sugerencias de artículos con stock bajo
router.get('/suggestions', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { site } = req.query;
    
    let query = `
      SELECT 
        code,
        description,
        size,
        stock_new,
        stock_recovered,
        stock_min,
        site,
        (stock_new + stock_recovered) as total_stock,
        GREATEST(0, stock_min - (stock_new + stock_recovered)) as suggested_qty
      FROM inventory_items
      WHERE (stock_new + stock_recovered) < stock_min
    `;
    const params = [];
    
    if (site) {
      query += isPostgreSQL ? ' AND site = $1' : ' AND site = ?';
      params.push(site);
    }
    
    query += ' ORDER BY site, (stock_min - (stock_new + stock_recovered)) DESC';
    
    const [suggestions] = await pool.execute(query, params);
    
    res.json(suggestions);
  } catch (error) {
    console.error('Error al obtener sugerencias:', error);
    res.status(500).json({ error: 'Error al obtener sugerencias' });
  }
});

// Obtener todos los pedidos
router.get('/', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const ordersQuery = 'SELECT * FROM orders ORDER BY date DESC, id DESC';
    const [orders] = await pool.execute(ordersQuery);

    // Obtener items para cada pedido
    for (const order of orders) {
      const itemsQuery = isPostgreSQL
        ? 'SELECT * FROM order_items WHERE order_id = $1'
        : 'SELECT * FROM order_items WHERE order_id = ?';
      const [items] = await pool.execute(itemsQuery, [order.id]);
      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// Crear nuevo pedido
router.post('/', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { date, supplier, items } = req.body;

    if (!date || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const connection = await pool.getConnection();
    
    try {
      if (connection.beginTransaction) {
        await connection.beginTransaction();
      }

      // Generar número de pedido
      const lastOrderQuery = isPostgreSQL
        ? 'SELECT id FROM orders ORDER BY id DESC LIMIT 1'
        : 'SELECT id FROM orders ORDER BY id DESC LIMIT 1';
      const [lastOrder] = await connection.execute(lastOrderQuery);
      const lastId = isPostgreSQL 
        ? (lastOrder[0]?.id || 0)
        : (lastOrder[0]?.id || 0);
      const orderNumber = `PED-${String(lastId + 1).padStart(4, '0')}`;

      // Calcular total
      const totalAmount = items.reduce((sum, item) => 
        sum + (item.qty * (item.unitPrice || 0)), 0
      );

      // Crear pedido
      const insertOrderQuery = isPostgreSQL
        ? `INSERT INTO orders (order_number, date, supplier, status, total_amount, created_by)
           VALUES ($1, $2, $3, 'Pendiente', $4, $5) RETURNING id`
        : `INSERT INTO orders (order_number, date, supplier, status, total_amount, created_by)
           VALUES (?, ?, ?, 'Pendiente', ?, ?)`;
      
      const [orderResult] = await connection.execute(
        insertOrderQuery,
        [orderNumber, date, supplier || null, totalAmount, req.user.name]
      );

      const orderId = isPostgreSQL 
        ? (orderResult[0]?.id || orderResult.id || null)
        : (orderResult.insertId || orderResult[0]?.id);
      
      if (!orderId) {
        throw new Error('No se pudo obtener el ID del pedido creado');
      }

      // Crear items de pedido
      for (const item of items) {
        const insertItemQuery = isPostgreSQL
          ? 'INSERT INTO order_items (order_id, code, description, qty, unit_price) VALUES ($1, $2, $3, $4, $5)'
          : 'INSERT INTO order_items (order_id, code, description, qty, unit_price) VALUES (?, ?, ?, ?, ?)';
        await connection.execute(
          insertItemQuery,
          [orderId, item.code, item.description, item.qty, item.unitPrice || 0]
        );
      }

      if (connection.commit) {
        await connection.commit();
      }
      
      // Obtener el pedido completo con items para devolverlo
      const getOrderQuery = isPostgreSQL
        ? 'SELECT * FROM orders WHERE id = $1'
        : 'SELECT * FROM orders WHERE id = ?';
      const [fullOrderResult] = await connection.execute(getOrderQuery, [orderId]);
      
      if (fullOrderResult.length > 0) {
        const order = fullOrderResult[0];
        const getItemsQuery = isPostgreSQL
          ? 'SELECT * FROM order_items WHERE order_id = $1'
          : 'SELECT * FROM order_items WHERE order_id = ?';
        const [itemsResult] = await connection.execute(getItemsQuery, [orderId]);
        
        order.items = itemsResult;
        res.json(order);
      } else {
        res.json({ id: orderId, orderNumber, message: 'Pedido creado correctamente' });
      }
    } catch (error) {
      if (connection.rollback) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection && typeof connection.release === 'function') {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
});

export default router;

