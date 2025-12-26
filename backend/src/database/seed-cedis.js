import pool from '../config/database.js';
import { cedisRawData } from '../data/cedisInventoryData.js';

// Detectar si es PostgreSQL
const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || 
                     process.env.DB_PORT === '5432' || 
                     process.env.DB_TYPE === 'postgresql';

// Función para extraer la talla de la descripción
const extractSize = (description) => {
  const sizePatterns = [
    /\b(XS|S|M|L|XL|2XL|3XL|4XL|5XL|XG|2XG|3XG|4XG|5XG)\b/i,
    /\b(23|24|25|26|27|28|29|30|32|34|36|38|40|42|44|46|48|50)\b/,
    /\b(Única|Unitalla)\b/i,
  ];
  
  for (const pattern of sizePatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

const seedCedisData = async () => {
  try {
    console.log('🔄 Iniciando migración de datos de CEDIS...');
    
    let inserted = 0;
    let updated = 0;
    
    // Para PostgreSQL, no necesitamos getConnection(), usamos el pool directamente
    // Para MySQL, intentamos usar getConnection() si está disponible
    let connection = null;
    let useTransaction = false;
    
    try {
      // Intentar obtener conexión (solo para MySQL)
      if (!isPostgreSQL && typeof pool.getConnection === 'function') {
        connection = await pool.getConnection();
        if (connection && typeof connection.beginTransaction === 'function') {
          await connection.beginTransaction();
          useTransaction = true;
        }
      }
      
      for (const item of cedisRawData) {
        if (!item.code || item.code.trim() === '') continue;
        
        // Distribuir el STOCK TOTAL proporcionalmente
        const totalEntradas = item.entradaStock + item.entradaRecuperado;
        let stockNew = 0;
        let stockRecovered = 0;
        
        if (totalEntradas > 0) {
          const newRatio = item.entradaStock / totalEntradas;
          stockNew = Math.round(item.stockTotal * newRatio);
          stockRecovered = item.stockTotal - stockNew;
        } else {
          stockNew = item.stockTotal;
          stockRecovered = 0;
        }
        
        const size = extractSize(item.description);
        const totalStock = item.stockTotal;
        const stockMin = totalStock > 0 ? Math.min(20, Math.max(5, Math.floor(totalStock * 0.1))) : 5;
        
        // Determinar status
        let status = 'En Stock';
        if (totalStock === 0) {
          status = 'Agotado';
        } else if (totalStock <= stockMin) {
          status = 'Reordenar';
        }
        
        // Verificar si el item ya existe
        let exists = false;
        if (isPostgreSQL) {
          const [existing] = await pool.execute(
            'SELECT code FROM inventory_items WHERE code = $1 AND site = $2',
            [item.code, 'CEDIS']
          );
          exists = existing && existing.length > 0;
        } else {
          const [existing] = await (connection || pool).execute(
            'SELECT code FROM inventory_items WHERE code = ? AND site = ?',
            [item.code, 'CEDIS']
          );
          exists = existing && existing.length > 0;
        }
        
        // Insertar o actualizar - sintaxis diferente para PostgreSQL y MySQL
        if (isPostgreSQL) {
          // PostgreSQL usa ON CONFLICT
          await pool.execute(
            `INSERT INTO inventory_items 
             (code, description, size, stock_new, stock_recovered, stock_min, site, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'CEDIS', $7)
             ON CONFLICT (code, site) DO UPDATE SET
             description = EXCLUDED.description,
             size = EXCLUDED.size,
             stock_new = EXCLUDED.stock_new,
             stock_recovered = EXCLUDED.stock_recovered,
             stock_min = EXCLUDED.stock_min,
             status = EXCLUDED.status,
             updated_at = CURRENT_TIMESTAMP`,
            [item.code, item.description, size, stockNew, stockRecovered, stockMin, status]
          );
        } else {
          // MySQL usa ON DUPLICATE KEY UPDATE
          await (connection || pool).execute(
            `INSERT INTO inventory_items 
             (code, description, size, stock_new, stock_recovered, stock_min, site, status)
             VALUES (?, ?, ?, ?, ?, ?, 'CEDIS', ?)
             ON DUPLICATE KEY UPDATE
             description = VALUES(description),
             size = VALUES(size),
             stock_new = VALUES(stock_new),
             stock_recovered = VALUES(stock_recovered),
             stock_min = VALUES(stock_min),
             status = VALUES(status),
             updated_at = CURRENT_TIMESTAMP`,
            [item.code, item.description, size, stockNew, stockRecovered, stockMin, status]
          );
        }
        
        // Contar insertados vs actualizados
        if (exists) {
          updated++;
        } else {
          inserted++;
        }
      }
      
      if (useTransaction && connection) {
        await connection.commit();
      }
      
      console.log(`✅ Migración completada: ${inserted} insertados, ${updated} actualizados`);
    } catch (error) {
      if (useTransaction && connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      // Solo release si es MySQL y tiene el método
      if (connection && typeof connection.release === 'function') {
        connection.release();
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    console.error('Detalles:', error.message);
    process.exit(1);
  }
};

seedCedisData();
