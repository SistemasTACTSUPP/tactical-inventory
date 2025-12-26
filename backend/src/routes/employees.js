import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { getIO } from '../server.js';

const router = express.Router();

// Calcular fecha de 2do uniforme (15 días después, ajustado a 15 o 30 del mes)
const calculateSecondUniformDate = (hireDate) => {
  const date = new Date(hireDate);
  date.setDate(date.getDate() + 15);
  
  const day = date.getDate();
  if (day <= 15) {
    date.setDate(15);
  } else {
    date.setDate(30);
  }
  
  return date.toISOString().slice(0, 10);
};

// Calcular próxima renovación (6 meses después)
const calculateNextRenewalDate = (baseDate) => {
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
};

// Detectar si es PostgreSQL
const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || 
                     process.env.DB_PORT === '5432' || 
                     process.env.DB_TYPE === 'postgresql';

// Obtener todos los colaboradores
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (status) {
      query += isPostgreSQL ? ' AND status = $1' : ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY full_name';

    const [employees] = await pool.execute(query, params);
    
    // Transformar snake_case a camelCase para el frontend
    const transformedEmployees = employees.map(emp => ({
      id: emp.employee_id ? emp.employee_id.toString() : (emp.id ? emp.id.toString() : ''),
      name: emp.full_name || '',
      service: emp.service || '',
      hireDate: emp.hire_date ? emp.hire_date.toString() : '',
      lastRenewalDate: emp.last_renewal_date ? emp.last_renewal_date.toString() : null,
      secondUniformDate: emp.second_uniform_date ? emp.second_uniform_date.toString() : null,
      nextRenewalDate: emp.next_renewal_date ? emp.next_renewal_date.toString() : null,
      status: emp.status || 'Activo',
      renewalStatus: calculateRenewalStatus(emp.next_renewal_date)
    }));
    
    res.json(transformedEmployees);
  } catch (error) {
    console.error('Error al obtener colaboradores:', error);
    res.status(500).json({ error: 'Error al obtener colaboradores' });
  }
});

// Función auxiliar para calcular el estado de renovación
function calculateRenewalStatus(nextRenewalDate) {
  if (!nextRenewalDate) return 'Vigente';
  
  const renewalDate = new Date(nextRenewalDate);
  const today = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(today.getMonth() + 3);
  
  if (renewalDate < today) {
    return 'Vencido';
  } else if (renewalDate <= threeMonthsFromNow) {
    return 'Próximo a renovar';
  }
  
  return 'Vigente';
}

// Crear nuevo colaborador
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { fullName, service, hireDate, lastRenewalDate } = req.body;

    if (!fullName || !service || !hireDate) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const secondUniformDate = calculateSecondUniformDate(hireDate);
    const nextRenewalDate = calculateNextRenewalDate(lastRenewalDate || hireDate);

    const insertQuery = isPostgreSQL
      ? `INSERT INTO employees 
         (employee_id, full_name, service, hire_date, last_renewal_date, second_uniform_date, next_renewal_date, status)
         VALUES (NULL, $1, $2, $3, $4, $5, $6, 'Activo') RETURNING id`
      : `INSERT INTO employees 
         (employee_id, full_name, service, hire_date, last_renewal_date, second_uniform_date, next_renewal_date, status)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, 'Activo')`;
    
    const [result] = await pool.execute(
      insertQuery,
      [fullName, service, hireDate, lastRenewalDate || null, secondUniformDate, nextRenewalDate]
    );

    // Obtener el ID insertado
    let employeeId;
    if (isPostgreSQL) {
      employeeId = result[0]?.id || result.id;
    } else {
      employeeId = result.insertId;
    }

    // Emitir evento WebSocket
    const io = getIO();
    if (io) {
      io.emit('employee-created', { id: employeeId, service });
    }

    res.json({ id: employeeId, message: 'Colaborador creado correctamente' });
  } catch (error) {
    console.error('Error al crear colaborador:', error);
    res.status(500).json({ error: 'Error al crear colaborador' });
  }
});

// Actualizar colaborador
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, service, hireDate, lastRenewalDate, secondUniformDate, nextRenewalDate, status } = req.body;

    // Solo Admin puede actualizar colaboradores
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden modificar colaboradores' });
    }

    if (!fullName || !service || !hireDate) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const updateQuery = isPostgreSQL
      ? `UPDATE employees 
         SET full_name = $1, service = $2, hire_date = $3, 
             last_renewal_date = $4, second_uniform_date = $5, next_renewal_date = $6,
             status = $7, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = $8`
      : `UPDATE employees 
         SET full_name = ?, service = ?, hire_date = ?, 
             last_renewal_date = ?, second_uniform_date = ?, next_renewal_date = ?,
             status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = ?`;
    
    await pool.execute(
      updateQuery,
      [fullName, service, hireDate, lastRenewalDate || null, secondUniformDate || null, nextRenewalDate || null, status || 'Activo', id]
    );

    // Emitir evento WebSocket
    const io = getIO();
    if (io) {
      io.emit('employee-updated', { id, service });
    }

    res.json({ message: 'Colaborador actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar colaborador:', error);
    res.status(500).json({ error: 'Error al actualizar colaborador' });
  }
});

