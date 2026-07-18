const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306')
};

async function runTests() {
  console.log('--- INICIANDO PRUEBAS DE INTEGRIDAD DE BILLETERAS ---');
  const conn = await mysql.createConnection(dbConfig);
  
  try {
    // Limpieza previa
    await conn.query('DELETE FROM users WHERE email = "test_integrity_user@trendy.sytes.net"');

    // 1. Crear un usuario de prueba (customer)
    console.log('\n[TEST 1] Creando usuario tipo customer...');
    const [userRes] = await conn.query(
      'INSERT INTO users (email, password_hash, rol, estado) VALUES ("test_integrity_user@trendy.sytes.net", "dummyhash", "customer", "activo")'
    );
    const userId = userRes.insertId;
    console.log(`Usuario creado con ID: ${userId}`);

    // Verificar creación automática de wallet
    const [wallets] = await conn.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    if (wallets.length === 1) {
      console.log(`✓ Wallet creada automáticamente con ID: ${wallets[0].id}`);
    } else {
      throw new Error('✕ ERROR: No se creó la wallet automáticamente.');
    }

    // 2. Intentar crear una wallet vacía (sin propietario)
    console.log('\n[TEST 2] Intentando crear una wallet sin propietario...');
    try {
      await conn.query('INSERT INTO wallets (tier) VALUES ("standard")');
      throw new Error('✕ ERROR: Se permitió crear una wallet sin ningún propietario.');
    } catch (err) {
      if (err.message.includes('chk_wallet_owner')) {
        console.log('✓ Correcto: Bloqueado por CHECK constraint (chk_wallet_owner).');
      } else {
        throw err;
      }
    }

    // 3. Intentar crear una wallet con más de un propietario
    console.log('\n[TEST 3] Intentando crear una wallet con múltiples propietarios (user_id y store_id)...');
    try {
      await conn.query('INSERT INTO wallets (user_id, store_id) VALUES (999999, 1)');
      throw new Error('✕ ERROR: Se permitió crear una wallet con múltiples propietarios.');
    } catch (err) {
      if (err.message.includes('chk_wallet_owner')) {
        console.log('✓ Correcto: Bloqueado por CHECK constraint (chk_wallet_owner).');
      } else {
        throw err;
      }
    }

    // 4. Intentar crear una segunda wallet para el mismo usuario
    console.log('\n[TEST 4] Intentando crear una segunda wallet para el mismo usuario...');
    try {
      await conn.query('INSERT INTO wallets (user_id) VALUES (?)', [userId]);
      throw new Error('✕ ERROR: Se permitió crear una segunda wallet para el mismo usuario.');
    } catch (err) {
      if (err.sqlState === '45000' && err.message.includes('Integridad: Este usuario ya posee una billetera DOMI')) {
        console.log('✓ Correcto: Bloqueado por trigger enforce_single_wallet_per_user.');
      } else {
        throw err;
      }
    }

    // 5. Intentar modificar el propietario de la wallet
    console.log('\n[TEST 5] Intentando reasignar el user_id de la wallet...');
    const walletId = wallets[0].id;
    try {
      await conn.query('UPDATE wallets SET user_id = 9999 WHERE id = ?', [walletId]);
      throw new Error('✕ ERROR: Se permitió cambiar el user_id de la wallet.');
    } catch (err) {
      if (err.sqlState === '45000' && err.message.includes('La propiedad de la billetera es inmutable')) {
        console.log('✓ Correcto: Bloqueado por trigger prevent_wallet_owner_change.');
      } else {
        throw err;
      }
    }

    // 6. Intentar borrar la wallet directamente
    console.log('\n[TEST 6] Intentando borrar la wallet de forma directa...');
    try {
      await conn.query('DELETE FROM wallets WHERE id = ?', [walletId]);
      throw new Error('✕ ERROR: Se permitió eliminar la wallet directamente.');
    } catch (err) {
      if (err.sqlState === '45000' && err.message.includes('Prohibido eliminar billeteras de forma directa')) {
        console.log('✓ Correcto: Bloqueado por trigger prevent_wallet_deletion.');
      } else {
        throw err;
      }
    }

    // 7. Borrar el usuario y validar borrado en cascada
    console.log('\n[TEST 7] Eliminando al usuario para validar cascada...');
    await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    const [walletsAfterDelete] = await conn.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    if (walletsAfterDelete.length === 0) {
      console.log('✓ Correcto: La wallet se eliminó en cascada automáticamente con el usuario.');
    } else {
      throw new Error('✕ ERROR: La wallet quedó huérfana después de eliminar al usuario.');
    }

    console.log('\n--- TODAS LAS PRUEBAS PASARON EXITOSAMENTE ---');

  } catch (error) {
    console.error('\n✕ PRUEBA FALLIDA:', error.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runTests();
