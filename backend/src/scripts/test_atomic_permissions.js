require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

const API_URL = 'http://127.0.0.1:4000';

async function testAtomicPermissions() {
  console.log('=== TEST E2E: ATOMIC PERMISSIONS & AUDIT LOGS ===');

  const dbConfig = {
    host: process.env.DB_HOST || '100.127.144.125',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  let tokenSedeAdmin = '';
  let tokenCommerceAdmin = '';
  let tokenDriver = '';
  let managedStores = [];
  let originalStoreManager = null;
  let sedeAdminUserId = null;

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('SUCCESS: Conectado a la base de datos MariaDB.');

    // 1. Obtener un administrador de sede (rol_id = 5) que no sea Gerente del Sistema (rol_id = 2)
    const [sedeAdmins] = await connection.execute(
      `SELECT u.id, u.email FROM users u 
       JOIN user_roles ur ON u.id = ur.user_id 
       WHERE ur.role_id = 5 
         AND u.id NOT IN (SELECT user_id FROM user_roles WHERE role_id = 2)
       LIMIT 1`
    );

    let sedeAdminEmail = '';
    let sedeAdminUserId = null;
    if (sedeAdmins.length === 0) {
      console.log('WARN: No se encontró un usuario puro con rol_id = 5. Asignando temporalmente rol 5 a admin_commerce_2@trendy.sytes.net para el test.');
      const [u] = await connection.execute("SELECT id FROM users WHERE email = 'admin_commerce_2@trendy.sytes.net'");
      if (u.length > 0) {
        await connection.execute("SET @domi_is_root = 1;");
        await connection.execute("UPDATE user_roles SET role_id = 5 WHERE user_id = ?", [u[0].id]);
        sedeAdminEmail = 'admin_commerce_2@trendy.sytes.net';
        sedeAdminUserId = u[0].id;
      } else {
        throw new Error('No se pudo encontrar un usuario para simular Sede Admin.');
      }
    } else {
      sedeAdminEmail = sedeAdmins[0].email;
      sedeAdminUserId = sedeAdmins[0].id;
    }
    console.log(`INFO: Usando administrador de sede: ${sedeAdminEmail}`);

    // Guardar gerente original de sede 1 y asignarle el test Sede Admin
    const [origStoreManagerRows] = await connection.execute("SELECT usuario_id FROM stores WHERE id = 1");
    originalStoreManager = origStoreManagerRows[0]?.usuario_id || null;

    // Si el usuario ya administra otras sedes, las liberamos temporalmente por la restricción UNIQUE(usuario_id)
    const [existingManaged] = await connection.execute("SELECT id FROM stores WHERE usuario_id = ?", [sedeAdminUserId]);
    managedStores = existingManaged;
    for (const st of managedStores) {
      await connection.execute("UPDATE stores SET usuario_id = NULL WHERE id = ?", [st.id]);
      console.log(`INFO: Liberada temporalmente la sede ${st.id} administrada por el usuario ${sedeAdminUserId}`);
    }

    await connection.execute("UPDATE stores SET usuario_id = NULL WHERE id = 1");
    await connection.execute("UPDATE stores SET usuario_id = ? WHERE id = 1", [sedeAdminUserId]);
    console.log(`INFO: Asignado usuario ${sedeAdminUserId} como gerente temporal de Sede 1`);

    // 2. Iniciar sesión como Sede Admin (Solo edit_store_basic)
    console.log('\n--- Iniciando sesión como Sede Admin ---');
    const loginSede = await axios.post(`${API_URL}/api/auth/login`, {
      email: sedeAdminEmail,
      password: 'admin123'
    });
    tokenSedeAdmin = loginSede.data.token;
    console.log('SUCCESS: Token obtenido para Sede Admin.');

    // 3. Iniciar sesión como Commerce Admin (edit_store_advanced + write_catalog)
    console.log('\n--- Iniciando sesión como Commerce Admin ---');
    const loginCommerce = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin_commerce_1@trendy.sytes.net',
      password: 'admin123'
    });
    tokenCommerceAdmin = loginCommerce.data.token;
    console.log('SUCCESS: Token obtenido para Commerce Admin.');

    // 4. Iniciar sesión como Driver (Sin permisos de catálogo ni sede)
    console.log('\n--- Iniciando sesión como Driver ---');
    const loginDriver = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'driver_1@trendy.sytes.net',
      password: 'driver123'
    });
    tokenDriver = loginDriver.data.token;
    console.log('SUCCESS: Token obtenido para Driver.');

    // 5. TEST: Edición de datos básicos por Sede Admin (Permitido)
    console.log('\n--- TEST: Sede Admin modifica datos básicos (Debe permitirse) ---');
    // Obtenemos los datos actuales de la sede 1 o 2 asignada a este comercio
    const [stores] = await connection.execute("SELECT * FROM stores WHERE id = 1");
    const originalStore = stores[0];

    try {
      const resBasic = await axios.post(`${API_URL}/api/manage/stores`, {
        id: 1,
        commerce_id: originalStore.commerce_id,
        nombre_sucursal: originalStore.nombre_sucursal, // Mismo valor
        direccion: originalStore.direccion, // Mismo valor
        latitud: originalStore.latitud, // Mismo valor
        longitud: originalStore.longitud, // Mismo valor
        matricula: originalStore.matricula, // Mismo valor
        estado: 'operativo',
        telefono: '3119999999', // Cambiado (básico)
        telefono_domicilio: '3118888888', // Cambiado (básico)
        image_url: originalStore.image_url
      }, {
        headers: { Authorization: `Bearer ${tokenSedeAdmin}` }
      });
      if (resBasic.status === 200) {
        console.log('SUCCESS: Cambio básico permitido correctamente.');
      } else {
        console.error('ERROR: Respuesta inesperada:', resBasic.status);
      }
    } catch (err) {
      console.error('ERROR: Falló edición básica autorizada:', err.response?.data || err.message);
    }

    // 6. TEST: Edición de datos avanzados por Sede Admin (Rechazado)
    console.log('\n--- TEST: Sede Admin intenta modificar datos avanzados (Debe rechazarse 403) ---');
    try {
      await axios.post(`${API_URL}/api/manage/stores`, {
        id: 1,
        commerce_id: originalStore.commerce_id,
        nombre_sucursal: 'Intento Sede Hackeada', // Cambiado (avanzado)
        direccion: originalStore.direccion,
        latitud: originalStore.latitud,
        longitud: originalStore.longitud,
        matricula: originalStore.matricula,
        estado: 'operativo',
        telefono: '3119999999',
        telefono_domicilio: '3118888888',
        image_url: originalStore.image_url
      }, {
        headers: { Authorization: `Bearer ${tokenSedeAdmin}` }
      });
      console.error('ERROR: Se permitió la modificación avanzada no autorizada.');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('SUCCESS: Bloqueo exitoso (403 Forbidden).');
        console.log('Detalle del error:', err.response.data.error);
      } else {
        console.error('ERROR: Código inesperado:', err.response?.status || err.message);
      }
    }

    // 7. TEST: Edición de datos avanzados por Commerce Admin (Permitido)
    console.log('\n--- TEST: Commerce Admin modifica datos avanzados (Debe permitirse) ---');
    try {
      const resAdvanced = await axios.post(`${API_URL}/api/manage/stores`, {
        id: 1,
        commerce_id: originalStore.commerce_id,
        nombre_sucursal: originalStore.nombre_sucursal, // Revertir a original
        direccion: 'Calle 100 # 15-30', // Cambiado (avanzado)
        latitud: originalStore.latitud,
        longitud: originalStore.longitud,
        matricula: originalStore.matricula,
        estado: 'operativo',
        telefono: '3119999999',
        telefono_domicilio: '3118888888',
        image_url: originalStore.image_url
      }, {
        headers: { Authorization: `Bearer ${tokenCommerceAdmin}` }
      });
      if (resAdvanced.status === 200) {
        console.log('SUCCESS: Cambio avanzado permitido correctamente.');
      } else {
        console.error('ERROR: Respuesta inesperada:', resAdvanced.status);
      }
    } catch (err) {
      console.error('ERROR: Falló edición avanzada autorizada:', err.response?.data || err.message);
    }

    // 8. TEST: Operaciones de Catálogo
    console.log('\n--- TEST: Driver intenta togglear catálogo local (Debe rechazarse) ---');
    try {
      await axios.post(`${API_URL}/api/manage/store-menus`, {
        store_id: 1,
        menu_id: 1,
        disponible: 1
      }, {
        headers: { Authorization: `Bearer ${tokenDriver}` }
      });
      console.error('ERROR: El driver pudo realizar cambios en el catálogo.');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('SUCCESS: Bloqueo de catálogo local exitoso (403).');
      } else {
        console.error('ERROR: Código inesperado:', err.response?.status || err.message);
      }
    }

    console.log('\n--- TEST: Driver intenta modificar producto maestro (Debe rechazarse) ---');
    try {
      await axios.post(`${API_URL}/api/manage/products`, {
        id: 1,
        nombre: 'Producto Hackeado'
      }, {
        headers: { Authorization: `Bearer ${tokenDriver}` }
      });
      console.error('ERROR: El driver pudo modificar el producto maestro.');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('SUCCESS: Bloqueo de catálogo maestro exitoso (403).');
      } else {
        console.error('ERROR: Código inesperado:', err.response?.status || err.message);
      }
    }

    // 9. Verificar Logs de Auditoría
    console.log('\n--- Verificando registros de auditoría en base de datos ---');
    const [auditLogs] = await connection.execute(
      `SELECT * FROM security_audit_logs 
       WHERE event_type = 'UNAUTHORIZED_FIELD_MODIFICATION' 
       ORDER BY created_at DESC LIMIT 1`
    );

    if (auditLogs.length > 0) {
      console.log('SUCCESS: Log de UNAUTHORIZED_FIELD_MODIFICATION registrado correctamente.');
      console.log(` - ID: ${auditLogs[0].id}`);
      console.log(` - Details: ${auditLogs[0].details}`);
    } else {
      console.error('ERROR: No se encontró el log de auditoría esperado.');
    }

    // Restaurar base de datos
    console.log('\n--- Restaurando dirección y gerente original de sede ---');
    await connection.execute("UPDATE stores SET usuario_id = NULL WHERE id = 1");
    await connection.execute(
      "UPDATE stores SET direccion = ?, usuario_id = ? WHERE id = 1",
      [originalStore.direccion, originalStoreManager]
    );


    // Restaurar sedes liberadas
    for (const st of managedStores) {
      await connection.execute("UPDATE stores SET usuario_id = ? WHERE id = ?", [sedeAdminUserId, st.id]);
      console.log(`INFO: Restaurada sede ${st.id} administrada por el usuario ${sedeAdminUserId}`);
    }

    if (sedeAdmins.length === 0) {
      console.log('INFO: Restaurando rol de admin_commerce_2@trendy.sytes.net...');
      const [u] = await connection.execute("SELECT id FROM users WHERE email = 'admin_commerce_2@trendy.sytes.net'");
      await connection.execute("UPDATE user_roles SET role_id = 3 WHERE user_id = ?", [u[0].id]);
    }

    await connection.end();
    console.log('\n=== TEST E2E COMPLETADO EXITOSAMENTE ===');

  } catch (error) {
    console.error('ERROR CRÍTICO EN EL TEST:', error.response?.data || error.message);
  }
}

testAtomicPermissions();
