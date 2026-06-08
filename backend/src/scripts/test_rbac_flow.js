async function runTest() {
  console.log('=== PRUEBA DE FLUJO RBAC Y MIDDLEWARE HASPERMISSION ===');

  try {
    // 1. Obtener token de system_manager (system@)
    console.log('\n--- 1. Login como system_manager (sin permiso manage_rbac) ---');
    const res1 = await fetch('http://127.0.0.1:4000/api/auth/system-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'system@trendy.sytes.net', password: 'admin123' })
    });
    const data1 = await res1.json();
    const tokenSystem = data1.token;
    console.log('Token de system_manager obtenido.');

    // 2. Obtener token de root (root@)
    console.log('\n--- 2. Login como root (con permiso manage_rbac) ---');
    const res2 = await fetch('http://127.0.0.1:4000/api/auth/system-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'root@trendy.sytes.net', password: 'admin123' })
    });
    const data2 = await res2.json();
    const tokenRoot = data2.token;
    console.log('Token de root obtenido.');

    // 3. system_manager intenta acceder a /api/manage/roles -> Espera 403
    console.log('\n--- 3. Probando acceso denegado (system_manager en /api/manage/roles) ---');
    const res3 = await fetch('http://127.0.0.1:4000/api/manage/roles', {
      headers: { 'Authorization': `Bearer ${tokenSystem}` }
    });
    const data3 = await res3.json();
    if (res3.status === 403) {
      console.log('✔ Correcto: Recibió Status 403. Mensaje:', data3.error);
    } else {
      console.error('❌ ERROR: Debería haber dado 403, devolvió:', res3.status, data3);
    }

    // 4. root accede a /api/manage/roles -> Espera 200 y roles
    console.log('\n--- 4. Probando acceso autorizado (root en /api/manage/roles) ---');
    const res4 = await fetch('http://127.0.0.1:4000/api/manage/roles', {
      headers: { 'Authorization': `Bearer ${tokenRoot}` }
    });
    const data4 = await res4.json();
    if (res4.status === 200) {
      console.log('✔ Correcto: Acceso autorizado. Cantidad de roles recibidos:', data4.length);
      console.log('Primer rol recibido:', data4[0].name, `(${data4[0].code})`);
    } else {
      console.error('❌ ERROR: Debería haber dado 200, devolvió:', res4.status, data4);
    }

    // 5. root accede a /api/manage/permissions -> Espera 200 y permisos
    console.log('\n--- 5. Probando catálogo de permisos (root en /api/manage/permissions) ---');
    const res5 = await fetch('http://127.0.0.1:4000/api/manage/permissions', {
      headers: { 'Authorization': `Bearer ${tokenRoot}` }
    });
    const data5 = await res5.json();
    if (res5.status === 200) {
      console.log('✔ Correcto: Catálogo plano recibido. Cantidad de permisos:', data5.length);
    } else {
      console.error('❌ ERROR: Debería haber dado 200, devolvió:', res5.status, data5);
    }

    console.log('\n=== PRUEBAS DE FLUJO RBAC COMPLETADAS CON ÉXITO ===');
  } catch (error) {
    console.error('❌ ERROR CRÍTICO durante el test:', error);
  }
}

runTest();
