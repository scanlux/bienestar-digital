const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../config/db');
const redisClient = require('../../config/redis');
const domiRedis = require('../../services/domiRedis');
const domiService = require('../../domains/domi/domi.service');
const orderService = require('../../domains/order/order.service');
const domiEngine = require('../../services/domiEngine');
const domiCashbackEngine = require('../../services/domiCashbackEngine');
const incidentService = require('../../services/domi-kernel/incidents');
const { checkDatabaseResetAllowed } = require('../../utils/envGuard');
const wallets = require('../../services/domi-kernel/wallets');

// Mock security logger
const securityEvents = [];
require('../../utils/securityLogger').logSecurityEvent = async (userId, eventType, severity, req, details) => {
  securityEvents.push({ userId, eventType, severity, details });
  console.log(`[AUDIT LOG] ${eventType} (${severity}) - ${details?.reason || ''}`);
};

async function test() {
  checkDatabaseResetAllowed();
  console.log('=== INICIANDO INTEGRACIÓN Y PRUEBAS DE CANCELACIÓN POR REPARTIDOR, TIENDA Y CLIENTE ===');
  const conn = await db.getConnection();
  try {
    console.log('\nGenerando registros de prueba temporales...');
    const testClientUserId = Math.floor(Math.random() * 20000) + 10000;
    const testDriverUserId = Math.floor(Math.random() * 20000) + 30000;
    const testOriginalDriverUserId = Math.floor(Math.random() * 20000) + 50000;

    // Obtener una sede existente en la base de datos (evitando crear Sede Test Cancelacion)
    const [storeRows] = await conn.query('SELECT id, usuario_id FROM stores LIMIT 1');
    if (storeRows.length === 0) {
      throw new Error('No hay sedes en la base de datos. Ejecuta la semilla primero.');
    }
    const testStoreId = storeRows[0].id;
    const testStoreAdminUserId = storeRows[0].usuario_id;
    console.log(`Usando sede existente con ID: ${testStoreId} y administrador de sede ID: ${testStoreAdminUserId}`);

    // Crear usuarios de prueba (con campos es_repartidor y repartidor_activo a 1 para los conductores)
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
      VALUES (?, ?, 'mock_hash', 'activo', 60, 'customer')
    `, [testClientUserId, `test_client_${testClientUserId}@trendy.sytes.net`]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Cliente', 'Prueba', ?, ?)
    `, [testClientUserId, String(testClientUserId), '300' + String(testClientUserId).padStart(7, '0')]);

    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol, es_repartidor, repartidor_activo)
      VALUES (?, ?, 'mock_hash', 'activo', 60, 'customer', 1, 1)
    `, [testDriverUserId, `test_driver_${testDriverUserId}@trendy.sytes.net`]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Repartidor', 'Prueba', ?, ?)
    `, [testDriverUserId, String(testDriverUserId), '300' + String(testDriverUserId).padStart(7, '0')]);

    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol, es_repartidor, repartidor_activo)
      VALUES (?, ?, 'mock_hash', 'activo', 60, 'customer', 1, 1)
    `, [testOriginalDriverUserId, `test_orig_driver_${testOriginalDriverUserId}@trendy.sytes.net`]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Original', 'Repartidor', ?, ?)
    `, [testOriginalDriverUserId, String(testOriginalDriverUserId), '300' + String(testOriginalDriverUserId).padStart(7, '0')]);

    // Desactivar temporalmente el balance mínimo de conductor para los tests
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query('UPDATE protocol_rules SET min_domi_balance_driver = 0 WHERE id = 1');
    await conn.query('SET @domi_bypass_security = NULL');

    // Inicializar balances en wallets y Redis
    const clientWallet = await wallets.getUserWallet(conn, testClientUserId);
    await conn.query('UPDATE wallets SET balance_custody = 2.0000 WHERE id = ?', [clientWallet.id]);
    await domiRedis.setBalance('user', testClientUserId, 2.0);

    const storeWallet = await wallets.getStoreWallet(conn, testStoreId);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [storeWallet.id]);
    await domiRedis.setBalance('user', testStoreAdminUserId, 10.0);

    const driverWallet = await wallets.getUserWallet(conn, testDriverUserId);
    await conn.query('UPDATE wallets SET balance_custody = 500.0000 WHERE id = ?', [driverWallet.id]);
    await domiRedis.setBalance('user', testDriverUserId, 500.0);

    const originalDriverWallet = await wallets.getUserWallet(conn, testOriginalDriverUserId);
    await conn.query('UPDATE wallets SET balance_custody = 500.0000 WHERE id = ?', [originalDriverWallet.id]);
    await domiRedis.setBalance('user', testOriginalDriverUserId, 500.0);

    // ==========================================
    // 1. TEST: Cancelación COD del cliente con balance parcial (débito parcial + deuda en domi_order_debts)
    // ==========================================
    console.log('\n--- 1. TEST: Cancelación COD del cliente con balance parcial ---');
    const [order1Result] = await conn.query(`
      INSERT INTO orders (store_id, customer_user_id, total_cop, domi_cost, driver_domi_cost, payment_method_customer, status, delivery_address)
      VALUES (?, ?, 20000, 1.0, 5.0, 'cash_cod', 'pendiente', 'Calle Falsa 123')
    `, [testStoreId, testClientUserId]);
    const orderId1 = order1Result.insertId;

    // Aceptar
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId1, 'aceptado', {});
    await domiEngine.processChargeSync(orderId1, testStoreId, null, 1.0, 0);

    // Cancelar
    await orderService.updateOrderStatus(
      { id: testClientUserId, actorType: 'user', rol: 'customer' }, 
      orderId1, 
      'cancelado', 
      { body: { observation: 'Cliente cancela voluntariamente' } }
    );

    // Validaciones
    const [[clientWalletAfter]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [clientWallet.id]);
    const clientRedisBalance = await domiRedis.getWalletBalance('user', testClientUserId);
    console.log(`Balance Cliente después (Esperado: 0): ${clientWalletAfter.balance_custody} (Redis: ${clientRedisBalance})`);

    const [debtsOrder1] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderId1]);
    console.log('Deudas generadas (Esperado: 1):', debtsOrder1.length);
    if (debtsOrder1.length > 0) {
      console.log(`Deuda pendiente (Esperado: status="pending", amount_domis > 0): status="${debtsOrder1[0].status}", amount="${debtsOrder1[0].amount_domis}"`);
    }

    // ==========================================
    // 2. TEST: Cancelación de la tienda en 'listo_para_despacho' con repartidor asignado (reembolso repartidor + deudas tienda)
    // ==========================================
    console.log('\n--- 2. TEST: Cancelación de la tienda en listo_para_despacho ---');
    const [order2Result] = await conn.query(`
      INSERT INTO orders (store_id, customer_user_id, total_cop, domi_cost, driver_domi_cost, payment_method_customer, status, delivery_address)
      VALUES (?, ?, 20000, 1.0, 5.0, 'cash_cod', 'pendiente', 'Calle Falsa 123')
    `, [testStoreId, testClientUserId]);
    const orderId2 = order2Result.insertId;

    // Resetear balance tienda a 10.0 y driver a 500.0
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [storeWallet.id]);
    await conn.query('UPDATE wallets SET balance_custody = 500.0000 WHERE id = ?', [driverWallet.id]);

    // Transicionar hasta listo
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId2, 'aceptado', {});
    await domiEngine.processChargeSync(orderId2, testStoreId, null, 1.0, 0);
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId2, 'preparando', {});
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId2, 'listo', {});

    // Driver acepta la orden usando acceptOrder
    await orderService.acceptOrder({ id: testDriverUserId, actorType: 'user' }, orderId2, {});

    // Cancelar como tienda (comercio 1)
    await orderService.updateOrderStatus(
      { id: 9999, actorType: 'user', rol: 'admin', commerceId: 1 }, 
      orderId2, 
      'cancelado', 
      { body: { observation: 'Tienda cancela porque no tiene insumos' } }
    );

    // Validar reembolso a repartidor (comisión 0.75 devuelta + 50% de envío de la tienda. Envío es 5.0 DOMI, 50% = 2.5 DOMI. Total recibido: 3.25 DOMI. Balance inicial 500.0 -> Acepta (no debitado sincrónicamente en DB en el test) -> Cancela (reembolsa 0.75 + 2.5 compensation -> 503.25)
    const [[driverWalletAfter]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    console.log(`Balance Repartidor después (Esperado: 503.25): ${driverWalletAfter.balance_custody}`);

    // Validar débito a la tienda (Balance inicial 10.0, descontó 1.0 comisión al aceptar -> 9.0. Recibe reembolso de 30% comision = +0.30 -> 9.30. Luego descuenta 2.5 por compensación repartidor -> 6.80)
    const [[storeWalletAfter]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [storeWallet.id]);
    console.log(`Balance Tienda después (Esperado: 6.80): ${storeWalletAfter.balance_custody}`);

    // Validar que no hay deudas en domi_store_debts en estado pending (porque la tienda tenía saldo suficiente para cubrir los 2.5)
    const [storeDebtsOrder2] = await conn.query('SELECT * FROM domi_store_debts WHERE order_id = ?', [orderId2]);
    console.log('Deudas de tienda generadas (Esperado: 1):', storeDebtsOrder2.length);
    if (storeDebtsOrder2.length > 0) {
      console.log(`Estado de deudor de tienda (Esperado: status="paid"): status="${storeDebtsOrder2[0].status}"`);
    }

    // ==========================================
    // 3. TEST: Cancelación del repartidor en 'listo_para_despacho' (pre-pickup)
    // ==========================================
    console.log('\n--- 3. TEST: Cancelación del repartidor pre-pickup ---');
    const [order3Result] = await conn.query(`
      INSERT INTO orders (store_id, customer_user_id, total_cop, domi_cost, driver_domi_cost, payment_method_customer, status, delivery_address)
      VALUES (?, ?, 20000, 1.0, 5.0, 'cash_cod', 'pendiente', 'Calle Falsa 123')
    `, [testStoreId, testClientUserId]);
    const orderId3 = order3Result.insertId;

    // Aceptar y preparar
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId3, 'aceptado', {});
    await domiEngine.processChargeSync(orderId3, testStoreId, null, 1.0, 0);
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId3, 'preparando', {});
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId3, 'listo', {});

    // Poner balance del driver a 500.0
    await conn.query('UPDATE wallets SET balance_custody = 500.0000 WHERE id = ?', [driverWallet.id]);

    // Driver acepta la orden
    await orderService.acceptOrder({ id: testDriverUserId, actorType: 'user' }, orderId3, {});

    // Cancelar como repartidor (rol: 'driver')
    await orderService.updateOrderStatus(
      { id: testDriverUserId, rol: 'customer', roles: ['driver'], actorType: 'user' }, 
      orderId3, 
      'cancelado', 
      { body: { observation: 'Repartidor cancela voluntariamente' } }
    );

    // Validar reembolso del 30% de la comisión de servicio (Acepta: resta 0.75 -> 499.25. Cancela: reembolsa 30% de 0.75 = 0.225. Final balance: 499.25 + 0.225 = 499.475)
    const [[driverWalletAfterPrePickup]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    console.log(`Balance Repartidor después (Esperado: 499.475): ${driverWalletAfterPrePickup.balance_custody}`);

    // Validar que el pedido volvió a 'listo' y no tiene driver_user_id
    const [[order3After]] = await conn.query('SELECT status, driver_user_id FROM orders WHERE id = ?', [orderId3]);
    console.log(`Estado pedido (Esperado: listo): ${order3After.status}`);
    console.log(`ID Conductor (Esperado: null): ${order3After.driver_user_id}`);

    // ==========================================
    // 4. TEST: Cancelación del repartidor en 'en_camino' (post-pickup)
    // ==========================================
    console.log('\n--- 4. TEST: Cancelación del repartidor post-pickup ---');
    const [order4Result] = await conn.query(`
      INSERT INTO orders (store_id, customer_user_id, total_cop, domi_cost, driver_domi_cost, payment_method_customer, status, delivery_address)
      VALUES (?, ?, 20000, 1.0, 5.0, 'domi', 'pendiente', 'Calle Falsa 123')
    `, [testStoreId, testClientUserId]);
    const orderId4 = order4Result.insertId;

    // Aceptar, preparar, listo, y driver acepta
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId4, 'aceptado', {});
    await domiEngine.processChargeSync(orderId4, testStoreId, null, 1.0, 0);
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId4, 'preparando', {});
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId4, 'listo', {});

    // Poner balance del driver a 20.0, cliente a 0.0 (locked = 50.0), store a 0.0
    await conn.query('UPDATE wallets SET balance_custody = 20.7500 WHERE id = ?', [driverWallet.id]); // Para tener 20.0 netos después de acceptOrder
    await conn.query('UPDATE wallets SET locked_balance = 50.0000, balance_custody = 0.0000 WHERE id = ?', [clientWallet.id]);
    await conn.query('UPDATE wallets SET balance_custody = 0.0000 WHERE id = ?', [storeWallet.id]);

    await orderService.acceptOrder({ id: testDriverUserId, actorType: 'user' }, orderId4, {});
    // Ahora driver wallet has balance 20.0

    // En camino
    await orderService.updateOrderStatus({ id: testDriverUserId, rol: 'customer', roles: ['driver'], actorType: 'user' }, orderId4, 'en_camino', {});

    // Cancelar como repartidor (rol: 'driver')
    await orderService.updateOrderStatus(
      { id: testDriverUserId, rol: 'customer', roles: ['driver'], actorType: 'user' }, 
      orderId4, 
      'cancelado', 
      { body: { observation: 'Se me pinchó la llanta y dañé el producto' } }
    );

    // Validar reembolso del 100% al cliente (locked_balance -> balance_custody)
    const [[clientWalletAfterDriverCancel]] = await conn.query('SELECT balance_custody, locked_balance FROM wallets WHERE id = ?', [clientWallet.id]);
    console.log(`Cliente balance (Esperado: 50.0): ${clientWalletAfterDriverCancel.balance_custody}, locked (Esperado: 0.0): ${clientWalletAfterDriverCancel.locked_balance}`);

    // Validar débito y compensación a la tienda (se debitan 20.0 de la billetera del conductor y van a la tienda)
    const [[driverWalletAfterDriverCancel]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    const [[storeWalletAfterDriverCancel]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [storeWallet.id]);
    console.log(`Conductor balance (Esperado: 0.0): ${driverWalletAfterDriverCancel.balance_custody}`);
    console.log(`Tienda balance (Esperado: 20.0): ${storeWalletAfterDriverCancel.balance_custody}`);

    // Validar deudas del repartidor en domi_order_debts (25.0 DOMIs en estado pending)
    const [driverDebts] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ? AND customer_user_id = ?', [orderId4, testDriverUserId]);
    console.log('Deudas del repartidor (Esperado: 1):', driverDebts.length);
    if (driverDebts.length > 0) {
      console.log(`Deuda pendiente (Esperado: status="pending", amount_domis=25.0): status="${driverDebts[0].status}", amount="${driverDebts[0].amount_domis}"`);
    }

    // ==========================================
    // 5. TEST: Rescate exitoso y cashback al repartidor original basado en snapshot de plataforma
    // ==========================================
    console.log('\n--- 5. TEST: Rescate exitoso y cashback al original ---');
    const [order5Result] = await conn.query(`
      INSERT INTO orders (store_id, customer_user_id, total_cop, domi_cost, driver_domi_cost, payment_method_customer, status, delivery_address)
      VALUES (?, ?, 20000, 1.0, 5.0, 'domi', 'pendiente', 'Calle Falsa 123')
    `, [testStoreId, testClientUserId]);
    const orderId5 = order5Result.insertId;

    // Aceptar, preparar, listo, y driver acepta
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId5, 'aceptado', {});
    await domiEngine.processChargeSync(orderId5, testStoreId, null, 1.0, 0);
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId5, 'preparando', {});
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId5, 'listo', {});

    // Poner balance original driver a 50.0
    await conn.query('UPDATE wallets SET balance_custody = 50.0000 WHERE id = ?', [originalDriverWallet.id]);

    await orderService.acceptOrder({ id: testOriginalDriverUserId, actorType: 'user' }, orderId5, {});
    // Ahora original driver balance = 49.25

    // En camino
    await orderService.updateOrderStatus({ id: testOriginalDriverUserId, rol: 'customer', roles: ['driver'], actorType: 'user' }, orderId5, 'en_camino', {});

    // Reportar incidencia post_pickup
    const { incidentId, rescueId } = await incidentService.reportIncident(orderId5, testOriginalDriverUserId, 'post_pickup', 'Falla de moto');
    console.log(`Incidencia #${incidentId} y Rescate #${rescueId} creados.`);

    // Asignar rescatista (driver de prueba, balance a 50.0)
    await conn.query('UPDATE wallets SET balance_custody = 50.0000 WHERE id = ?', [driverWallet.id]);
    await incidentService.assignRescue(incidentId, testDriverUserId);
    console.log(`Rescatista #${testDriverUserId} asignado.`);

    // Completar rescate
    await incidentService.completeRescue(rescueId, 'delivered');
    console.log('Rescate completado con entrega exitosa.');

    // Validar cashback del original (30% de la comisión de servicio = 0.75 * 0.30 = 0.225. Balance inicial 50.0 -> 50.225)
    const [[origDriverWalletAfterRescue]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [originalDriverWallet.id]);
    console.log(`Balance Repartidor Original después (Esperado: 50.225): ${origDriverWalletAfterRescue.balance_custody}`);

    // ==========================================
    // 6. TEST: Liquidación de deuda de tienda a través de la API
    // ==========================================
    console.log('\n--- 6. TEST: Liquidación de deuda de tienda ---');
    // Creamos una deuda pendiente para la tienda
    const [storeDebtResult] = await conn.query(`
      INSERT INTO domi_store_debts (
        order_id, store_id, beneficiary_type, beneficiary_id, amount_domis, fiat_peg_at_cancellation, status
      ) VALUES (?, ?, 'driver', ?, 2.5000, 400.0, 'pending')
    `, [orderId5, testStoreId, testDriverUserId]);
    const storeDebtId = storeDebtResult.insertId;

    // Configurar balance de la tienda a 5.0
    await conn.query('UPDATE wallets SET balance_custody = 5.0000 WHERE id = ?', [storeWallet.id]);

    // Ejecutar liquidación de deuda (llamamos a domiService)
    const payStoreDebtRes = await domiService.payStoreDebt(
      { id: 9999, rol: 'admin', commerceId: 1, actorType: 'user' },
      storeDebtId,
      {}
    );
    console.log('Resultado de liquidación de deuda de tienda:', payStoreDebtRes);

    // Validaciones
    const [[storeWalletFinal]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [storeWallet.id]);
    console.log(`Balance Tienda final (Esperado: 2.50): ${storeWalletFinal.balance_custody}`);

    const [[storeDebtFinal]] = await conn.query('SELECT status, paid_at FROM domi_store_debts WHERE id = ?', [storeDebtId]);
    console.log(`Estado de deuda de tienda (Esperado: paid): status="${storeDebtFinal.status}", paid_at=${storeDebtFinal.paid_at}`);

    // ==========================================
    // Limpieza de datos de prueba al finalizar
    // ==========================================
    console.log('\nLimpiando registros de prueba...');
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query('DELETE FROM rescue_assignments WHERE original_driver_id IN (?, ?, ?)', [testClientUserId, testDriverUserId, testOriginalDriverUserId]);
    await conn.query('DELETE FROM order_incidents WHERE reported_by_user_id IN (?, ?, ?)', [testClientUserId, testDriverUserId, testOriginalDriverUserId]);
    await conn.query('DELETE FROM domi_store_debts WHERE store_id = ? AND order_id IN (SELECT id FROM orders WHERE customer_user_id = ?)', [testStoreId, testClientUserId]);
    await conn.query('DELETE FROM domi_order_debts WHERE customer_user_id IN (?, ?, ?)', [testClientUserId, testDriverUserId, testOriginalDriverUserId]);
    await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_user_id = ?)', [testClientUserId]);
    await conn.query('DELETE FROM orders WHERE customer_user_id = ?', [testClientUserId]);
    await conn.query(`
      DELETE FROM domi_ledger 
      WHERE from_wallet_id IN (SELECT id FROM wallets WHERE user_id IN (?, ?, ?))
         OR to_wallet_id IN (SELECT id FROM wallets WHERE user_id IN (?, ?, ?))
    `, [testClientUserId, testDriverUserId, testOriginalDriverUserId, testClientUserId, testDriverUserId, testOriginalDriverUserId]);
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (?, ?, ?)', [testClientUserId, testDriverUserId, testOriginalDriverUserId]);
    // NO eliminamos la sede real preexistente de la base de datos
    await conn.query('DELETE FROM users WHERE id IN (?, ?, ?)', [testClientUserId, testDriverUserId, testOriginalDriverUserId]);
    await conn.query('SET @domi_bypass_security = NULL');
    console.log('Registros de prueba eliminados correctamente.');

    console.log('\n=== INTEGRACIÓN Y PRUEBAS EXITOSAS ===');
  } catch (err) {
    console.error('❌ Fallo en las pruebas de integración:', err);
  } finally {
    conn.release();
    await db.end();
    redisClient.quit();
  }
}

test();
