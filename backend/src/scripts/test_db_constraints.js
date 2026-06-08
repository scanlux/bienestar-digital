const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function testConstraints() {
  console.log('=== INICIANDO VALIDACIÓN DE TRIGGERS Y CONSTRAINTS EN DB ===');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_ROOT_PASSWORD || '',
    database: process.env.DB_NAME || 'marketplace_db',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  });

  try {
    // --------------------------------------------------------------------------
    // Test 1: Intentar registrar dos perfiles con el mismo teléfono
    // --------------------------------------------------------------------------
    console.log('\nTest 1: Unicidad de teléfono en profiles...');
    try {
      // Intentar insertar dos perfiles con el mismo teléfono '3009999999'
      await connection.query('INSERT INTO users (email, password_hash, rol, estado) VALUES ("test1@domi.com", "hash", "customer", "activo")');
      const [[user1]] = await connection.query('SELECT id FROM users WHERE email = "test1@domi.com"');

      await connection.query('INSERT INTO users (email, password_hash, rol, estado) VALUES ("test2@domi.com", "hash", "customer", "activo")');
      const [[user2]] = await connection.query('SELECT id FROM users WHERE email = "test2@domi.com"');

      // Insertar primer perfil
      await connection.query(
        'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, "Test1", "User", "111111", "3009999999")',
        [user1.id]
      );
      
      // Intentar insertar segundo perfil con el mismo teléfono (Debe fallar)
      await connection.query(
        'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, "Test2", "User", "222222", "3009999999")',
        [user2.id]
      );
      console.error('❌ Test 1 Falló: La base de datos permitió registrar dos teléfonos idénticos.');
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.message.includes('Duplicate entry')) {
        console.log('✔ Test 1 Pasó: La base de datos rechazó correctamente el teléfono duplicado.');
      } else {
        console.error('❌ Test 1 Falló con error inesperado:', err.message);
      }
    }

    // --------------------------------------------------------------------------
    // Test 2: Activar es_repartidor en un Administrador
    // --------------------------------------------------------------------------
    console.log('\nTest 2: Trigger de rol de repartidor (solo customer)...');
    try {
      await connection.query('INSERT INTO users (email, password_hash, rol, estado) VALUES ("admin_test@domi.com", "hash", "admin", "activo")');
      const [[adminUser]] = await connection.query('SELECT id FROM users WHERE email = "admin_test@domi.com"');

      // Intentar forzar es_repartidor = 1 en un admin (Debe ser rechazado por el trigger)
      await connection.query('UPDATE users SET es_repartidor = 1 WHERE id = ?', [adminUser.id]);
      console.error('❌ Test 2 Falló: El motor permitió activar el modo repartidor en un administrador.');
    } catch (err) {
      if (err.message.includes('Solo un usuario con rol customer puede activar el modo repartidor')) {
        console.log('✔ Test 2 Pasó: El trigger rechazó correctamente el modo repartidor para el administrador.');
      } else {
        console.error('❌ Test 2 Falló con error inesperado:', err.message);
      }
    }

    // --------------------------------------------------------------------------
    // Test 3: Unicidad de NIT en comercios
    // --------------------------------------------------------------------------
    console.log('\nTest 3: Unicidad de NIT en comercios...');
    try {
      // Crear primer comercio
      await connection.query('INSERT INTO commerces (nombre, nit, status) VALUES ("Comercio Test 1", "999-NIT-999", "active")');
      // Intentar crear segundo comercio con el mismo NIT (Debe fallar)
      await connection.query('INSERT INTO commerces (nombre, nit, status) VALUES ("Comercio Test 2", "999-NIT-999", "active")');
      console.error('❌ Test 3 Falló: El motor permitió registrar dos comercios con el mismo NIT.');
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.message.includes('Duplicate entry')) {
        console.log('✔ Test 3 Pasó: El motor rechazó correctamente el NIT duplicado.');
      } else {
        console.error('❌ Test 3 Falló con error inesperado:', err.message);
      }
    }

    // --------------------------------------------------------------------------
    // Test 4: Inmutabilidad de Wallet
    // --------------------------------------------------------------------------
    console.log('\nTest 4: Inmutabilidad de propietario de Wallet...');
    try {
      const [[u1]] = await connection.query('SELECT id FROM users WHERE email = "test1@domi.com"');
      const [[u2]] = await connection.query('SELECT id FROM users WHERE email = "test2@domi.com"');
      
      const [[w1]] = await connection.query('SELECT id FROM wallets WHERE usuario_id = ?', [u1.id]);

      // Intentar cambiar el usuario_id de la wallet 1 al usuario 2 (Debe fallar)
      await connection.query('UPDATE wallets SET usuario_id = ? WHERE id = ?', [u2.id, w1.id]);
      console.error('❌ Test 4 Falló: El motor permitió cambiar el propietario de la billetera.');
    } catch (err) {
      if (err.message.includes('La billetera no puede reasignarse a otro usuario')) {
        console.log('✔ Test 4 Pasó: El trigger bloqueó correctamente la reasignación de propietario.');
      } else {
        console.error('❌ Test 4 Falló con error inesperado:', err.message);
      }
    }

    // --------------------------------------------------------------------------
    // Limpieza de datos de prueba (Bypass temporal de seguridad para borrar los inserts de test)
    // --------------------------------------------------------------------------
    console.log('\nLimpiando registros de prueba de la base de datos...');
    await connection.query('SET @domi_bypass_security = 1');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DELETE FROM profiles WHERE nombres IN ("Test1", "Test2")');
    await connection.query('DELETE FROM users WHERE email IN ("test1@domi.com", "test2@domi.com", "admin_test@domi.com")');
    await connection.query('DELETE FROM wallets WHERE usuario_id IS NULL AND owner_type = "user"'); // limpiar wallets huérfanas creadas por los inserts
    await connection.query('DELETE FROM commerces WHERE nit = "999-NIT-999"');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.query('SET @domi_bypass_security = NULL');
    console.log('✔ Limpieza completada.');

  } catch (globalErr) {
    console.error('ERROR GLOBAL EN EL SCRIPT DE PRUEBAS:', globalErr);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

testConstraints();
