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
    
    // Para PostgreSQL, usar transacciones directamente con el pool
    // Para MySQL, usar getConnection() si está disponible
    const useTransaction = !isPostgreSQL && typeof pool.getConnection === 'function';
    
    let connection = null;
    
    if (useTransaction) {
      connection = await pool.getConnection();
      await connection.beginTransaction();
    }
    
    try {
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
        
        // Insertar o actualizar - sintaxis diferente para PostgreSQL y MySQL
        let result;
        if (isPostgreSQL) {
          // PostgreSQL usa ON CONFLICT
          [result] = await pool.execute(
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
          [result] = await (connection || pool).execute(
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
        
        // Verificar si fue insert o update
        if (isPostgreSQL) {
          // PostgreSQL devuelve rowCount
          if (result && result.length > 0 && result[0] && result[0].rowCount !== undefined) {
            // Es un resultado de query, verificar si hay filas
            const rowCount = result[0].rowCount || (Array.isArray(result[0]) ? result[0].length : 0);
            if (rowCount > 0) {
              // Necesitamos verificar si ya existía
              const [existing] = await pool.execute(
                'SELECT code FROM inventory_items WHERE code = $1 AND site = $2',
                [item.code, 'CEDIS']
              );
              if (existing && existing.length > 0) {
                updated++;
              } else {
                inserted++;
              }
            }
          } else {
            // Intentar determinar si fue insert o update
            const [existing] = await pool.execute(
              'SELECT code FROM inventory_items WHERE code = $1 AND site = $2',
              [item.code, 'CEDIS']
            );
            if (existing && existing.length > 0) {
              updated++;
            } else {
              inserted++;
            }
          }
        } else {
          // MySQL devuelve affectedRows
          if (result.affectedRows === 1) {
            inserted++;
          } else {
            updated++;
          }
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
