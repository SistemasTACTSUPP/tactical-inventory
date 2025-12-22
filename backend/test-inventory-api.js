import pool from './src/config/database.js';

const testAPI = async () => {
  try {
    console.log('🔍 Probando consulta de inventario CEDIS...\n');
    
    const [items] = await pool.execute(
      'SELECT * FROM inventory_items WHERE site = ? ORDER BY code LIMIT 5',
      ['CEDIS']
    );
    
    console.log(`✅ Encontrados ${items.length} items (mostrando primeros 5):\n`);
    
    items.forEach(item => {
      console.log(`  - ${item.code}: ${item.description}`);
      console.log(`    Stock nuevo: ${item.stock_new}, Stock recuperado: ${item.stock_recovered}`);
      console.log(`    Stock total: ${item.stock_new + item.stock_recovered}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testAPI();


