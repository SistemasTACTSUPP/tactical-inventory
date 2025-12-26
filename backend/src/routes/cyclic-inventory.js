import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Detectar si es PostgreSQL
const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || 
                     process.env.DB_PORT === '5432' || 
                     process.env.DB_TYPE === 'postgresql';

// Obtener tareas de inventario cíclico
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const { status, site } = req.query;
    let query = 'SELECT * FROM cyclic_inventory_tasks WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (site) {
      query += ' AND assigned_to = ?';
      params.push(site);
    }

    query += ' ORDER BY date DESC';

    const [tasks] = await pool.execute(query, params);

    // Obtener items para cada tarea y transformar datos
    for (const task of tasks) {
      const [items] = await pool.execute(
        'SELECT * FROM cyclic_inventory_items WHERE task_id = ?',
        [task.id]
      );
      
      // Transformar items de snake_case a camelCase
      task.items = items.map(item => ({
        id: item.id,
        code: item.code,
        description: item.description,
        size: item.size || null,
        theoreticalStock: item.theoretical_stock,
        physicalCount: item.physical_count || null,
        difference: item.difference || null
      }));
    }

    // Transformar tareas de snake_case a camelCase
    const transformedTasks = tasks.map(task => ({
      id: task.id,
      date: task.date ? task.date.toString() : '',
      assignedTo: task.assigned_to || '',
      status: task.status || 'Pendiente',
      completedAt: task.completed_at ? task.completed_at.toString() : null,
      completedBy: task.completed_by || null,
      createdAt: task.created_at ? task.created_at.toString() : '',
      updatedAt: task.updated_at ? task.updated_at.toString() : '',
      items: task.items || []
    }));

    res.json(transformedTasks);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// Crear tarea de inventario cíclico
