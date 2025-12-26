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
  
  // Convertir ENUM a VARCHAR con CHECK constraint
  converted = converted.replace(/role\s+ENUM\(([^)]+)\)/gi, (match, values) => {
    return `role VARCHAR(50) CHECK (role IN ${values})`;
  });
  converted = converted.replace(/site\s+ENUM\(([^)]+)\)/gi, (match, values) => {
    return `site VARCHAR(50) CHECK (site IN ${values})`;
  });
  converted = converted.replace(/status\s+ENUM\(([^)]+)\)/gi, (match, values) => {
    return `status VARCHAR(50) CHECK (status IN ${values})`;
  });
  converted = converted.replace(/dispatch_type\s+ENUM\(([^)]+)\)/gi, (match, values) => {
    return `dispatch_type VARCHAR(50) CHECK (dispatch_type IN ${values})`;
  });
  converted = converted.replace(/destination\s+ENUM\(([^)]+)\)/gi, (match, values) => {
    return `destination VARCHAR(50) CHECK (destination IN ${values})`;
  });
  
  // Eliminar ON UPDATE CURRENT_TIMESTAMP (PostgreSQL usa triggers, pero por ahora lo ignoramos)
  converted = converted.replace(/\s+ON UPDATE CURRENT_TIMESTAMP/gi, '');
  
  // Convertir UNIQUE KEY a CONSTRAINT
  converted = converted.replace(/,\s*UNIQUE KEY\s+(\w+)\s*\(([^)]+)\)/gi, ', CONSTRAINT $1 UNIQUE ($2)');
  
  // Convertir ON DUPLICATE KEY UPDATE (MySQL) - eliminarlo por ahora, se manejará en el código
  converted = converted.replace(/ON DUPLICATE KEY UPDATE[^;]*/gi, '');
  
  // Eliminar CHARACTER SET y COLLATE
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
      .filter(stmt => {
        // Filtrar comentarios y líneas vacías
        const trimmed = stmt.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('--') && 
               !trimmed.startsWith('/*') &&
               trimmed !== '';
      });
    
    console.log(`📝 Encontrados ${statements.length} statements para ejecutar`);
    
    // Ejecutar cada statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          await pool.execute(statement);
          successCount++;
          // Mostrar progreso cada 5 statements
          if ((i + 1) % 5 === 0) {
            console.log(`  ✅ Procesados ${i + 1}/${statements.length} statements...`);
          }
        } catch (error) {
          // Ignorar errores de "ya existe" para tablas
          const errorMsg = error.message.toLowerCase();
          if (errorMsg.includes('already exists') || 
              errorMsg.includes('duplicate key') ||
              errorMsg.includes('relation') && errorMsg.includes('already exists') ||
              errorMsg.includes('syntax error at or near "use"') ||
              errorMsg.includes('syntax error at or near "create database"')) {
            // Ignorar estos errores
          } else {
            console.warn(`⚠️  Advertencia en statement ${i + 1}: ${error.message}`);
            errorCount++;
          }
        }
      }
    }
    
    console.log(`✅ Migración completada: ${successCount} exitosos, ${errorCount} advertencias`);
    
    // Verificar que las tablas principales existan
    if (isPostgreSQL) {
      console.log('🔍 Verificando que las tablas se crearon correctamente...');
      try {
        const [tables] = await pool.execute(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);
        console.log(`📊 Tablas encontradas: ${tables.length}`);
        tables.forEach(table => {
          console.log(`  - ${table.table_name}`);
        });
      } catch (error) {
        console.warn(`⚠️  No se pudo verificar tablas: ${error.message}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
};

runMigration();
