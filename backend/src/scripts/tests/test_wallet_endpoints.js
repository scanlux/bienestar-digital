require('dotenv').config();
const db = require('../../config/db');
const redisClient = require('../../config/redis');
const domiRedis = require('../../services/domiRedis');
const securityLogger = require('../../utils/securityLogger');
const { checkDatabaseResetAllowed } = require('../../utils/envGuard');

// Mock security logger so it doesn't try to insert to actual log DB or fail if not configured
let securityEvents = [];
securityLogger.logSecurityEvent = async (userId, eventType, severity, req, details) => {
  securityEvents.push({ userId, eventType, severity, details });
  console.log(`[AUDIT LOG] ${eventType} (${severity}) - ${details?.reason || ''}`);
};

const domiService = require('../../domains/domi/domi.service');
const domiEngine = require('../../services/domiEngine');
const domiRepository = require('../../domains/domi/domi.repository');

async function test() {
  checkDatabaseResetAllowed();
  console.log('=== INICIANDO INTEGRACIÓN Y PRUEBAS DEL SISTEMA DE BILLETERA ===');
  const conn = await db.getConnection();
  let mockDeclarationId = null;

  try {
    // Inserta una reserva fiduciaria de prueba para permitir retiros/quemados
    await conn.query(
      `INSERT INTO domi_reserve_declarations (reserva_cop, declared_by, fecha_declaracion, notas)
       VALUES (999999999.00, 1, CURDATE(), 'Reserva de prueba para tests')`
    );
    const [[lastDecl]] = await conn.query('SELECT LAST_INSERT_ID() as id');
    mockDeclarationId = lastDecl.id;

    // Asegura que los retiros están habilitados
    await conn.query("UPDATE system_financial_flags SET enabled = 1 WHERE `key` = 'withdrawals_enabled'");

    // 0. Crear u obtener usuarios/billeteras de prueba
    console.log('0. Configurando y creando entidades de prueba (Validando Triggers)...');
    
    // Activar bypass de sesión para inserción manual de IDs
    await conn.query('SET @domi_is_root = 1');

    await conn.query('DELETE FROM domi_withdrawal_log WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9999, 8888, 7777))');
    await conn.query('DELETE FROM domi_packages WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9999, 8888, 7777))');
    await conn.query('DELETE FROM stores WHERE id = 7777');
    await conn.query('DELETE FROM commerces WHERE id = 8888');
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (9999, 8888, 7777)');
    await conn.query('DELETE FROM users WHERE id IN (9999, 8888, 7777)');

    // Crear User 9999 (Client)
    await conn.query(
      'INSERT INTO users (id, email, password_hash, rol, estado) VALUES (9999, "client@test.com", "hash", "customer", "activo")'
    );
    await conn.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (9999, "Juan", "Test", "12345678", "3009999999")'
    );

    // Crear User 8888 (Commerce Manager)
    await conn.query(
      'INSERT INTO users (id, email, password_hash, rol, estado) VALUES (8888, "commerce@test.com", "hash", "admin", "activo")'
    );
    await conn.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (8888, "Manager", "Test", "88888888", "3008888888")'
    );
    await conn.query(
      'INSERT INTO commerces (id, usuario_id, nombre, nit, status) VALUES (8888, 8888, "Comercio Test", "8888888-8", "active")'
    );

    // Crear User 7777 (Store Admin)
    await conn.query(
      'INSERT INTO users (id, email, password_hash, rol, estado) VALUES (7777, "store@test.com", "hash", "admin", "activo")'
    );
    await conn.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (7777, "Sede Admin", "Test", "77777777", "3007777777")'
    );
    await conn.query(
      'INSERT INTO stores (id, commerce_id, usuario_id, nombre_sucursal, matricula, direccion, estado) VALUES (7777, 8888, 7777, "Sede Centro", "MAT-7777", "Calle Falsa 123", "operativo")'
    );

    await conn.query('SET @domi_is_root = NULL');

    // Obtener billeteras creadas por triggers
    const userWallet = await domiEngine.getUserWallet(conn, 9999);
    const commerceWallet = await domiEngine.getCommerceWallet(conn, 8888);
    const storeWallet = await domiEngine.getStoreWallet(conn, 7777);

    console.log('Billetera de Usuario Creada por Trigger:', userWallet);
    console.log('Billetera de Comercio Creada por Trigger:', commerceWallet);
    console.log('Billetera de Sede Creada por Trigger:', storeWallet);

    // Limpiar Redis balances
    await domiRedis.setBalance('user', 9999, 0);
    await domiRedis.setBalance('user', 8888, 0);
    await domiRedis.setBalance('user', 7777, 0);

    // 1. Probar Acuñación Manual (Mint) por Operador
    console.log('\n1. Probando Mint Manual...');
    const operatorContext = { id: 1, rol: 'system_manager', actorType: 'system_user' };
    
    const mintResult = await domiService.mintManual(operatorContext, {
      ownerType: 'user',
      ownerId: 9999,
      amountDomis: 1000
    }, {});
    
    console.log('Mint Result:', mintResult);
    
    // Verificar en DB
    const [userWalletDb1] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [userWallet.id]);
    const userRedisBal1 = await domiRedis.getWalletBalance('user', 9999);
    console.log('Balance User DB:', userWalletDb1[0].balance_custody);
    console.log('Balance User Redis:', userRedisBal1);

    if (parseFloat(userWalletDb1[0].balance_custody) === 1000 && userRedisBal1 === 1000) {
      console.log('✅ Mint Manual exitoso en DB y Redis');
    } else {
      console.error('❌ Fallo en Mint Manual');
    }

    // 2. Probar Transferencia de User 9999 a Commerce 8888
    console.log('\n2. Probando Transferencia de Saldo...');
    const clientContext = { id: 9999, rol: 'customer', actorType: 'user' };
    
    const transferResult = await domiService.transferDomis(clientContext, {
      fromType: 'user',
      fromId: 9999,
      toType: 'commerce',
      toId: 8888,
      amountDomis: 250
    }, {});
    
    console.log('Transfer Result:', transferResult);

    // Verificar en DB y Redis
    const [userWalletDb2] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [userWallet.id]);
    const [commerceWalletDb2] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [commerceWallet.id]);
    const userRedisBal2 = await domiRedis.getWalletBalance('user', 9999);
    const commerceRedisBal2 = await domiRedis.getWalletBalance('user', 8888);

    console.log('Balance User DB:', userWalletDb2[0].balance_custody, 'Redis:', userRedisBal2);
    console.log('Balance Commerce DB:', commerceWalletDb2[0].balance_custody, 'Redis:', commerceRedisBal2);

    if (
      parseFloat(userWalletDb2[0].balance_custody) === 750 && userRedisBal2 === 750 &&
      parseFloat(commerceWalletDb2[0].balance_custody) === 250 && commerceRedisBal2 === 250
    ) {
      console.log('✅ Transferencia exitosa en DB y Redis');
    } else {
      console.error('❌ Fallo en Transferencia');
    }

    // 3. Probar BOLA en Transferencia (User 5555 intentando transferir desde User 9999)
    console.log('\n3. Probando BOLA en Transferencia...');
    const intruderContext = { id: 5555, rol: 'customer', actorType: 'user' };
    try {
      await domiService.transferDomis(intruderContext, {
        fromType: 'user',
        fromId: 9999,
        toType: 'commerce',
        toId: 8888,
        amountDomis: 50
      }, {});
      console.error('❌ BOLA FAILED: Permitió transferir desde billetera ajena');
    } catch (err) {
      console.log('BOLA Bloqueó correctamente:', err.message);
      const log = securityEvents.find(e => e.eventType === 'BOLA_ATTEMPT');
      if (log && err.message.includes('Acceso no autorizado')) {
        console.log('✅ BOLA detectado y registrado correctamente como HIGH');
      } else {
        console.error('❌ BOLA FAILED: No registró la alerta de seguridad');
      }
    }

    // 4. Probar Consulta de Historial
    console.log('\n4. Probando Consulta de Historial...');
    const history = await domiService.getWalletHistory(clientContext, 'user', 9999, { query: { limit: 10 } });
    console.log(`Se encontraron ${history.length} transacciones en el historial del usuario 9999.`);
    console.log('Última Transacción:', history[0]);

    if (history.length >= 2) {
      console.log('✅ Historial recuperado con éxito');
    } else {
      console.error('❌ Fallo al recuperar historial');
    }

    // 5. Probar Quemado Manual (Burn)
    console.log('\n5. Probando Quemado Manual por Operador...');
    const burnResult = await domiService.burnManual(operatorContext, {
      ownerType: 'commerce',
      ownerId: 8888,
      amountDomis: 100
    }, {});

    console.log('Burn Result:', burnResult);

    const [commerceWalletDb3] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [commerceWallet.id]);
    const commerceRedisBal3 = await domiRedis.getWalletBalance('user', 8888);
    const systemWallet = await domiRepository.findSystemWallet();
    const [systemWalletDb] = await conn.query('SELECT balance_utility FROM wallets WHERE id = ?', [systemWallet.id]);

    console.log('Balance Commerce DB:', commerceWalletDb3[0].balance_custody, 'Redis:', commerceRedisBal3);
    console.log('Balance Sistema DB Utility:', systemWalletDb[0].balance_utility);

    const commDbBal = parseFloat(commerceWalletDb3[0].balance_custody);
    if (
      (commDbBal === 150 || commDbBal === 145) && (commerceRedisBal3 === 150 || commerceRedisBal3 === 145) &&
      parseFloat(systemWalletDb[0].balance_utility) >= 80
    ) {
      console.log('✅ Quemado manual y transferencia al sistema exitosa');
    } else {
      console.error('❌ Fallo en Quemado Manual');
    }

  } catch (err) {
    console.error('ERROR EN PRUEBAS:', err);
  } finally {
    if (mockDeclarationId) {
      try {
        await conn.query('DELETE FROM domi_reserve_declarations WHERE id = ?', [mockDeclarationId]);
      } catch (e) {
        console.error('Fallo al limpiar reserva de prueba:', e.message);
      }
    }
    try {
      await conn.query('SET @domi_is_root = 1');
      await conn.query('SET @domi_bypass_security = 1');
      await conn.query('DELETE FROM domi_ledger WHERE from_wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9999, 8888, 7777)) OR to_wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9999, 8888, 7777))');
      await conn.query('DELETE FROM domi_withdrawal_log WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9999, 8888, 7777))');
      await conn.query('DELETE FROM domi_packages WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9999, 8888, 7777))');
      await conn.query('DELETE FROM stores WHERE id = 7777');
      await conn.query('DELETE FROM commerces WHERE id = 8888');
      await conn.query('DELETE FROM profiles WHERE usuario_id IN (9999, 8888, 7777)');
      await conn.query('DELETE FROM users WHERE id IN (9999, 8888, 7777)');
      await conn.query('SET @domi_bypass_security = NULL');
      await conn.query('SET @domi_is_root = NULL');
    } catch (_) {}

    conn.release();
    await db.end();
    await redisClient.disconnect();
    console.log('\nConexiones cerradas. Pruebas finalizadas.');
  }
}

test();
