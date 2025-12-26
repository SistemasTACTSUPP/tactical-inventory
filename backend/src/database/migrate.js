import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detectar si es PostgreSQL
const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || 
                     process.env.DB_PORT === '5432' || 
                     process.env.DB_TYPE === 'postgresql';

// Función para convertir SQL de MySQL a PostgreSQL
const convertToPostgreSQL = (sql) => {
  if (!isPostgreSQL) return sql;
  
  let converted = sql;
  
  // Eliminar CREATE DATABASE y USE (no se usan en PostgreSQL cuando ya estás conectado)
  converted = converted.replace(/CREATE DATABASE[^;]*;/gi, '');
  converted = converted.replace(/USE\s+\w+;/gi, '');
  
  // Convertir AUTO_INCREMENT a SERIAL
  converted = converted.replace(/\bINT\s+AUTO_INCREMENT\b/gi, 'SERIAL');
  converted = converted.replace(/\bINTEGER\s+AUTO_INCREMENT\b/gi, 'SERIAL');
  
  // Convertir ENUM de MySQL a PostgreSQL (crear tipo primero)
  // Por ahora, usaremos VARCHAR con CHECK constraint
  converted = converted.replace(/\bENUM\(([^)]+)\)/gi, (match, values) => {
    return `VARCHAR(50) CHECK (${match.replace('ENUM', '').replace(/\(/g, 'IN (').replace(/\)/g, ')')})`;
  });
  
  // Mejor: convertir ENUM a tipo personalizado o VARCHAR con CHECK
  // Simplificado: usar VARCHAR con CHECK
  converted = converted.replace(/role\s+ENUM\(([^)]+)\)/gi, "role VARCHAR(50) CHECK (role IN ($1))");
  converted = converted.replace(/site\s+ENUM\(([^)]+)\)/gi, "site VARCHAR(50) CHECK (site IN ($1))");
  converted = converted.replace(/status\s+ENUM\(([^)]+)\)/gi, "status VARCHAR(50) CHECK (status IN ($1))");
  converted = converted.replace(/dispatch_type\s+ENUM\(([^)]+)\)/gi, "dispatch_type VARCHAR(50) CHECK (dispatch_type IN ($1))");
  converted = converted.replace(/destination\s+ENUM\(([^)]+)\)/gi, "destination VARCHAR(50) CHECK (destination IN ($1))");
  
  // Eliminar ON UPDATE CURRENT_TIMESTAMP (PostgreSQL usa triggers)
  converted = converted.replace(/\s+ON UPDATE CURRENT_TIMESTAMP/gi, '');
  
  // Convertir UNIQUE KEY a CONSTRAINT
  converted = converted.replace(/UNIQUE KEY\s+(\w+)\s*\(([^)]+)\)/gi, 'CONSTRAINT $1 UNIQUE ($2)');
  
  // Convertir ON DUPLICATE KEY UPDATE (MySQL) a ON CONFLICT (PostgreSQL)
  converted = converted.replace(/ON DUPLICATE KEY UPDATE\s+(\w+)=VALUES\((\w+)\)/gi, 
    'ON CONFLICT (access_code) DO UPDATE SET $1 = EXCLUDED.$2');
  
  // Eliminar CHARACTER SET y COLLATE de CREATE DATABASE
  converted = converted.replace(/\s+CHARACTER SET\s+\w+/gi, '');
  converted = converted.replace(/\s+COLLATE\s+\w+/gi, '');
  
  return converted;
};

const runMigration = async () => {
  try {
    console.log('🔄 Iniciando migración de base de datos...');
    
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'schema.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Convertir a PostgreSQL si es necesario
    if (isPostgreSQL) {
      console.log('🔄 Convirtiendo SQL de MySQL a PostgreSQL...');
      sql = convertToPostgreSQL(sql);
    }
    
    // Dividir en statements individuales
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Ejecutar cada statement
    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await pool.execute(statement);
        } catch (error) {
          // Ignorar errores de "ya existe" para tablas
          if (!error.message.includes('already exists') && 
              !error.message.includes('Duplicate key') &&
              !error.message.includes('duplicate key') &&
              !error.message.includes('relation') && // PostgreSQL
              !error.message.includes('syntax error at or near "USE"')) { // Ignorar USE
            console.warn(`⚠️  Advertencia: ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
};

runMigration();
