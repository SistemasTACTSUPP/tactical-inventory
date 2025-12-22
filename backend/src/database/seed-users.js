import pool from '../config/database.js';

const users = [
  { access_code: 'Tactical2025', role: 'Admin', name: 'Administrador' },
  { access_code: 'Cedis2025', role: 'AlmacenCedis', name: 'Almacén CEDIS' },
  { access_code: 'Acuña2025', role: 'AlmacenAcuna', name: 'Almacén ACUÑA' },
  { access_code: 'Nld2025', role: 'AlmacenNld', name: 'Almacén NLD' },
];

const seedUsers = async () => {
  try {
    console.log('🔄 Verificando usuarios en la base de datos...');
    
    for (const user of users) {
      // Verificar si el usuario ya existe
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE access_code = ?',
        [user.access_code]
      );
      
      if (existing.length === 0) {
        // Insertar usuario si no existe
        await pool.execute(
          'INSERT INTO users (access_code, role, name) VALUES (?, ?, ?)',
          [user.access_code, user.role, user.name]
        );
        console.log(`✅ Usuario creado: ${user.name} (${user.access_code})`);
      } else {
        console.log(`ℹ️  Usuario ya existe: ${user.name} (${user.access_code})`);
      }
    }
    
    console.log('✅ Verificación de usuarios completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al verificar usuarios:', error);
    process.exit(1);
  }
};

seedUsers();


