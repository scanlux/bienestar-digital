require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

const API_URL = 'http://127.0.0.1:4000';

async function testCatalogPermissions() {
  console.log('=== TEST E2E: CATALOG PERMISSIONS & BOLA SECURITY ===');

  const dbConfig = {
    host: process.env.DB_HOST || '100.127.144.125',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  let tokenCommerce1 = '';
  let tokenCommerce2 = '';
  let tokenDriver = '';

  try {
    // 1. Iniciar sesión como admin_commerce_1 (dueño de Sede 1 y 2)
    console.log('\n--- 1. Iniciando sesión como admin_commerce_1@trendy.sytes.net ---');
    const loginCommerce1 = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin_commerce_1@trendy.sytes.net',
      password: 'admin123'
    });
    tokenCommerce1 = loginCommerce1.data.token;
    console.log('SUCCESS: Sesión de admin_commerce_1 iniciada.');

    // 2. Iniciar sesión como admin_commerce_2 (dueño de Sede 3)
    console.log('\n--- 2. Iniciando sesión como admin_commerce_2@trendy.sytes.net ---');
    const loginCommerce2 = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin_commerce_2@trendy.sytes.net',
      password: 'admin123'
    });
    tokenCommerce2 = loginCommerce2.data.token;
    console.log('SUCCESS: Sesión de admin_commerce_2 iniciada.');

    // 3. Iniciar sesión como driver_1 (sin permiso de catálogo)
    console.log('\n--- 3. Iniciando sesión como driver_1@trendy.sytes.net ---');
    const loginDriver = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'driver_1@trendy.sytes.net',
      password: 'driver123'
    });
    tokenDriver = loginDriver.data.token;
    console.log('SUCCESS: Sesión de driver_1 iniciada.');

    // 4. GET /api/manage/store-menus/1 con token de commerce 1 (Autorizado)
    console.log('\n--- 4. Consultando menus de Sede 1 como admin_commerce_1 (Permitido) ---');
    const resGetAuth = await axios.get(`${API_URL}/api/manage/store-menus/1`, {
      headers: { Authorization: `Bearer ${tokenCommerce1}` }
    });
    if (resGetAuth.status === 200) {
      console.log('SUCCESS: Acceso permitido correctamente. Menus devueltos:', resGetAuth.data.length);
    } else {
      console.error('ERROR: Código inesperado para admin_commerce_1:', resGetAuth.status);
    }

    // 5. GET /api/manage/store-menus/1 con token de commerce 2 (BOLA - Debe denegarse)
    console.log('\n--- 5. Consultando menus de Sede 1 como admin_commerce_2 (Debe denegarse - BOLA Check) ---');
    try {
      await axios.get(`${API_URL}/api/manage/store-menus/1`, {
        headers: { Authorization: `Bearer ${tokenCommerce2}` }
      });
      console.error('ERROR: El acceso fue permitido para admin_commerce_2 (Fallo BOLA).');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('SUCCESS: Acceso denegado correctamente con código 403 Forbidden.');
        console.log('Detalle del error devuelto:', err.response.data.error);
      } else {
        console.error('ERROR: Código de respuesta inesperado:', err.response?.status || err.message);
      }
    }

    // 6. GET /api/manage/store-menus/1 con token de driver 1 (Falta Permiso - Debe denegarse)
    console.log('\n--- 6. Consultando menus de Sede 1 como driver_1 (Debe denegarse - Sin Permiso) ---');
    try {
      await axios.get(`${API_URL}/api/manage/store-menus/1`, {
        headers: { Authorization: `Bearer ${tokenDriver}` }
      });
      console.error('ERROR: El acceso fue permitido para driver_1.');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('SUCCESS: Acceso denegado correctamente con código 403 Forbidden.');
        console.log('Detalle del error devuelto:', err.response.data.error);
      } else {
        console.error('ERROR: Código de respuesta inesperado:', err.response?.status || err.message);
      }
    }

    // 7. POST /api/manage/store-menus para Sede 1 con token de commerce 1 (Autorizado)
    console.log('\n--- 7. Toggle menú en Sede 1 como admin_commerce_1 (Permitido) ---');
    const resPostAuth = await axios.post(`${API_URL}/api/manage/store-menus`, {
      store_id: 1,
      menu_id: 1,
      disponible: 1
    }, {
      headers: { Authorization: `Bearer ${tokenCommerce1}` }
    });
    if (resPostAuth.status === 200) {
      console.log('SUCCESS: Menú toggled exitosamente.', resPostAuth.data);
    } else {
      console.error('ERROR: Código inesperado para admin_commerce_1:', resPostAuth.status);
    }

    // 8. POST /api/manage/store-menus para Sede 1 con token de commerce 2 (BOLA - Debe denegarse)
    console.log('\n--- 8. Toggle menú en Sede 1 como admin_commerce_2 (Debe denegarse - BOLA Check) ---');
    try {
      await axios.post(`${API_URL}/api/manage/store-menus`, {
        store_id: 1,
        menu_id: 1,
        disponible: 1
      }, {
        headers: { Authorization: `Bearer ${tokenCommerce2}` }
      });
      console.error('ERROR: El cambio fue permitido para admin_commerce_2 (Fallo BOLA).');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('SUCCESS: Acceso denegado correctamente con código 403 Forbidden.');
        console.log('Detalle del error devuelto:', err.response.data.error);
      } else {
        console.error('ERROR: Código de respuesta inesperado:', err.response?.status || err.message);
      }
    }

    // 9. Verificar base de datos para asegurar el registro de BOLA_ATTEMPT
    console.log('\n--- 9. Verificando inserción de log BOLA_ATTEMPT en MariaDB ---');
    const connection = await mysql.createConnection(dbConfig);

    const [bolaLogs] = await connection.execute(
      `SELECT * FROM security_audit_logs 
       WHERE event_type = 'BOLA_ATTEMPT' 
       ORDER BY created_at DESC LIMIT 2`
    );

    if (bolaLogs.length > 0) {
      console.log(`SUCCESS: Encontrados ${bolaLogs.length} logs de BOLA_ATTEMPT.`);
      bolaLogs.forEach(log => {
        console.log(` - ID: ${log.id}`);
        console.log(` - Actor ID: ${log.actor_id}`);
        console.log(` - Severity: ${log.severity}`);
        console.log(` - IP: ${log.ip_address}`);
        console.log(` - Resource Type: ${log.resource_type}, ID: ${log.resource_id}`);
        console.log(` - Details: ${log.details}`);
      });
    } else {
      console.error('ERROR: No se encontraron logs de BOLA_ATTEMPT en la base de datos.');
    }

    await connection.end();
    console.log('\n=== TEST E2E FINALIZADO EXITOSAMENTE ===');

  } catch (error) {
    console.error('ERROR CRÍTICO EN EL TEST:', error.response?.data?.error || error.message);
  }
}

testCatalogPermissions();
