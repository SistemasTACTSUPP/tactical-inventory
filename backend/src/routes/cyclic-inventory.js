import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Obtener tareas de inventario cíclico
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.execute(
      'SELECT * FROM cyclic_inventory_tasks ORDER BY date DESC'
    );

    // Obtener items para cada tarea
    for (const task of tasks) {
      const [items] = await pool.execute(
        'SELECT * FROM cyclic_inventory_items WHERE task_id = ?',
        [task.id]
      );
      task.items = items;
    }

    res.json(tasks);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// Crear tarea de inventario cíclico
router.post('/tasks', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { date, items } = req.body;

    if (!date || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Crear tarea
      const [taskResult] = await connection.execute(
        'INSERT INTO cyclic_inventory_tasks (date, assigned_to, status) VALUES (?, ?, ?)',
        [date, 'AlmacenCedis', 'Pendiente']
      );

      const taskId = taskResult.insertId;

      // Crear items de la tarea
      for (const item of items) {
        await connection.execute(
          `INSERT INTO cyclic_inventory_items 
           (task_id, code, description, size, theoretical_stock)
           VALUES (?, ?, ?, ?, ?)`,
          [taskId, item.code, item.description, item.size || null, item.theoreticalStock]
        );
      }

      await connection.commit();
      res.json({ id: taskId, message: 'Tarea creada correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// Completar tarea de inventario cíclico
router.patch('/tasks/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items requeridos' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Actualizar items con conteo físico
      for (const item of items) {
        const difference = (item.physicalCount || 0) - item.theoreticalStock;
        await connection.execute(
          `UPDATE cyclic_inventory_items 
           SET physical_count = ?, difference = ?
           WHERE id = ? AND task_id = ?`,
          [item.physicalCount, difference, item.id, id]
        );
      }

      // Marcar tarea como completada
      await connection.execute(
        `UPDATE cyclic_inventory_tasks 
         SET status = 'Completado', completed_by = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [req.user.name, id]
      );

      await connection.commit();
      res.json({ message: 'Tarea completada correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al completar tarea:', error);
    res.status(500).json({ error: 'Error al completar tarea' });
  }
});

export default router;

