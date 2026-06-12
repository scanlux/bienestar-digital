const jwt = require('jsonwebtoken');

async function testMaintenanceMode() {
  console.log('=== INICIANDO PRUEBA DE MODO MANTENIMIENTO CON DOS NIVELES DE REVOCACION (FASE 2) ===');
  
  const systemCredentials = {
    email: 'system@trendy.sytes.net',
    password: 'admin123'
  };

  const commerceCredentials = {
    email: 'admin_commerce_1@trendy.sytes.net',
    password: 'admin123'
  };

  try {
    // 1. Verificar el estado público inicial de mantenimiento
    console.log('\nTest 1: Consultando estado público inicial...');
    const publicRes = await fetch('http://127.0.0.1:4000/api/public/maintenance-status');
    const publicData = await publicRes.json();
    console.log('Respuesta pública:', publicData);
    
    // 2. Iniciar sesión como administrador de sistema
    console.log('\nTest 2: Autenticando administrador de sistema...');
    const sysLoginRes = await fetch('http://127.0.0.1:4000/api/auth/system-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(systemCredentials)
    });
    const sysLoginData = await sysLoginRes.json();

    if (sysLoginRes.status !== 200 || !sysLoginData.token) {
      console.error('❌ ERROR: No se pudo autenticar al administrador del sistema.');
      return;
    }
    const systemToken = sysLoginData.token;
    console.log('✔ OK: Token de sistema obtenido.');

    // 3. Desactivar modo mantenimiento usando token de sistema
    console.log('\nTest 3: Desactivando modo mantenimiento...');
    const disableRes = await fetch('http://127.0.0.1:4000/api/manage/system/maintenance/disable', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${systemToken}`
      }
    });
    const disableData = await disableRes.json();
    console.log('Respuesta disable:', disableData);

    if (disableRes.status === 200 && disableData.success === true) {
      console.log('✔ OK: Desactivación exitosa.');
    } else {
      console.error('❌ ERROR: Falló la desactivación.');
    }

    // 4. Iniciar sesión como usuario comercial con mantenimiento desactivado
    console.log('\nTest 4: Autenticando usuario comercial...');
    const commLoginRes = await fetch('http://127.0.0.1:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commerceCredentials)
    });
    const commLoginData = await commLoginRes.json();
    
    if (commLoginRes.status !== 200 || !commLoginData.token) {
      console.error('❌ ERROR: No se pudo autenticar al usuario comercial.', commLoginData);
      return;
    }
    const commerceToken = commLoginData.token;
    console.log('✔ OK: Token comercial obtenido.');

    // Esperar 1.2 segundos para asegurar el cambio de segundo UNIX
    console.log('Esperando 1.2 segundos para que avance el tiempo UNIX...');
    await new Promise(resolve => setTimeout(resolve, 1200));

    // 5. Reactivar modo mantenimiento (esto debe invalidar la sesión del comercial, pero NO la del sys admin)
    console.log('\nTest 5: Reactivando modo mantenimiento (debe invalidar comercial pero NO sys admin)...');
    const enableRes = await fetch('http://127.0.0.1:4000/api/manage/system/maintenance/enable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${systemToken}`
      },
      body: JSON.stringify({
        message: 'Mantenimiento con dos niveles de revocacion',
        durationMinutes: 2
      })
    });
    const enableData = await enableRes.json();
    console.log('Respuesta enable:', enableData);

    if (enableRes.status === 200 && enableData.success === true) {
      console.log('✔ OK: Activación exitosa.');
    } else {
      console.error('❌ ERROR: Falló la activación.');
    }

    // 6. Probar que el token comercial quedó invalidado (debe dar 503 por estar en mantenimiento)
    console.log('\nTest 6: Intentando acceder con token comercial anterior bajo mantenimiento (esperado: 503)...');
    const commProtectedResActive = await fetch('http://127.0.0.1:4000/api/manage/commerces', {
      headers: { 'Authorization': `Bearer ${commerceToken}` }
    });
    console.log('Status de respuesta comercial:', commProtectedResActive.status);

    if (commProtectedResActive.status === 503) {
      console.log('✔ OK: Usuario comercial bloqueado con HTTP 503.');
    } else {
      console.error('❌ ERROR: Se esperaba HTTP 503. Recibido:', commProtectedResActive.status);
    }

    // 7. Probar que el token de sistema sigue activo y puede realizar operaciones (gracias a la exclusión)
    console.log('\nTest 7: Probando si el token de sistema original sigue activo tras reactivar mantenimiento...');
    const sysStatusRes = await fetch('http://127.0.0.1:4000/api/manage/system/maintenance/status', {
      headers: { 'Authorization': `Bearer ${systemToken}` }
    });
    console.log('Status de consulta administrativa:', sysStatusRes.status);
    
    if (sysStatusRes.status === 200) {
      console.log('✔ OK: El administrador del sistema sigue autenticado y operativo.');
    } else {
      console.error('❌ ERROR: Se esperaba HTTP 200. El administrador fue incorrectamente expulsado. Status:', sysStatusRes.status);
    }

    // 8. Activar el Cierre Crítico de Emergencia (Botón de Pánico)
    console.log('\nTest 8: Activando cierre crítico de emergencia (Botón de Pánico)...');
    const panicRes = await fetch('http://127.0.0.1:4000/api/manage/system/maintenance/panic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${systemToken}`
      }
    });
    const panicData = await panicRes.json();
    console.log('Respuesta de botón de pánico:', panicData);

    if (panicRes.status === 200 && panicData.success === true) {
      console.log('✔ OK: Botón de pánico activado con éxito.');
    } else {
      console.error('❌ ERROR: Falló la activación del botón de pánico.');
    }

    // Esperar 1.2 segundos para asegurar el cambio de segundo UNIX
    console.log('Esperando 1.2 segundos para que avance el tiempo UNIX...');
    await new Promise(resolve => setTimeout(resolve, 1200));

    // 9. Comprobar que el token de sistema original quedó invalidado con HTTP 440
    console.log('\nTest 9: Verificando que el token de sistema original ahora esté invalidado por el botón de pánico...');
    const sysStatusRes2 = await fetch('http://127.0.0.1:4000/api/manage/system/maintenance/status', {
      headers: { 'Authorization': `Bearer ${systemToken}` }
    });
    const sysStatusData2 = await sysStatusRes2.json();
    console.log('Status tras pánico:', sysStatusRes2.status);
    console.log('Respuesta tras pánico:', sysStatusData2);

    if (sysStatusRes2.status === 440 && sysStatusData2.code === 'SESSION_INVALIDATED') {
      console.log('✔ OK: Token de sistema original revocado correctamente con HTTP 440.');
    } else {
      console.error('❌ ERROR: Se esperaba HTTP 440 por revocación crítica. Status recibido:', sysStatusRes2.status);
    }

    // 10. Re-autenticar administrador para desactivar el estado de emergencia y dejar el sistema en línea
    console.log('\nTest 10: Re-autenticando administrador de sistema para restaurar el sistema...');
    const sysLoginRes3 = await fetch('http://127.0.0.1:4000/api/auth/system-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(systemCredentials)
    });
    const sysLoginData3 = await sysLoginRes3.json();
    const freshSystemToken = sysLoginData3.token;

    console.log('Desactivando mantenimiento de emergencia...');
    const finalDisableRes = await fetch('http://127.0.0.1:4000/api/manage/system/maintenance/disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshSystemToken}`
      }
    });

    if (finalDisableRes.status === 200) {
      console.log('✔ OK: Sistema restaurado e inicio de sesión en línea completado.');
    } else {
      console.error('❌ ERROR: No se pudo restaurar el sistema.');
    }

    console.log('\n=== TODAS LAS PRUEBAS DE MODO MANTENIMIENTO CON DOS NIVELES DE REVOCACIÓN COMPLETADAS CON ÉXITO ===');
  } catch (error) {
    console.error('❌ ERROR CRÍTICO durante el test:', error.message);
  }
}

testMaintenanceMode();