// Obtener registros pendientes
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const pendingQuery = 'SELECT * FROM pending_employees ORDER BY created_at DESC';
    const [pending] = await pool.execute(pendingQuery);
    
    // Transformar snake_case a camelCase para el frontend
    const transformedPending = pending.map(emp => ({
      id: emp.id ? emp.id.toString() : '',
      employeeId: emp.employee_id ? emp.employee_id.toString() : null,
      name: emp.full_name || '',
      service: emp.service || '',
      hireDate: emp.hire_date ? emp.hire_date.toString() : '',
      lastRenewalDate: emp.last_renewal_date ? emp.last_renewal_date.toString() : null,
      secondUniformDate: emp.second_uniform_date ? emp.second_uniform_date.toString() : null,
      nextRenewalDate: emp.next_renewal_date ? emp.next_renewal_date.toString() : null,
      status: emp.status || 'Pendiente ID'
    }));
    
    res.json(transformedPending);
  } catch (error) {
    console.error('Error al obtener registros pendientes:', error);
    res.status(500).json({ error: 'Error al obtener registros pendientes' });
  }
});

// Crear registro pendiente
router.post('/pending', authenticateToken, async (req, res) => {
  try {
    const { fullName, service, hireDate } = req.body;

    if (!fullName || !service || !hireDate) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const secondUniformDate = calculateSecondUniformDate(hireDate);
    const nextRenewalDate = calculateNextRenewalDate(hireDate);

    const insertPendingQuery = isPostgreSQL
      ? `INSERT INTO pending_employees 
         (employee_id, full_name, service, hire_date, second_uniform_date, next_renewal_date, status)
         VALUES (NULL, $1, $2, $3, $4, $5, 'Pendiente ID') RETURNING id`
      : `INSERT INTO pending_employees 
         (employee_id, full_name, service, hire_date, second_uniform_date, next_renewal_date, status)
         VALUES (NULL, ?, ?, ?, ?, ?, 'Pendiente ID')`;
    
    const [result] = await pool.execute(
      insertPendingQuery,
      [fullName, service, hireDate, secondUniformDate, nextRenewalDate]
    );

    const pendingId = isPostgreSQL ? (result[0]?.id || result.id) : result.insertId;
    res.json({ id: pendingId, message: 'Registro pendiente creado' });
  } catch (error) {
    console.error('Error al crear registro pendiente:', error);
    res.status(500).json({ error: 'Error al crear registro pendiente' });
  }
});

// Aprobar registro pendiente
router.post('/pending/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'ID de empleado requerido' });
    }

    const connection = await pool.getConnection();
    
    try {
      if (connection.beginTransaction) {
        await connection.beginTransaction();
      }
      
      // Obtener registro pendiente
      const pendingQuery = isPostgreSQL
        ? 'SELECT * FROM pending_employees WHERE id = $1'
        : 'SELECT * FROM pending_employees WHERE id = ?';
      const [pending] = await connection.execute(pendingQuery, [id]);

      if (pending.length === 0) {
        return res.status(404).json({ error: 'Registro pendiente no encontrado' });
      }

      const pendingEmp = pending[0];

      // Crear colaborador
      const insertEmployeeQuery = isPostgreSQL
        ? `INSERT INTO employees 
           (employee_id, full_name, service, hire_date, last_renewal_date, second_uniform_date, next_renewal_date, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'Activo')`
        : `INSERT INTO employees 
           (employee_id, full_name, service, hire_date, last_renewal_date, second_uniform_date, next_renewal_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')`;
      
      await connection.execute(
        insertEmployeeQuery,
        [employeeId, pendingEmp.full_name, pendingEmp.service, pendingEmp.hire_date,
         pendingEmp.last_renewal_date, pendingEmp.second_uniform_date, pendingEmp.next_renewal_date]
      );

      // Eliminar registro pendiente
      const deletePendingQuery = isPostgreSQL
        ? 'DELETE FROM pending_employees WHERE id = $1'
        : 'DELETE FROM pending_employees WHERE id = ?';
      await connection.execute(deletePendingQuery, [id]);

      if (connection.commit) {
        await connection.commit();
      }
      
      // Emitir evento WebSocket
      const io = getIO();
      if (io) {
        io.emit('employee-created', { id: employeeId, service: pendingEmp.service });
      }
      
      res.json({ message: 'Registro aprobado y colaborador creado' });
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
    console.error('Error al aprobar registro:', error);
    res.status(500).json({ error: 'Error al aprobar registro' });
  }
});

// Eliminar colaborador (solo Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Solo Admin puede eliminar colaboradores
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden eliminar colaboradores' });
    }

    const deleteQuery = isPostgreSQL
      ? 'DELETE FROM employees WHERE employee_id = $1'
      : 'DELETE FROM employees WHERE employee_id = ?';
    
    const [result] = await pool.execute(deleteQuery, [id]);

    // Verificar si se eliminó (diferente para PostgreSQL y MySQL)
    const wasDeleted = isPostgreSQL 
      ? (result && result.length > 0 && result[0] && result[0].rowCount > 0)
      : (result.affectedRows === 0);
    
    if (!wasDeleted) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }

    // Emitir evento WebSocket
    const io = getIO();
    if (io) {
      io.emit('employee-deleted', { id });
    }

    res.json({ message: 'Colaborador eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar colaborador:', error);
    res.status(500).json({ error: 'Error al eliminar colaborador' });
  }
});

export default router;

