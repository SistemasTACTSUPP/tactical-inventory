import pool from '../config/database.js';

const showInventories = async () => {
  try {
    console.log('\n📦 INVENTARIOS POR ALMACÉN\n');
    console.log('='.repeat(60));
    
    const sites = ['CEDIS', 'ACUÑA', 'NLD'];
    
    for (const site of sites) {
      const [items] = await pool.execute(
        'SELECT COUNT(*) as total, SUM(stock_new + stock_recovered) as total_stock FROM inventory_items WHERE site = ?',
        [site]
      );
      
      const [lowStock] = await pool.execute(
        'SELECT COUNT(*) as total FROM inventory_items WHERE site = ? AND (stock_new + stock_recovered) <= stock_min',
        [site]
      );
      
      console.log(`\n🏢 ${site}:`);
      console.log(`   Total de artículos: ${items[0].total || 0}`);
      console.log(`   Stock total: ${items[0].total_stock || 0} unidades`);
      console.log(`   Artículos con stock bajo: ${lowStock[0].total || 0}`);
      
      // Mostrar algunos ejemplos
      const [examples] = await pool.execute(
        'SELECT code, description, stock_new, stock_recovered, stock_min FROM inventory_items WHERE site = ? LIMIT 5',
        [site]
      );
      
      if (examples.length > 0) {
        console.log(`   Ejemplos:`);
        examples.forEach(item => {
          const total = (item.stock_new || 0) + (item.stock_recovered || 0);
          console.log(`     - ${item.code}: ${item.description} (Stock: ${total}, Mín: ${item.stock_min})`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Los 3 inventarios están completamente separados en la misma tabla');
    console.log('   usando el campo "site" para diferenciarlos.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

showInventories();


