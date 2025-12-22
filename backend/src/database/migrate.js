import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  try {
    console.log('🔄 Iniciando migración de base de datos...');
    
    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
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
              !error.message.includes('Duplicate key')) {
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

