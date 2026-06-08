require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

const API_URL = 'http://127.0.0.1:4000';

async function testPermissionsAnalysis() {
  console.log('=== TEST E2E: PERMISSIONS ANALYSIS & AUDIT LOGS ===');

  const config = {
    host: process.env.DB_HOST || '100.127.144.125',
    user: 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  let rootToken = '';
  let systemToken = '';

  try {
    // 1. Iniciar sesión como root
    console.log('\n--- 1. Iniciando sesión como root@trendy.sytes.net ---');
    const rootLogin = await axios.post(`${API_URL}/api/auth/system-login`, {
      email: 'root@trendy.sytes.net',
      password: 'admin123'
    });
    rootToken = rootLogin.data.token;
    console.log('SUCCESS: Sesión de root iniciada.');

    // 2. Iniciar sesión como system (system_manager)
    console.log('\n--- 2. Iniciando sesión como system@trendy.sytes.net ---');
    const systemLogin = await axios.post(`${API_URL}/api/auth/system-login`, {
      email: 'system@trendy.sytes.net',
      password: 'admin123'
    });
    systemToken = systemLogin.data.token;
    console.log('SUCCESS: Sesión de system (system_manager) iniciada.');

    // 3. Consultar endpoint con token de root
    console.log('\n--- 3. Consultando /api/manage/permissions-analysis como root (Permitido) ---');
    const analysisRes = await axios.get(`${API_URL}/api/manage/permissions-analysis`, {
      headers: { Authorization: `Bearer ${rootToken}` }
    });

    if (analysisRes.status === 200 && Array.isArray(analysisRes.data)) {
      console.log(`SUCCESS: Datos obtenidos. Cantidad de permisos en el catálogo: ${analysisRes.data.length}`);
      if (analysisRes.data.length === 32) {
        console.log('SUCCESS: El catálogo contiene exactamente los 32 permisos del sistema.');
      } else {
        console.error(`ERROR: Cantidad de permisos incorrecta (${analysisRes.data.length}). Esperada: 32`);
      }
    } else {
      console.error('ERROR: Respuesta incorrecta de la API.', analysisRes.status);
    }

    // 4. Consultar endpoint con token de system (Debe fallar)
    console.log('\n--- 4. Consultando /api/manage/permissions-analysis como system (Debe Denegarse) ---');
    try {
      await axios.get(`${API_URL}/api/manage/permissions-analysis`, {
        headers: { Authorization: `Bearer ${systemToken}` }
      });
      console.error('ERROR: El acceso fue permitido para system, no se validaron los permisos.');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('SUCCESS: El acceso fue denegado correctamente con código 403 Forbidden.');
      } else {
        console.error('ERROR: Código de respuesta inesperado.', err.response?.status || err.message);
      }
    }

    // 5. Verificar base de datos (Audit Logs)
    console.log('\n--- 5. Verificando inserción de logs en MariaDB ---');
    const connection = await mysql.createConnection(config);

    // A. Verificar log de visualización exitosa (root)
    const [viewLogs] = await connection.execute(
      `SELECT * FROM security_audit_logs 
       WHERE event_type = 'VIEW_PRIVILEGE_ANALYSIS' 
       ORDER BY created_at DESC LIMIT 1`
    );

    if (viewLogs.length > 0) {
      const log = viewLogs[0];
      console.log('SUCCESS: Log de VIEW_PRIVILEGE_ANALYSIS encontrado en base de datos.');
      console.log(` - Actor ID: ${log.actor_id} (system_user)`);
      console.log(` - Severity: ${log.severity}`);
      console.log(` - IP: ${log.ip_address}`);
    } else {
      console.error('ERROR: No se encontró el log de VIEW_PRIVILEGE_ANALYSIS en la base de datos.');
    }

    // B. Verificar log de intento no autorizado (system)
    const [unauthorizedLogs] = await connection.execute(
      `SELECT * FROM security_audit_logs 
       WHERE event_type = 'UNAUTHORIZED_ROUTE_ACCESS' 
         AND details LIKE '%permissions-analysis%'
       ORDER BY created_at DESC LIMIT 1`
    );

    if (unauthorizedLogs.length > 0) {
      const log = unauthorizedLogs[0];
      console.log('SUCCESS: Log de UNAUTHORIZED_ROUTE_ACCESS encontrado en base de datos.');
      console.log(` - Actor ID: ${log.actor_id} (system_user)`);
      console.log(` - Severity: ${log.severity}`);
      console.log(` - IP: ${log.ip_address}`);
      console.log(` - Details: ${log.details}`);
    } else {
      console.error('ERROR: No se encontró el log de UNAUTHORIZED_ROUTE_ACCESS para el endpoint.');
    }

    await connection.end();
    console.log('\n=== TEST E2E FINALIZADO EXITOSAMENTE ===');

  } catch (error) {
    console.error('ERROR CRÍTICO EN EL TEST:', error.response?.data?.error || error.message);
  }
}

testPermissionsAnalysis();
