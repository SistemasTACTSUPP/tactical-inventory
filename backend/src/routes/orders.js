import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Obtener todos los pedidos
router.get('/', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const [orders] = await pool.execute(
      'SELECT * FROM orders ORDER BY date DESC, id DESC'
    );

    // Obtener items para cada pedido
    for (const order of orders) {
      const [items] = await pool.execute(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
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
    await connection.beginTransaction();

    try {
      // Generar número de pedido
      const [lastOrder] = await connection.execute(
        'SELECT id FROM orders ORDER BY id DESC LIMIT 1'
      );
      const orderNumber = `PED-${String((lastOrder[0]?.id || 0) + 1).padStart(4, '0')}`;

      // Calcular total
      const totalAmount = items.reduce((sum, item) => 
        sum + (item.qty * (item.unitPrice || 0)), 0
      );

      // Crear pedido
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (order_number, date, supplier, status, total_amount, created_by)
         VALUES (?, ?, ?, 'Pendiente', ?, ?)`,
        [orderNumber, date, supplier || null, totalAmount, req.user.name]
      );

      const orderId = orderResult.insertId;

      // Crear items de pedido
      for (const item of items) {
        await connection.execute(
          'INSERT INTO order_items (order_id, code, description, qty, unit_price) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.code, item.description, item.qty, item.unitPrice || 0]
        );
      }

      await connection.commit();
      res.json({ id: orderId, orderNumber, message: 'Pedido creado correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear pedido:', error);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
});

export default router;

