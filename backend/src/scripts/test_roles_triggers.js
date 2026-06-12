require('dotenv').config();
const mysql = require('mysql2/promise');

async function testRolesTriggers() {
  console.log('=== TEST DE TRIGGERS DE SEGURIDAD Y AUDITORIA ===');

  const adminConfig = {
    host: process.env.DB_HOST || '100.127.144.125',
    user: 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  const rootConfig = {
    host: process.env.DB_HOST || '100.127.144.125',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  };

  // 1. Prueba de Bloqueo como usuario bienestar_admin_prod
  console.log('\n--- 1. Probando bloqueo de escritura en "roles" sin flag ---');
  let connectionAdmin;
  try {
    connectionAdmin = await mysql.createConnection(adminConfig);
    // Intentar insertar un rol de prueba sin flag
    await connectionAdmin.query(
      "INSERT INTO roles (name, code, description, is_system) VALUES ('Test Trigger', 'test_trigger_code', 'Desc', 0)"
    );
    console.error('ERROR: La insercion paso, el trigger no bloqueo la operacion.');
  } catch (error) {
    if (error.sqlState === '45000') {
      console.log('SUCCESS: El trigger bloqueo la operacion correctamente. Mensaje:', error.message);
    } else {
      console.error('ERROR INESPERADO al probar bloqueo:', error);
    }
  } finally {
    if (connectionAdmin) await connectionAdmin.end();
  }

  // 2. Prueba de Escritura autorizada como root con flag de sesion
  console.log('\n--- 2. Probando escritura autorizada con flag @domi_is_root = 1 ---');
  let connectionRoot;
  let testRoleId = null;
  try {
    connectionRoot = await mysql.createConnection(rootConfig);
    await connectionRoot.beginTransaction();

    // Activar flag de super admin en la sesion
    await connectionRoot.query('SET @domi_is_root = 1');

    // Insertar rol
    const [result] = await connectionRoot.query(
      "INSERT INTO roles (name, code, description, is_system) VALUES ('Test Root Flag', 'test_root_flag_code', 'Creado por root', 0)"
    );
    testRoleId = result.insertId;
    console.log(`SUCCESS: Rol insertado con exito. ID de rol: ${testRoleId}`);

    // Insertar permisos en role_permissions para probar otra tabla protegida
    await connectionRoot.query(
      "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, 1)",
      [testRoleId]
    );
    console.log('SUCCESS: Permisos de rol insertados con exito.');

    await connectionRoot.commit();
  } catch (error) {
    console.error('ERROR: Fallo la insercion autorizada con el flag:', error.message);
    if (connectionRoot) await connectionRoot.rollback();
  } finally {
    if (connectionRoot) {
      // 3. Limpieza de datos
      console.log('\n--- 3. Limpieza de registros creados en el test ---');
      try {
        await connectionRoot.beginTransaction();
        await connectionRoot.query('SET @domi_is_root = 1');
        if (testRoleId) {
          await connectionRoot.query('DELETE FROM roles WHERE id = ?', [testRoleId]);
          console.log('SUCCESS: Rol de prueba eliminado con exito.');
        }
        await connectionRoot.commit();
      } catch (cleanErr) {
        console.error('ERROR al limpiar datos de prueba:', cleanErr.message);
        await connectionRoot.rollback();
      }
      await connectionRoot.end();
    }
  }

  // 4. Verificacion de logs de auditoria
  console.log('\n--- 4. Verificando estructura de logs de auditoria ---');
  let connectionVerify;
  try {
    connectionVerify = await mysql.createConnection(adminConfig);
    
    // Consultar estructura actual de la tabla
    const [columns] = await connectionVerify.execute("SHOW COLUMNS FROM security_audit_logs");
    const fields = columns.map(c => c.Field);
    
    const hasResourceType = fields.includes('resource_type');
    const hasResourceId = fields.includes('resource_id');
    
    if (hasResourceType && hasResourceId) {
      console.log('SUCCESS: Columnas resource_type y resource_id verificadas en la tabla.');
    } else {
      console.error('ERROR: Faltan las columnas de recursos en security_audit_logs.');
    }
  } catch (error) {
    console.error('ERROR al verificar logs:', error.message);
  } finally {
    if (connectionVerify) await connectionVerify.end();
  }

  console.log('\n=== TEST FINALIZADO ===');
}

testRolesTriggers();