router.post('/tasks', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { date, items, assignedTo } = req.body;

    if (!date || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const connection = await pool.getConnection();
    
    try {
      if (connection.beginTransaction) {
        await connection.beginTransaction();
      }

      // Crear tarea
      // El wrapper ya convierte ? a $1, $2, etc. automáticamente
      const insertTaskQuery = 'INSERT INTO cyclic_inventory_tasks (date, assigned_to, status) VALUES (?, ?, ?) RETURNING id';
      
      const taskResult = await connection.execute(
        insertTaskQuery,
        [date, assignedTo || 'AlmacenCedis', 'Pendiente']
      );

      // El wrapper devuelve [rows, fields] para ambos
      // En PostgreSQL con RETURNING: rows[0].id
      // En MySQL: insertId (aunque MySQL no soporta RETURNING, usaremos LAST_INSERT_ID)
      let taskId;
      if (isPostgreSQL) {
        // PostgreSQL con RETURNING devuelve el resultado en rows[0]
        const rows = taskResult[0] || [];
        taskId = rows[0]?.id;
        console.log('PostgreSQL - taskId obtenido:', taskId, 'de rows:', rows);
      } else {
        // MySQL: usar LAST_INSERT_ID() o insertId
        // Si el query no tiene RETURNING, MySQL devuelve insertId
        const [lastIdResult] = await connection.execute('SELECT LAST_INSERT_ID() as id');
        taskId = lastIdResult[0]?.id || taskResult[0]?.insertId;
        console.log('MySQL - taskId obtenido:', taskId);
      }
      
      if (!taskId) {
        console.error('Resultado de inserción completo:', JSON.stringify(taskResult, null, 2));
        console.error('Tipo de resultado:', typeof taskResult);
        console.error('Es array:', Array.isArray(taskResult));
        if (taskResult[0]) {
          console.error('Primer elemento:', JSON.stringify(taskResult[0], null, 2));
          console.error('Tipo del primer elemento:', typeof taskResult[0]);
          if (Array.isArray(taskResult[0])) {
            console.error('Primer elemento es array, longitud:', taskResult[0].length);
            if (taskResult[0].length > 0) {
              console.error('Primer item del array:', JSON.stringify(taskResult[0][0], null, 2));
            }
          }
        }
        throw new Error('No se pudo obtener el ID de la tarea creada');
      }

      // Crear items de la tarea
      for (const item of items) {
        // El wrapper ya convierte ? a $1, $2, etc. automáticamente
        await connection.execute(
          `INSERT INTO cyclic_inventory_items 
           (task_id, code, description, size, theoretical_stock)
           VALUES (?, ?, ?, ?, ?)`,
          [taskId, item.code, item.description, item.size || null, item.theoreticalStock || 0]
        );
      }

      if (connection.commit) {
        await connection.commit();
      }
      
      // Emitir evento WebSocket
      const io = req.app.get('io');
      if (io) {
        io.emit('cyclic-task-created', { taskId, date, assignedTo: assignedTo || 'AlmacenCedis' });
      }
      
      res.json({ id: taskId, message: 'Tarea creada correctamente' });
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
    console.error('Error al crear tarea:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Error al crear tarea',
      message: error.message || 'Error desconocido',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    
    try {
      if (connection.beginTransaction) {
        await connection.beginTransaction();
      }

      // Verificar que la tarea existe y está pendiente
      const [taskCheck] = await connection.execute(
        'SELECT * FROM cyclic_inventory_tasks WHERE id = ?',
        [id]
      );

      if (taskCheck.length === 0) {
        if (connection.rollback) {
          await connection.rollback();
        }
        return res.status(404).json({ error: 'Tarea no encontrada' });
      }

      if (taskCheck[0].status === 'Completado') {
        if (connection.rollback) {
          await connection.rollback();
        }
        return res.status(400).json({ error: 'La tarea ya está completada' });
      }

      // Actualizar items con conteo físico
      for (const item of items) {
        const difference = (item.physicalCount || 0) - (item.theoreticalStock || 0);
        await connection.execute(
          `UPDATE cyclic_inventory_items 
           SET physical_count = ?, difference = ?
           WHERE id = ? AND task_id = ?`,
          [item.physicalCount || 0, difference, item.id, id]
        );
      }

      // Marcar tarea como completada
      await connection.execute(
        `UPDATE cyclic_inventory_tasks 
         SET status = 'Completado', completed_by = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [req.user.name || req.user.full_name || 'Usuario', id]
      );

      if (connection.commit) {
        await connection.commit();
      }
      
      // Emitir evento WebSocket
      const io = req.app.get('io');
      if (io) {
        io.emit('cyclic-task-completed', { taskId: id, completedBy: req.user.name || req.user.full_name });
      }
      
      res.json({ message: 'Tarea completada correctamente' });
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
    console.error('Error al completar tarea:', error);
    res.status(500).json({ error: 'Error al completar tarea' });
  }
});

// Obtener una tarea específica por ID
router.get('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [tasks] = await pool.execute(
      'SELECT * FROM cyclic_inventory_tasks WHERE id = ?',
      [id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const task = tasks[0];

    // Obtener items de la tarea
    const [items] = await pool.execute(
      'SELECT * FROM cyclic_inventory_items WHERE task_id = ?',
      [id]
    );
    
    // Transformar items
    task.items = items.map(item => ({
      id: item.id,
      code: item.code,
      description: item.description,
      size: item.size || null,
      theoreticalStock: item.theoretical_stock,
      physicalCount: item.physical_count || null,
      difference: item.difference || null
    }));

    // Transformar tarea
    const transformedTask = {
      id: task.id,
      date: task.date ? task.date.toString() : '',
      assignedTo: task.assigned_to || '',
      status: task.status || 'Pendiente',
      completedAt: task.completed_at ? task.completed_at.toString() : null,
      completedBy: task.completed_by || null,
      createdAt: task.created_at ? task.created_at.toString() : '',
      updatedAt: task.updated_at ? task.updated_at.toString() : '',
      items: task.items || []
    };

    res.json(transformedTask);
  } catch (error) {
    console.error('Error al obtener tarea:', error);
    res.status(500).json({ error: 'Error al obtener tarea' });
  }
});

// Obtener estadísticas de inventario cíclico
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const statsQuery = isPostgreSQL
      ? `SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'Pendiente' THEN 1 ELSE 0 END) as pending_tasks,
          SUM(CASE WHEN status = 'Completado' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN date = CURRENT_DATE AND status = 'Pendiente' THEN 1 ELSE 0 END) as today_pending
         FROM cyclic_inventory_tasks`
      : `SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'Pendiente' THEN 1 ELSE 0 END) as pending_tasks,
          SUM(CASE WHEN status = 'Completado' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN date = CURDATE() AND status = 'Pendiente' THEN 1 ELSE 0 END) as today_pending
         FROM cyclic_inventory_tasks`;
    
    const [stats] = await pool.execute(statsQuery);

    // Obtener tareas con diferencias
    const [tasksWithDifferences] = await pool.execute(
      `SELECT COUNT(DISTINCT task_id) as tasks_with_differences
       FROM cyclic_inventory_items
       WHERE difference != 0 AND difference IS NOT NULL`
    );

    res.json({
      totalTasks: stats[0].total_tasks || 0,
      pendingTasks: stats[0].pending_tasks || 0,
      completedTasks: stats[0].completed_tasks || 0,
      todayPending: stats[0].today_pending || 0,
      tasksWithDifferences: tasksWithDifferences[0].tasks_with_differences || 0
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;

