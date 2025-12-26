import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

// Configuración de MySQL (local)
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'tactical_inventory',
};

// Configuración de PostgreSQL (Render)
const postgresUrl = process.env.DATABASE_URL;

if (!postgresUrl) {
  console.error('❌ DATABASE_URL no está configurada para PostgreSQL');
  process.exit(1);
}

const migrateEmployees = async () => {
  let mysqlConnection = null;
  let pgPool = null;

  try {
    console.log('🔄 Iniciando migración de empleados de MySQL a PostgreSQL...');
    
    // Conectar a MySQL
    console.log('🔌 Conectando a MySQL...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL');
    
    // Obtener todos los empleados de MySQL
    console.log('📥 Obteniendo empleados de MySQL...');
    const [employees] = await mysqlConnection.execute(
      'SELECT * FROM employees ORDER BY employee_id'
    );
    
    console.log(`📊 Encontrados ${employees.length} empleados en MySQL`);
    
    if (employees.length === 0) {
      console.log('⚠️  No hay empleados para migrar');
      process.exit(0);
    }
    
    // Conectar a PostgreSQL
    console.log('🔌 Conectando a PostgreSQL...');
    pgPool = new Pool({
      connectionString: postgresUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    // Probar conexión
    await pgPool.query('SELECT NOW()');
    console.log('✅ Conectado a PostgreSQL');
    
    // Verificar cuántos empleados ya existen en PostgreSQL
    const [existing] = await pgPool.query('SELECT COUNT(*) as count FROM employees');
    const existingCount = parseInt(existing.rows[0].count);
    console.log(`📊 Empleados existentes en PostgreSQL: ${existingCount}`);
    
    // Migrar empleados
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const emp of employees) {
      try {
        // Verificar si ya existe
        const [existing] = await pgPool.query(
          'SELECT employee_id FROM employees WHERE employee_id = $1',
          [emp.employee_id]
        );
        
        if (existing.rows.length > 0) {
          // Actualizar empleado existente
          await pgPool.query(
            `UPDATE employees 
             SET full_name = $1, 
                 service = $2, 
                 hire_date = $3, 
                 last_renewal_date = $4, 
                 second_uniform_date = $5, 
                 next_renewal_date = $6, 
                 status = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $8`,
            [
              emp.full_name,
              emp.service,
              emp.hire_date,
              emp.last_renewal_date,
              emp.second_uniform_date,
              emp.next_renewal_date,
              emp.status || 'Activo',
              emp.employee_id
            ]
          );
          updated++;
        } else {
          // Insertar nuevo empleado
          await pgPool.query(
            `INSERT INTO employees 
             (employee_id, full_name, service, hire_date, last_renewal_date, second_uniform_date, next_renewal_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              emp.employee_id,
              emp.full_name,
              emp.service,
              emp.hire_date,
              emp.last_renewal_date,
              emp.second_uniform_date,
              emp.next_renewal_date,
              emp.status || 'Activo'
            ]
          );
          inserted++;
        }
        
        // Mostrar progreso cada 50 empleados
        if ((inserted + updated + skipped) % 50 === 0) {
          console.log(`  📊 Procesados: ${inserted + updated + skipped}/${employees.length}...`);
        }
      } catch (error) {
        console.error(`  ❌ Error al migrar empleado ${emp.employee_id} (${emp.full_name}):`, error.message);
        errors++;
      }
    }
    
    console.log('\n✅ Migración completada:');
    console.log(`  ✅ Insertados: ${inserted}`);
    console.log(`  🔄 Actualizados: ${updated}`);
    console.log(`  ⚠️  Errores: ${errors}`);
    
    // Verificar resultado final
    const [final] = await pgPool.query('SELECT COUNT(*) as count FROM employees');
    console.log(`\n📊 Total de empleados en PostgreSQL: ${final.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
    if (pgPool) {
      await pgPool.end();
    }
  }
};

migrateEmployees();

