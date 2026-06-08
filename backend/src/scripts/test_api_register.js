const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function testApiRegister() {
  console.log('=== TEST REGISTRO API CON TRIGGER DE WALLET ===');
  
  const testEmail = 'api_test_user@domi.com';
  const testPhone = '3219876543';
  const testCedula = '1099887766';

  // Primero limpiamos si ya existe por pruebas anteriores
  const dbConnection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_ROOT_PASSWORD || '',
    database: process.env.DB_NAME || 'marketplace_db',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  });

  try {
    await dbConnection.query('SET @domi_bypass_security = 1');
    await dbConnection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Buscar si existe algún perfil con el mismo teléfono o cédula, y eliminar sus usuarios correspondientes
    const [profiles] = await dbConnection.query(
      'SELECT usuario_id FROM profiles WHERE telefono = ? OR cedula = ?',
      [testPhone, testCedula]
    );

    const userIds = new Set(profiles.map(p => p.usuario_id));
    
    // También buscar por email
    const [usersByEmail] = await dbConnection.query('SELECT id FROM users WHERE email = ?', [testEmail]);
    usersByEmail.forEach(u => userIds.add(u.id));

    for (const uId of userIds) {
      if (uId) {
        await dbConnection.query('DELETE FROM profiles WHERE usuario_id = ?', [uId]);
        await dbConnection.query('DELETE FROM user_addresses WHERE user_id = ?', [uId]);
        await dbConnection.query('DELETE FROM wallets WHERE usuario_id = ?', [uId]);
        await dbConnection.query('DELETE FROM users WHERE id = ?', [uId]);
        console.log(`✔ Limpieza de usuario ID ${uId} realizada.`);
      }
    }
  } catch (err) {
    console.error('Error limpiando antes del test:', err.message);
  } finally {
    await dbConnection.query('SET FOREIGN_KEY_CHECKS = 1');
    await dbConnection.query('SET @domi_bypass_security = NULL');
  }

  // Hacer el POST a la API local
  try {
    const response = await fetch('http://127.0.0.1:4000/api/auth/mobile/register-full', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        nombre: 'Api Test User',
        cedula: testCedula,
        celular: testPhone,
        password: 'password123',
        direccion: 'Calle Falsa 123',
        latitud: 4.60971,
        longitud: -74.08175
      })
    });

    const data = await response.json();
    console.log('Respuesta de la API (Status:', response.status, '):', data);

    // Verificar en la base de datos que se haya creado todo, especialmente la Wallet
    const [[createdUser]] = await dbConnection.query('SELECT * FROM users WHERE email = ?', [testEmail]);
    if (createdUser) {
      console.log('✔ Usuario creado en DB:', createdUser.email, 'con id:', createdUser.id);
      
      const [[createdProfile]] = await dbConnection.query('SELECT * FROM profiles WHERE usuario_id = ?', [createdUser.id]);
      if (createdProfile) {
        console.log('✔ Perfil creado en DB:', createdProfile.nombres, createdProfile.apellidos, 'Teléfono:', createdProfile.telefono);
      } else {
        console.error('❌ ERROR: Perfil no encontrado en DB.');
      }

      const [[createdWallet]] = await dbConnection.query('SELECT * FROM wallets WHERE usuario_id = ?', [createdUser.id]);
      if (createdWallet) {
        console.log('✔ Wallet creada por TRIGGER en DB! ID:', createdWallet.id, 'Balance:', createdWallet.balance);
      } else {
        console.error('❌ ERROR: Wallet no fue creada automáticamente.');
      }
      
      const [addresses] = await dbConnection.query('SELECT * FROM user_addresses WHERE user_id = ?', [createdUser.id]);
      if (addresses.length > 0) {
        console.log('✔ Dirección creada en DB:', addresses[0].direccion);
      } else {
        console.error('❌ ERROR: Dirección no encontrada en DB.');
      }
    } else {
      console.error('❌ ERROR: El usuario no se creó en la DB.');
    }

  } catch (apiErr) {
    console.error('❌ Error llamando a la API de registro:', apiErr, '\nCause:', apiErr.cause);
  } finally {
    // Limpieza final
    try {
      await dbConnection.query('SET @domi_bypass_security = 1');
      await dbConnection.query('SET FOREIGN_KEY_CHECKS = 0');
      const [[user]] = await dbConnection.query('SELECT id FROM users WHERE email = ?', [testEmail]);
      if (user) {
        await dbConnection.query('DELETE FROM profiles WHERE usuario_id = ?', [user.id]);
        await dbConnection.query('DELETE FROM user_addresses WHERE user_id = ?', [user.id]);
        await dbConnection.query('DELETE FROM wallets WHERE usuario_id = ?', [user.id]);
        await dbConnection.query('DELETE FROM users WHERE id = ?', [user.id]);
        console.log('✔ Datos de prueba eliminados correctamente.');
      }
    } catch (cleanupErr) {
      console.error('Error al limpiar al final:', cleanupErr.message);
    } finally {
      await dbConnection.query('SET FOREIGN_KEY_CHECKS = 1');
      await dbConnection.query('SET @domi_bypass_security = NULL');
      await dbConnection.end();
    }
  }
}

testApiRegister();
