const jwt = require('jsonwebtoken');

async function testSystemLogin() {
  console.log('=== INICIANDO PRUEBA DE LOGIN DE SISTEMA (FASE 2) ===');

  const credentials = {
    email: 'system@trendy.sytes.net',
    password: 'admin123'
  };

  try {
    // 1. Probar credenciales incorrectas
    console.log('Test 1: Probar credenciales inválidas...');
    const failedRes = await fetch('http://127.0.0.1:4000/api/auth/system-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: 'wrongpassword' })
    });
    
    if (failedRes.status === 401 || failedRes.status === 403) {
      console.log('✔ Credenciales inválidas rechazadas correctamente (Status:', failedRes.status, ')');
    } else {
      console.error('❌ ERROR: Login debería haber fallado con 401/403, respondió con:', failedRes.status);
    }

    // 2. Probar credenciales correctas
    console.log('Test 2: Probar credenciales correctas...');
    const successRes = await fetch('http://127.0.0.1:4000/api/auth/system-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await successRes.json();
    if (successRes.status === 200 && data.token) {
      console.log('✔ Login de sistema exitoso! Token recibido.');
      
      // Decodificar token para verificar payload
      const decoded = jwt.decode(data.token);
      console.log('Payload del token decodificado:', decoded);

      if (decoded.actorType === 'system_user' && decoded.nivel === 'system') {
        console.log('✔ Payload verificado con éxito (actorType es system_user y nivel es system).');
      } else {
        console.error('❌ ERROR: Los campos actorType o nivel en el JWT son incorrectos.');
      }
    } else {
      console.error('❌ ERROR: Falló el inicio de sesión. Status:', successRes.status, 'Body:', data);
    }

  } catch (error) {
    console.error('❌ ERROR CRÍTICO durante el test:', error.message);
  }
}

testSystemLogin();
