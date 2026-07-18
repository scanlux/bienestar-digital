require('dotenv').config();
const db = require('../../config/db');
const securityLogger = require('../../utils/securityLogger');
const { checkDatabaseResetAllowed } = require('../../utils/envGuard');

// Interceptar y almacenar logs de auditoría para su validación en el test
let securityEvents = [];
securityLogger.logSecurityEvent = async (userId, eventType, severity, req, details) => {
  securityEvents.push({ userId, eventType, severity, details });
  console.log(`[AUDIT LOG] ${eventType} (${severity}) - ${details?.reason || details?.error || ''}`);
};

const domiService = require('../../domains/domi/domi.service');

async function runBolaTests() {
  checkDatabaseResetAllowed();
  console.log('=== INICIANDO PRUEBAS DE REGRESIÓN DE SEGURIDAD (BOLA) DE WALLET ===');
  const conn = await db.getConnection();

  try {
    // 1. Configuración de datos de prueba en un estado aislado
    await conn.query('SET @domi_is_root = 1');
    
    // Limpieza previa
    await conn.query('DELETE FROM domi_withdrawal_log WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9001, 9002, 9003))');
    await conn.query('DELETE FROM domi_packages WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9001, 9002, 9003))');
    await conn.query('DELETE FROM stores WHERE id IN (9001, 9002)');
    await conn.query('DELETE FROM commerces WHERE id IN (9001, 9002)');
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (9001, 9002, 9003)');
    await conn.query('DELETE FROM users WHERE id IN (9001, 9002, 9003)');

    // Crear Comercio 9001 y su Sede 9001, administrada por User 9001
    await conn.query('INSERT INTO users (id, email, password_hash, rol, estado) VALUES (9001, "admin1@test.com", "hash", "admin", "activo")');
    await conn.query('INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (9001, "Admin Sede 1", "Test", "1111", "3001111111")');
    await conn.query('INSERT INTO commerces (id, Nit, nombre, usuario_id, status) VALUES (9001, "9001-1", "Comercio 1", 9001, "active")');
    await conn.query('INSERT INTO stores (id, commerce_id, usuario_id, nombre_sucursal, matricula, direccion, estado) VALUES (9001, 9001, 9001, "Sede 1", "MAT-9001", "Calle 1", "operativo")');

    // Crear Comercio 9002 y su Sede 9002, administrada por User 9002
    await conn.query('INSERT INTO users (id, email, password_hash, rol, estado) VALUES (9002, "admin2@test.com", "hash", "admin", "activo")');
    await conn.query('INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (9002, "Admin Sede 2", "Test", "2222", "3002222222")');
    await conn.query('INSERT INTO commerces (id, Nit, nombre, usuario_id, status) VALUES (9002, "9002-2", "Comercio 2", 9002, "active")');
    await conn.query('INSERT INTO stores (id, commerce_id, usuario_id, nombre_sucursal, matricula, direccion, estado) VALUES (9002, 9002, 9002, "Sede 2", "MAT-9002", "Calle 2", "operativo")');

    // Crear un usuario cliente normal 9003
    await conn.query('INSERT INTO users (id, email, password_hash, rol, estado) VALUES (9003, "client@test.com", "hash", "customer", "activo")');
    await conn.query('INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (9003, "Cliente Normal", "Test", "3333", "3003333333")');

    await conn.query('SET @domi_is_root = NULL');

    // Contextos de usuario para simulación de llamadas (req.user)
    const contextUser1 = { id: 9001, email: "admin1@test.com", rol: "admin", actorType: "user", storeIds: [9001], commerceId: 9001 };
    const contextUser2 = { id: 9002, email: "admin2@test.com", rol: "admin", actorType: "user", storeIds: [9002], commerceId: 9002 };
    const contextClient = { id: 9003, email: "client@test.com", rol: "customer", actorType: "user", storeIds: [] };

    // Request mock
    const mockReq = { ip: '127.0.0.1', headers: { 'user-agent': 'BolaTestAgent' } };

    console.log('\n--- Test 1: Consultar saldo de billetera ajena (BOLA) ---');
    try {
      await domiService.getWalletHistory(contextUser1, 'store', 9002, mockReq);
      throw new Error('FALLA: Se permitió ver el historial de billetera ajena.');
    } catch (err) {
      if (err.name === 'ForbiddenError') {
        console.log('✔ ÉXITO: Acceso denegado correctamente al consultar historial ajeno.');
      } else {
        throw err;
      }
    }

    console.log('\n--- Test 2: Intentar crear sesión checkout Wompi para otra sede (BOLA) ---');
    try {
      await domiService.createCheckoutSession(contextUser1, {
        amountDomis: 10,
        ownerType: 'store',
        ownerId: 9002
      }, mockReq);
      throw new Error('FALLA: Se permitió crear sesión checkout en billetera ajena.');
    } catch (err) {
      if (err.name === 'ForbiddenError') {
        console.log('✔ ÉXITO: Acceso denegado al iniciar checkout ajeno.');
      } else {
        throw err;
      }
    }

    console.log('\n--- Test 3: Intentar crear alias Bre-b en billetera de comercio ajeno (BOLA) ---');
    try {
      await domiService.createWalletAlias(contextUser2, 'commerce', 9001, 'aliasinvalido', mockReq);
      throw new Error('FALLA: Se permitió crear un alias para otro comercio.');
    } catch (err) {
      if (err.name === 'ForbiddenError') {
        console.log('✔ ÉXITO: Acceso denegado al crear alias en comercio ajeno.');
      } else {
        throw err;
      }
    }

    console.log('\n--- Test 4: Cliente normal intenta consultar billetera de sede (BOLA) ---');
    try {
      await domiService.getWalletHistory(contextClient, 'store', 9001, mockReq);
      throw new Error('FALLA: Un cliente normal pudo acceder a la billetera de una sede.');
    } catch (err) {
      if (err.name === 'ForbiddenError') {
        console.log('✔ ÉXITO: Cliente normal bloqueado de acceder a billetera de sede.');
      } else {
        throw err;
      }
    }

    console.log('\n--- Test 5: Cliente normal intenta iniciar checkout para billetera de sede (BOLA) ---');
    try {
      await domiService.createCheckoutSession(contextClient, {
        amountDomis: 15,
        ownerType: 'store',
        ownerId: 9001
      }, mockReq);
      throw new Error('FALLA: Un cliente normal pudo iniciar checkout para una sede.');
    } catch (err) {
      if (err.name === 'ForbiddenError') {
        console.log('✔ ÉXITO: Cliente normal bloqueado de iniciar checkout para sede.');
      } else {
        throw err;
      }
    }

    // Validar logs de auditoría recolectados
    console.log('\n--- Validando logs de auditoría (BOLA_ATTEMPT) ---');
    const bolaAttempts = securityEvents.filter(e => e.eventType === 'BOLA_ATTEMPT');
    if (bolaAttempts.length === 5) {
      console.log(`✔ ÉXITO: Se registraron de forma correcta los 5 eventos de BOLA_ATTEMPT en la bitácora.`);
    } else {
      console.error(`FALLA: Se esperaban 5 logs de BOLA_ATTEMPT pero se registraron ${bolaAttempts.length}`);
      process.exit(1);
    }

    console.log('\n======================================================');
    console.log('✔ TODAS LAS PRUEBAS DE SEGURIDAD (BOLA) PASARON CON ÉXITO');
    console.log('======================================================');

  } catch (error) {
    console.error('Error durante la ejecución del test BOLA:', error);
    process.exit(1);
  } finally {
    // Limpieza de datos de prueba
    await conn.query('SET @domi_is_root = 1');
    await conn.query('DELETE FROM domi_withdrawal_log WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9001, 9002, 9003))');
    await conn.query('DELETE FROM domi_packages WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (9001, 9002, 9003))');
    await conn.query('DELETE FROM stores WHERE id IN (9001, 9002)');
    await conn.query('DELETE FROM commerces WHERE id IN (9001, 9002)');
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (9001, 9002, 9003)');
    await conn.query('DELETE FROM users WHERE id IN (9001, 9002, 9003)');
    await conn.query('SET @domi_is_root = NULL');
    conn.release();
  }
}

runBolaTests().then(() => process.exit(0));
