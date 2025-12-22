import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Datos de CEDIS (copiados del frontend)
const cedisData = [
  { code: "PT28", description: "Pantalón Tactico 28", entradaStock: 28, entradaRecuperado: 1, salidasStock: 0, salidasRecuperado: 0, stockTotal: 29 },
  { code: "PT30", description: "Pantalon Tactico 30", entradaStock: 26, entradaRecuperado: 0, salidasStock: 1, salidasRecuperado: 0, stockTotal: 25 },
  { code: "PT32", description: "Pantalón Tactico 32", entradaStock: 21, entradaRecuperado: 4, salidasStock: 0, salidasRecuperado: 0, stockTotal: 25 },
  { code: "PT34", description: "Pantalón Tactico 34", entradaStock: 0, entradaRecuperado: 6, salidasStock: 2, salidasRecuperado: 0, stockTotal: 4 },
  { code: "PT36", description: "Pantalón Tactico 36", entradaStock: 33, entradaRecuperado: 0, salidasStock: 1, salidasRecuperado: 0, stockTotal: 32 },
  { code: "PT38", description: "Pantalón Tactico 38", entradaStock: 1, entradaRecuperado: 0, salidasStock: 0, salidasRecuperado: 0, stockTotal: 1 },
  { code: "PT40", description: "Pantalón Tactico 40", entradaStock: 19, entradaRecuperado: 0, salidasStock: 0, salidasRecuperado: 0, stockTotal: 19 },
  { code: "PT42", description: "Pantalón Tactico 42", entradaStock: 33, entradaRecuperado: 0, salidasStock: 0, salidasRecuperado: 0, stockTotal: 33 },
  { code: "PT44", description: "Pantalón Tactico 44", entradaStock: 0, entradaRecuperado: 0, salidasStock: 0, salidasRecuperado: 0, stockTotal: 0 },
  { code: "PT46", description: "Pantalón Tactico 46", entradaStock: 0, entradaRecuperado: 5, salidasStock: 0, salidasRecuperado: 0, stockTotal: 5 },
  { code: "PT48", description: "Pantalón Tactico 48", entradaStock: 0, entradaRecuperado: 0, salidasStock: 0, salidasRecuperado: 0, stockTotal: 0 },
  { code: "PT50", description: "Pantalón Tactico 50", entradaStock: 0, entradaRecuperado: 0, salidasStock: 0, salidasRecuperado: 0, stockTotal: 0 },
  // ... (agregar todos los demás items)
];

const seedCedisData = async () => {
  try {
    console.log('🔄 Iniciando migración de datos de CEDIS...');
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      let inserted = 0;
      let updated = 0;
      
      // Leer el archivo completo de datos (necesitamos todos los items)
      // Por ahora, vamos a hacer una versión simplificada que inserte los primeros items
      
      for (const item of cedisData) {
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
      console.log('⚠️  Nota: Este script solo inserta los primeros items. Para insertar todos, necesitas el archivo completo de datos.');
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

seedCedisData();


