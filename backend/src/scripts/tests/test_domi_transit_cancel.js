const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../config/db');
const redisClient = require('../../config/redis');
const domiRedis = require('../../services/domiRedis');
const orderService = require('../../domains/order/order.service');
const domiService = require('../../domains/domi/domi.service');
const domiEngine = require('../../services/domiEngine');
const { checkDatabaseResetAllowed } = require('../../utils/envGuard');
const wallets = require('../../services/domi-kernel/wallets');

// Mock security logger
const securityEvents = [];
require('../../utils/securityLogger').logSecurityEvent = async (userId, eventType, severity, req, details) => {
  securityEvents.push({ userId, eventType, severity, details });
  console.log(`[AUDIT LOG] ${eventType} (${severity}) - ${JSON.stringify(details)}`);
};

async function runTest() {
  checkDatabaseResetAllowed();
  console.log('=== INICIANDO PRUEBA DE INTEGRACION: CANCELACION EN en_camino DOMI ===');
  const conn = await db.getConnection();
  
  console.log('\nGenerando registros de prueba temporales...');
  const testClientUserId = Math.floor(Math.random() * 20000) + 10000;
  const testDriverUserId = Math.floor(Math.random() * 20000) + 30000;
  const testStoreId = 1; // Sede Chapinero M
  const testProductId = Math.floor(Math.random() * 20000) + 80000;

  try {
    // 1. SETUP: Crear Fixtures
    console.log('\n--- PASO 1: Creando fixtures (usuarios, perfiles y producto) ---');
    
    // Cliente
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
      VALUES (?, ?, 'mock_hash', 'activo', 60, 'customer')
    `, [testClientUserId, `test_client_${testClientUserId}@trendy.sytes.net`]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Cliente', 'Prueba DOMI', ?, ?)
    `, [testClientUserId, String(testClientUserId), '300' + String(testClientUserId).padStart(7, '0')]);

    // Repartidor
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol, es_repartidor, repartidor_activo)
      VALUES (?, ?, 'mock_hash', 'activo', 60, 'customer', 1, 1)
    `, [testDriverUserId, `test_driver_${testDriverUserId}@trendy.sytes.net`]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Repartidor', 'Prueba DOMI', ?, ?)
    `, [testDriverUserId, String(testDriverUserId), '300' + String(testDriverUserId).padStart(7, '0')]);

    // Producto de prueba asociado a Sede Chapinero M
    await conn.query(`
      INSERT INTO products (id, store_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano)
      VALUES (?, ?, ?, 'Preparado fresco para pruebas de integracion.', 25000, 10, 1, 0)
    `, [testProductId, testStoreId, 'Producto Fixture Chapinero DOMI ' + testProductId]);

    // Desactivar balance mínimo de conductor para el test
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query('UPDATE protocol_rules SET min_domi_balance_driver = 0 WHERE id = 1');
    await conn.query('SET @domi_bypass_security = NULL');

    // 2. SETUP: Configurar Billeteras y Saldos iniciales
    console.log('\n--- PASO 2: Inicializando wallets y saldos ---');
    
    // Wallet del cliente: 100 DOMIs exactos
    const clientWallet = await wallets.getUserWallet(conn, testClientUserId);
    await conn.query('UPDATE wallets SET balance_custody = 100.0000 WHERE id = ?', [clientWallet.id]);
    await domiRedis.setBalance('user', testClientUserId, 100.0);

    // Wallet del repartidor: 10.0 DOMIs
    const driverWallet = await wallets.getUserWallet(conn, testDriverUserId);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [driverWallet.id]);
    await domiRedis.setBalance('user', testDriverUserId, 10.0);

    // Billetera de la sede Chapinero M: 10.0 DOMIs
    const storeWallet = await wallets.getStoreWallet(conn, testStoreId);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [storeWallet.id]);
    await domiRedis.setBalance('store', testStoreId, 10.0);

    // Billetera del sistema
    const systemWallet = await wallets.getSystemWallet(conn);
    await conn.query('UPDATE wallets SET balance_utility = 10.0000, balance_custody = 10.0000 WHERE id = ?', [systemWallet.id]);

    const token = await domiEngine.getTokenRegistry(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);
    console.log(`Peg del Token DOMI: 1 DOMI = ${fiatPeg} COP`);

    // 3. CREACION DEL PEDIDO
    console.log('\n--- PASO 3: Creando pedido domi por 25,000 COP con distancia = 5 km ---');
    const orderData = {
      store_id: testStoreId,
      customer_user_id: testClientUserId,
      total_cop: 25000,
      payment_method_customer: 'domi',
      delivery_address: 'Calle Falsa 123',
      distance_km: 5,
      items: [{ product_id: testProductId, quantity: 1, price: 25000 }]
    };
    const userSimulated = { id: testClientUserId, rol: 'customer', actorType: 'user' };
    const reqSimulated = { ip: '127.0.0.1', headers: { 'user-agent': 'Cancel-Test-Agent' } };

    const createRes = await orderService.createOrder(userSimulated, orderData, reqSimulated);
    const orderId = createRes.id;
    console.log(`Pedido creado exitosamente con ID: ${orderId}, estado inicial: ${createRes.status}`);

    const [[orderCreated]] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    console.log('Pedido insertado en DB:', {
      id: orderCreated.id,
      distance_km: orderCreated.distance_km,
      driver_domi_cost: orderCreated.driver_domi_cost, // 9.75 DOMI
      driver_cost_domi_snapshot: orderCreated.driver_cost_domi_snapshot // 0.75 DOMI
    });

    const driverDomiCost = parseFloat(orderCreated.driver_domi_cost);
    const productsDomiCost = 62.5 - driverDomiCost;

    // 4. FLUJO: Sede Acepta Pedido
    if (createRes.status === 'pendiente') {
      console.log('\n--- PASO 4: Sede acepta el pedido (cobro de comisión 1.0 DOMI) ---');
      const storeUserSim = { id: 2, rol: 'store', commerceId: 1, actorType: 'user' };
      await orderService.updateOrderStatus(storeUserSim, orderId, 'aceptado', reqSimulated);
    }
    await domiEngine.processChargeSync(orderId, testStoreId, null, createRes.costDetails.store_cost_domis, 0);

    // 5. FLUJO: Repartidor Acepta Pedido
    console.log('\n--- PASO 5: Repartidor acepta el pedido (cobro de comisión 0.75 DOMI) ---');
    const driverUserSim = { id: testDriverUserId, rol: 'customer', actorType: 'user' };
    await orderService.acceptOrder(driverUserSim, orderId, reqSimulated);
    await domiEngine.processChargeSync(orderId, testStoreId, testDriverUserId, 0, createRes.costDetails.driver_cost_domis);

    // 6. FLUJO: Conductor inicia tránsito (en_camino)
    console.log('\n--- PASO 5b: Conductor inicia la entrega (en_camino) ---');
    await orderService.updateOrderStatus(
      { id: testDriverUserId, rol: 'driver', actorType: 'user' },
      orderId,
      'en_camino',
      reqSimulated
    );

    // 7. FLUJO: Cancelación por el cliente en camino
    console.log('\n--- PASO 6: Cliente cancela el pedido en estado en_camino (DOMI) ---');
    await orderService.updateOrderStatus(
      { id: testClientUserId, rol: 'customer', actorType: 'user' },
      orderId,
      'cancelado',
      { body: { observation: 'Cliente cancela a mitad de camino' } }
    );

    // 8. VERIFICAR IMPACTOS
    console.log('\n--- PASO 7: Validando impacto del reembolso de cancelación DOMI en tránsito ---');
    const [[storeBalAfterCancel]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [storeWallet.id]);
    const [[driverBalAfterCancel]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    const [[clientBalAfterCancel]] = await conn.query('SELECT balance_custody, locked_balance FROM wallets WHERE id = ?', [clientWallet.id]);
    const [[sysBalAfterCancel]] = await conn.query('SELECT balance_utility, balance_custody FROM wallets WHERE id = ?', [systemWallet.id]);
    const [[clientUser]] = await conn.query('SELECT domi_score FROM users WHERE id = ?', [testClientUserId]);

    console.log('Balances tras cancelación DOMI en tránsito:');
    console.log(' - Cliente balance_custody (esperado 37.5):', clientBalAfterCancel.balance_custody);
    console.log(' - Cliente locked_balance (esperado 0.0):', clientBalAfterCancel.locked_balance);
    console.log(' - Cliente Score (esperado 56, bajó de 60 por -4 puntos):', clientUser.domi_score);
    console.log(' - Sede balance_custody:', storeBalAfterCancel.balance_custody);
    console.log(' - Repartidor balance_custody:', driverBalAfterCancel.balance_custody);
    console.log(' - Sistema balance_utility (esperado sin reembolsos comisiones):', sysBalAfterCancel.balance_utility);
    console.log(' - Sistema balance_custody:', sysBalAfterCancel.balance_custody);

    // Verificaciones matemáticas
    if (parseFloat(clientBalAfterCancel.locked_balance) !== 0) {
      throw new Error(`Error: Cliente locked_balance esperado 0, obtenido ${clientBalAfterCancel.locked_balance}`);
    }
    if (clientUser.domi_score !== 56) {
      throw new Error(`Error: Score de cliente esperado 56, obtenido ${clientUser.domi_score}`);
    }

    // El cliente inicialmente pagó 62.5 DOMIs (bloqueados).
    // Custody inicial cliente = 100.0.
    // Al crear se descontó 62.5 (quedó 37.5).
    // En ruta el cliente no recibe ningún reembolso de envío.
    // Custody final cliente = 37.5 DOMI.
    const expectedClientCustody = 37.5;
    const actualClientCustody = parseFloat(clientBalAfterCancel.balance_custody);
    if (Math.abs(actualClientCustody - expectedClientCustody) > 0.0001) {
      throw new Error(`Error: Wallet cliente custody esperada ${expectedClientCustody}, obtenida ${actualClientCustody}`);
    }

    // Repartidor inicial = 10.0. Al aceptar pagó 0.75 comisión (quedó 9.25).
    // En ruta recibe 99.6% netos de la tarifa de envío (9.75 * 0.996 = 9.711 DOMI).
    // Conductor custody final = 9.25 + 9.711 = 18.961 DOMI.
    const expectedDriverCustody = 18.961;
    const actualDriverCustody = parseFloat(driverBalAfterCancel.balance_custody);
    if (Math.abs(actualDriverCustody - expectedDriverCustody) > 0.0001) {
      throw new Error(`Error: Wallet repartidor custody esperada ${expectedDriverCustody}, obtenida ${actualDriverCustody}`);
    }

    // Sede inicial = 10.0. Al aceptar pagó 1.0 comisión (quedó 9.0).
    // Sede recibe 100% de productos = 52.75 DOMI.
    // Sede custody final = 9.0 + 52.75 = 61.75 DOMI.
    const expectedStoreCustody = 61.75;
    const actualStoreCustody = parseFloat(storeBalAfterCancel.balance_custody);
    if (Math.abs(actualStoreCustody - expectedStoreCustody) > 0.0001) {
      throw new Error(`Error: Wallet sede custody esperada ${expectedStoreCustody}, obtenida ${actualStoreCustody}`);
    }

    // Sistema custody inicial = 10.0.
    // Recibe el 0.4% de tasa unificada de procesamiento del envío = 9.75 * 0.004 = 0.039 DOMI.
    // Sistema custody final = 10.0 + 0.039 = 10.039 DOMI.
    const expectedSysCustody = 10.039;
    const actualSysCustody = parseFloat(sysBalAfterCancel.balance_custody);
    if (Math.abs(actualSysCustody - expectedSysCustody) > 0.0001) {
      throw new Error(`Error: Wallet sistema custody esperada ${expectedSysCustody}, obtenida ${actualSysCustody}`);
    }

    // Verificar que no se crearon deudas
    const [debts] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderId]);
    if (debts.length !== 0) {
      throw new Error(`Error: No deberían existir deudas para cancelaciones DOMI, encontradas ${debts.length}`);
    }

    console.log('\n=== TEST DE CANCELACIÓN DOMI EN en_camino EXITOSO ===');
  } catch (error) {
    console.error('Error durante la prueba de integración en_camino DOMI:', error);
    process.exit(1);
  } finally {
    // Limpiar registros de prueba temporales
    console.log('\nLimpiando fixtures de prueba...');
    await conn.query('DELETE FROM order_items WHERE order_id = (SELECT id FROM orders WHERE customer_user_id = ?)', [testClientUserId]);
    await conn.query('DELETE FROM orders WHERE customer_user_id = ?', [testClientUserId]);
    await conn.query('DELETE FROM products WHERE id = ?', [testProductId]);
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (?, ?)', [testClientUserId, testDriverUserId]);
    await conn.query('DELETE FROM wallets WHERE user_id IN (?, ?)', [testClientUserId, testDriverUserId]);
    await conn.query('DELETE FROM users WHERE id IN (?, ?)', [testClientUserId, testDriverUserId]);
    
    // Restaurar min_domi_balance_driver
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query('UPDATE protocol_rules SET min_domi_balance_driver = 600.00000000 WHERE id = 1');
    await conn.query('SET @domi_bypass_security = NULL');

    conn.release();
    await db.end();
  }
}

runTest();
