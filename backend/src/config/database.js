import dotenv from 'dotenv';

dotenv.config();

// Debug: Mostrar variables de entorno (sin mostrar passwords completos)
console.log('🔍 Variables de entorno:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : 'NO CONFIGURADA');
console.log('  DB_HOST:', process.env.DB_HOST || 'NO CONFIGURADA');
console.log('  DB_PORT:', process.env.DB_PORT || 'NO CONFIGURADA');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'NO CONFIGURADA');

// Detectar si es PostgreSQL
// En Render, si hay DATABASE_URL que empiece con postgresql://, es PostgreSQL
// También podemos detectar por el puerto 5432 o por variables específicas
const hasPostgresUrl = process.env.DATABASE_URL?.startsWith('postgresql://');
const hasPostgresPort = process.env.DB_PORT === '5432' || process.env.DB_PORT === 5432;
const isPostgreSQL = hasPostgresUrl || hasPostgresPort || process.env.DB_TYPE === 'postgresql';

console.log('🔍 Detección de base de datos:');
console.log('  isPostgreSQL:', isPostgreSQL);
console.log('  hasPostgresUrl:', hasPostgresUrl);
console.log('  hasPostgresPort:', hasPostgresPort);

let pool;
let pgPool;

// Inicializar pool
const initPool = async () => {
  if (pool) {
    return pool;
  }

  if (isPostgreSQL) {
    // Usar PostgreSQL
    console.log('🔌 Inicializando conexión a PostgreSQL...');
    const { Pool } = await import('pg');
    
    if (process.env.DATABASE_URL) {
      console.log('✅ Usando DATABASE_URL para PostgreSQL');
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    } else if (process.env.DB_HOST) {
      console.log('✅ Usando variables individuales para PostgreSQL');
      pgPool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tactical_inventory',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    } else {
      throw new Error('❌ No se encontró configuración para PostgreSQL. Configura DATABASE_URL o DB_HOST, DB_PORT, etc.');
    }
    
    // Crear un wrapper para que pool.execute() funcione como MySQL
    pool = {
      execute: async (sql, params = []) => {
        // Convertir ? a $1, $2, etc. para PostgreSQL
        let paramIndex = 1;
        const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        const result = await pgPool.query(convertedSql, params);
        // MySQL devuelve [rows, fields], así que devolvemos el mismo formato
        return [result.rows, result.fields || []];
      },
      query: async (sql, params = []) => {
        let paramIndex = 1;
        const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
        const result = await pgPool.query(convertedSql, params);
        return [result.rows, result.fields || []];
      },
      getConnection: async () => {
        return pgPool;
      }
    };
  } else {
    // Usar MySQL
    console.log('🔌 Inicializando conexión a MySQL...');
    const mysql = await import('mysql2/promise');
    let dbConfig;
    
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      dbConfig = {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      };
    } else {
      dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'tactical_inventory',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      };
    }
    
    pool = mysql.createPool(dbConfig);
  }
  
  return pool;
};

// Inicializar pool inmediatamente
const poolPromise = initPool();

// Función para probar la conexión
export const testConnection = async () => {
  try {
    await poolPromise;
    if (isPostgreSQL) {
      const result = await pgPool.query('SELECT NOW()');
      console.log('✅ Conexión a PostgreSQL establecida correctamente');
      return true;
    } else {
      const connection = await pool.getConnection();
      console.log('✅ Conexión a MySQL establecida correctamente');
      connection.release();
      return true;
    }
  } catch (error) {
    const dbType = isPostgreSQL ? 'PostgreSQL' : 'MySQL';
    console.error(`❌ Error al conectar a ${dbType}:`, error.message);
    console.error('Stack:', error.stack);
    return false;
  }
};

// Exportar pool que espera la inicialización
const poolWrapper = {
  execute: async (sql, params) => {
    const p = await poolPromise;
    return p.execute(sql, params);
  },
  query: async (sql, params) => {
    const p = await poolPromise;
    return p.query(sql, params);
  },
  getConnection: async () => {
    const p = await poolPromise;
    return p.getConnection();
  }
};

export default poolWrapper;
