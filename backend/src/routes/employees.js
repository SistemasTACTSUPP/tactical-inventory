import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

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

// Obtener todos los colaboradores
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY full_name';

    const [employees] = await pool.execute(query, params);
    res.json(employees);
  } catch (error) {
    console.error('Error al obtener colaboradores:', error);
    res.status(500).json({ error: 'Error al obtener colaboradores' });
  }
});

// Crear nuevo colaborador
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { fullName, service, hireDate, lastRenewalDate } = req.body;

    if (!fullName || !service || !hireDate) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const secondUniformDate = calculateSecondUniformDate(hireDate);
    const nextRenewalDate = calculateNextRenewalDate(lastRenewalDate || hireDate);

    const [result] = await pool.execute(
      `INSERT INTO employees 
       (employee_id, full_name, service, hire_date, last_renewal_date, second_uniform_date, next_renewal_date, status)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, 'Activo')`,
      [fullName, service, hireDate, lastRenewalDate || null, secondUniformDate, nextRenewalDate]
    );

    res.json({ id: result.insertId, message: 'Colaborador creado correctamente' });
  } catch (error) {
    console.error('Error al crear colaborador:', error);
    res.status(500).json({ error: 'Error al crear colaborador' });
  }
});

// Obtener registros pendientes
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const [pending] = await pool.execute(
      'SELECT * FROM pending_employees ORDER BY created_at DESC'
    );
    res.json(pending);
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

    const [result] = await pool.execute(
      `INSERT INTO pending_employees 
       (employee_id, full_name, service, hire_date, second_uniform_date, next_renewal_date, status)
       VALUES (NULL, ?, ?, ?, ?, ?, 'Pendiente ID')`,
      [fullName, service, hireDate, secondUniformDate, nextRenewalDate]
    );

    res.json({ id: result.insertId, message: 'Registro pendiente creado' });
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
    await connection.beginTransaction();

    try {
      // Obtener registro pendiente
      const [pending] = await connection.execute(
        'SELECT * FROM pending_employees WHERE id = ?',
        [id]
      );

      if (pending.length === 0) {
        return res.status(404).json({ error: 'Registro pendiente no encontrado' });
      }

      const pendingEmp = pending[0];

      // Crear colaborador
      await connection.execute(
        `INSERT INTO employees 
         (employee_id, full_name, service, hire_date, last_renewal_date, second_uniform_date, next_renewal_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')`,
        [employeeId, pendingEmp.full_name, pendingEmp.service, pendingEmp.hire_date,
         pendingEmp.last_renewal_date, pendingEmp.second_uniform_date, pendingEmp.next_renewal_date]
      );

      // Eliminar registro pendiente
      await connection.execute('DELETE FROM pending_employees WHERE id = ?', [id]);

      await connection.commit();
      res.json({ message: 'Registro aprobado y colaborador creado' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al aprobar registro:', error);
    res.status(500).json({ error: 'Error al aprobar registro' });
  }
});

export default router;

