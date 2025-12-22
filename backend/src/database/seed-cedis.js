import pool from '../config/database.js';
import { cedisRawData } from '../data/cedisInventoryData.js';

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
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      let inserted = 0;
      let updated = 0;
      
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
        
        // Insertar o actualizar
        const [result] = await connection.execute(
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
        
        if (result.affectedRows === 1) {
          inserted++;
        } else {
          updated++;
        }
      }
      
      await connection.commit();
      console.log(`✅ Migración completada: ${inserted} insertados, ${updated} actualizados`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
};

// Nota: Este script requiere que los datos estén en el backend
// Por ahora, vamos a crear una versión que lea desde un archivo JSON
seedCedisData();

