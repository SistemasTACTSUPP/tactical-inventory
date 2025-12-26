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
  
  // Convertir ENUM a VARCHAR con CHECK constraint - mejor regex
  converted = converted.replace(/\b(\w+)\s+ENUM\(([^)]+)\)/gi, (match, columnName, values) => {
    return `${columnName} VARCHAR(50) CHECK (${columnName} IN ${values})`;
  });
  
  // Eliminar ON UPDATE CURRENT_TIMESTAMP
  converted = converted.replace(/\s+ON UPDATE CURRENT_TIMESTAMP/gi, '');
  
  // Convertir UNIQUE KEY a CONSTRAINT (mejor regex)
  converted = converted.replace(/,\s*UNIQUE KEY\s+(\w+)\s*\(([^)]+)\)/gi, ', CONSTRAINT $1 UNIQUE ($2)');
  
  // Eliminar ON DUPLICATE KEY UPDATE
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
    
    console.log(`📄 Archivo SQL leído: ${sql.length} caracteres`);
    
    // Convertir a PostgreSQL si es necesario
    if (isPostgreSQL) {
      console.log('🔄 Convirtiendo SQL de MySQL a PostgreSQL...');
      const beforeLength = sql.length;
      sql = convertToPostgreSQL(sql);
      console.log(`📝 SQL convertido: ${beforeLength} -> ${sql.length} caracteres`);
    }
    
    // Dividir en statements individuales
    const rawStatements = sql.split(';');
    console.log(`📝 Statements encontrados (raw): ${rawStatements.length}`);
    
    const statements = rawStatements
      .map(stmt => stmt.trim())
      .filter(stmt => {
        const trimmed = stmt.trim();
        // Filtrar solo comentarios y líneas completamente vacías
        if (trimmed.length === 0) return false;
        if (trimmed.startsWith('--')) return false;
        if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) return false;
        // Asegurarse de que tenga contenido SQL real
        if (trimmed.length < 10) return false; // Muy corto, probablemente basura
        return true;
      });
    
    console.log(`📝 Statements válidos después del filtrado: ${statements.length}`);
    
    if (statements.length === 0) {
      console.error('❌ No se encontraron statements válidos para ejecutar');
      console.log('🔍 Primeros 500 caracteres del SQL convertido:');
      console.log(sql.substring(0, 500));
      process.exit(1);
    }
    
    // Ejecutar cada statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          // Mostrar los primeros 50 caracteres del statement para debug
          const preview = statement.substring(0, 50).replace(/\n/g, ' ');
          console.log(`  🔄 Ejecutando statement ${i + 1}/${statements.length}: ${preview}...`);
          
          await pool.execute(statement);
          successCount++;
        } catch (error) {
          // Ignorar errores de "ya existe" para tablas
          const errorMsg = error.message.toLowerCase();
          if (errorMsg.includes('already exists') || 
              errorMsg.includes('duplicate key') ||
              (errorMsg.includes('relation') && errorMsg.includes('already exists')) ||
              errorMsg.includes('syntax error at or near "use"') ||
              errorMsg.includes('syntax error at or near "create database"')) {
            // Ignorar estos errores
            console.log(`  ⚠️  Ignorado (ya existe): ${error.message.substring(0, 50)}`);
          } else {
            console.warn(`  ⚠️  Error en statement ${i + 1}: ${error.message}`);
            console.warn(`  📝 Statement: ${statement.substring(0, 100)}...`);
            errorCount++;
          }
        }
      }
    }
    
    console.log(`✅ Migración completada: ${successCount} exitosos, ${errorCount} errores`);
    
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
        if (tables.length > 0) {
          tables.forEach(table => {
            console.log(`  ✅ ${table.table_name}`);
          });
        } else {
          console.warn('  ⚠️  No se encontraron tablas. La migración puede haber fallado.');
        }
      } catch (error) {
        console.warn(`⚠️  No se pudo verificar tablas: ${error.message}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

runMigration();
