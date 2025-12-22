// Script para obtener la IP local en Windows
const { exec } = require('child_process');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorar direcciones internas y no IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getLocalIP();
console.log('\n📱 Para acceder desde tu celular:');
console.log(`   http://${ip}:5173\n`);
console.log('⚠️  Asegúrate de que:');
console.log('   1. Tu celular esté en la misma red WiFi');
console.log('   2. El firewall permita conexiones en el puerto 5173\n');


