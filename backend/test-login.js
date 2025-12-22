const testLogin = async () => {
  try {
    console.log('🧪 Probando login con código: Tactical2025');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: 'Tactical2025' }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login exitoso!');
      console.log('Usuario:', data.user);
      console.log('Token recibido:', data.token ? 'Sí' : 'No');
    } else {
      console.log('❌ Error en login:');
      console.log('Status:', response.status);
      console.log('Mensaje:', data.error || data.message);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.log('⚠️  Asegúrate de que el backend esté corriendo en http://localhost:3001');
  }
};

testLogin();

