import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔍 Probando conexión a MySQL...');
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`Puerto: ${process.env.DB_PORT || 3306}`);
    console.log(`Usuario: ${process.env.DB_USER || 'root'}`);
    console.log(`Base de datos: ${process.env.DB_NAME || 'tactical_inventory'}`);
    
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a MySQL!');
    
    // Probar una query simple
    const [rows] = await connection.execute('SELECT VERSION() as version');
    console.log(`📊 Versión de MySQL: ${rows[0].version}`);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al conectar a MySQL:');
    console.error(`   Mensaje: ${error.message}`);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Solución:');
      console.error('   1. Verifica la contraseña en el archivo .env');
      console.error('   2. Si no tienes contraseña, déjala vacía: DB_PASSWORD=');
      console.error('   3. Si tienes contraseña, agrégala: DB_PASSWORD=tu_contraseña');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Solución:');
      console.error('   1. Verifica que MySQL esté corriendo');
      console.error('   2. Verifica el puerto en el archivo .env');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Solución:');
      console.error('   La base de datos no existe. Ejecuta: npm run migrate');
    }
    
    process.exit(1);
  }
};

testConnection();


