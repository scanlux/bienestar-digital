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
  console.log('=== INICIANDO PRUEBA DE INTEGRACION: CANCELACION EN listo_despacho COD ===');
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
      VALUES (?, 'Cliente', 'Prueba COD', ?, ?)
    `, [testClientUserId, String(testClientUserId), '300' + String(testClientUserId).padStart(7, '0')]);

    // Repartidor
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol, es_repartidor, repartidor_activo)
      VALUES (?, ?, 'mock_hash', 'activo', 60, 'customer', 1, 1)
    `, [testDriverUserId, `test_driver_${testDriverUserId}@trendy.sytes.net`]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Repartidor', 'Prueba COD', ?, ?)
    `, [testDriverUserId, String(testDriverUserId), '300' + String(testDriverUserId).padStart(7, '0')]);

    // Producto de prueba asociado a Sede Chapinero M
    await conn.query(`
      INSERT INTO products (id, store_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano)
      VALUES (?, ?, ?, 'Preparado fresco para pruebas de integracion.', 25000, 10, 1, 0)
    `, [testProductId, testStoreId, 'Producto Fixture Chapinero ' + testProductId]);

    // Desactivar balance mínimo de conductor para el test
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query('UPDATE protocol_rules SET min_domi_balance_driver = 0 WHERE id = 1');
    await conn.query('SET @domi_bypass_security = NULL');

    // 2. SETUP: Configurar Billeteras y Saldos iniciales
    console.log('\n--- PASO 2: Inicializando wallets y saldos ---');
    
    // Wallet del cliente: 15 DOMIs exactos (insuficiente para cubrir la multa de cancelación completa)
    const clientWallet = await wallets.getUserWallet(conn, testClientUserId);
    await conn.query('UPDATE wallets SET balance_custody = 15.0000 WHERE id = ?', [clientWallet.id]);
    await domiRedis.setBalance('user', testClientUserId, 15.0);

    // Wallet del repartidor: 2.0 DOMIs
    const driverWallet = await wallets.getUserWallet(conn, testDriverUserId);
    await conn.query('UPDATE wallets SET balance_custody = 2.0000 WHERE id = ?', [driverWallet.id]);
    await domiRedis.setBalance('user', testDriverUserId, 2.0);

    // Billetera de la sede Chapinero M
    const storeWallet = await wallets.getStoreWallet(conn, testStoreId);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [storeWallet.id]);
    await domiRedis.setBalance('store', testStoreId, 10.0);

    // Billetera del sistema
    const systemWallet = await wallets.getSystemWallet(conn);
    await conn.query('UPDATE wallets SET balance_utility = 10.0000 WHERE id = ?', [systemWallet.id]);
    const [[sysInitial]] = await conn.query('SELECT balance_utility, balance_custody FROM wallets WHERE id = ?', [systemWallet.id]);
    console.log(`Balance inicial del Sistema - Utility: ${sysInitial.balance_utility}, Custody: ${sysInitial.balance_custody}`);

    const token = await domiEngine.getTokenRegistry(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);
    console.log(`Peg del Token DOMI: 1 DOMI = ${fiatPeg} COP`);

    // 3. CREACION DEL PEDIDO
    console.log('\n--- PASO 3: Creando pedido cash_cod por 25,000 COP con distancia = 5 km ---');
    const orderData = {
      store_id: testStoreId,
      customer_user_id: testClientUserId,
      total_cop: 25000,
      payment_method_customer: 'cash_cod',
      delivery_address: 'Calle Falsa 123',
      distance_km: 5,
      items: [{ product_id: testProductId, quantity: 1, price: 25000 }]
    };
    const userSimulated = { id: testClientUserId, rol: 'customer', actorType: 'user' };
    const reqSimulated = { ip: '127.0.0.1', headers: { 'user-agent': 'Cancel-Test-Agent' } };

    const createRes = await orderService.createOrder(userSimulated, orderData, reqSimulated);
    const orderId = createRes.id;
    console.log(`Pedido creado exitosamente con ID: ${orderId}, estado inicial: ${createRes.status}`);

    // Verificar que se guardó la distancia y los precios correctos
    const [[orderCreated]] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    console.log('Pedido insertado en DB:', {
      id: orderCreated.id,
      distance_km: orderCreated.distance_km,
      driver_domi_cost: orderCreated.driver_domi_cost, // Debería ser 9.75 DOMI ($3900 COP / 400)
      driver_cost_domi_snapshot: orderCreated.driver_cost_domi_snapshot // Debería ser 0.75 DOMI ($300 COP / 400)
    });

    if (parseFloat(orderCreated.distance_km) !== 5) {
      throw new Error(`Error: distancia esperada 5, obtenida ${orderCreated.distance_km}`);
    }
    if (parseFloat(orderCreated.driver_domi_cost) !== 9.75) {
      throw new Error(`Error: tarifa cliente esperada 9.75, obtenida ${orderCreated.driver_domi_cost}`);
    }
    if (parseFloat(orderCreated.driver_cost_domi_snapshot) !== 0.75) {
      throw new Error(`Error: comisión plataforma esperada 0.75, obtenida ${orderCreated.driver_cost_domi_snapshot}`);
    }

    // 4. FLUJO: Sede Acepta Pedido (si no está auto-aceptado)
    if (createRes.status === 'pendiente') {
      console.log('\n--- PASO 4: Sede acepta el pedido (cobro de comisión 1.0 DOMI) ---');
      const storeUserSim = { id: 2, rol: 'store', commerceId: 1, actorType: 'user' }; // Sede Chapinero M
      await orderService.updateOrderStatus(storeUserSim, orderId, 'aceptado', reqSimulated);
    }

    // Cobrar la comisión de la tienda de forma síncrona para el test
    console.log('Aplicando cobro sincrónico de comisión de tienda:', createRes.costDetails.store_cost_domis);
    await domiEngine.processChargeSync(orderId, testStoreId, null, createRes.costDetails.store_cost_domis, 0);

    // 5. FLUJO: Repartidor Acepta Pedido
    console.log('\n--- PASO 5: Repartidor acepta el pedido (cobro de comisión 0.75 DOMI) ---');
    const driverUserSim = { id: testDriverUserId, rol: 'customer', actorType: 'user' };
    await orderService.acceptOrder(driverUserSim, orderId, reqSimulated);

    // Cobrar la comisión del repartidor de forma síncrona para el test
    console.log('Aplicando cobro sincrónico de comisión del repartidor:', createRes.costDetails.driver_cost_domis);
    await domiEngine.processChargeSync(orderId, testStoreId, testDriverUserId, 0, createRes.costDetails.driver_cost_domis);

    // Simular un cambio en las tasas globales del protocolo antes de cancelar.
    // Esto verifica que el sistema use las tasas snapshot guardadas en el pedido, no las reglas actuales de la DB.
    console.log('\n--- PASO 5c: Cambiando tasas globales de anticipo en protocol_rules (Simulación de cambio de regla) ---');
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query(`
      UPDATE protocol_rules 
      SET customer_cancel_store_commission_refund_dispatch_rate = 0.20,
          customer_cancel_driver_commission_refund_dispatch_rate = 0.20
      WHERE id = 1
    `);
    await conn.query('SET @domi_bypass_security = NULL');

    // 6. FLUJO: Cancelación por el cliente en listo_despacho
    console.log('\n--- PASO 6: Cliente cancela el pedido en estado listo_despacho (COD) ---');
    await orderService.updateOrderStatus(
      { id: testClientUserId, rol: 'customer', actorType: 'user' },
      orderId,
      'cancelado',
      { body: { observation: 'Me arrepentí de comprar' } }
    );


    // 7. VERIFICAR ANTICIPOS E IMPACTOS
    console.log('\n--- PASO 7: Validando impacto del reembolso y anticipos inmediatos ---');
    const [[storeBalAfterCancel]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [storeWallet.id]);
    const [[driverBalAfterCancel]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    const [[clientBalAfterCancel]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [clientWallet.id]);
    const [[sysBalAfterCancel]] = await conn.query('SELECT balance_utility, balance_custody FROM wallets WHERE id = ?', [systemWallet.id]);
    const [[clientUser]] = await conn.query('SELECT domi_score FROM users WHERE id = ?', [testClientUserId]);

    console.log('Balances tras cancelación:');
    console.log(' - Cliente balance_custody (esperado 0.0):', clientBalAfterCancel.balance_custody);
    console.log(' - Cliente Score (esperado 10, bajó de 60 por -50 puntos):', clientUser.domi_score);
    console.log(' - Actual Sede Custody:', storeBalAfterCancel.balance_custody);
    console.log(' - Actual Repartidor Custody:', driverBalAfterCancel.balance_custody);
    console.log(' - Sistema balance_utility:', sysBalAfterCancel.balance_utility);

    // Validar anticipos recibidos
    if (parseFloat(clientBalAfterCancel.balance_custody) !== 0) {
      throw new Error(`Error: Cliente debió ser vaciado (0 DOMIs), obtenido ${clientBalAfterCancel.balance_custody}`);
    }
    if (clientUser.domi_score !== 10) {
      throw new Error(`Error: Score de cliente esperado 10, obtenido ${clientUser.domi_score}`);
    }

    // Verificar deudas en la base de datos
    const [debts] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderId]);
    console.log(`Deudas registradas para el pedido #${orderId}:`);
    for (const d of debts) {
      console.log(` - Beneficiary: ${d.beneficiary_type}, Amount: ${d.amount_domis} DOMI, Refunded Service Fee: ${d.refunded_service_fee_domis} DOMI, Status: ${d.status}, Metadata: ${d.metadata_json}`);
    }

    if (debts.length !== 1) {
      throw new Error(`Error: Se esperaba exactamente 1 deuda, encontradas ${debts.length}`);
    }

    const systemDebt = debts[0];
    if (systemDebt.beneficiary_type !== 'system') {
      throw new Error(`Error: Tipo de beneficiario de deuda esperado "system", obtenido "${systemDebt.beneficiary_type}"`);
    }

    // 8. FLUJO: Pago de Deudas por el Cliente
    console.log('\n--- PASO 8: Cliente recarga saldo y paga sus deudas pendientes ---');
    const totalDebtAmount = parseFloat(systemDebt.amount_domis);
    console.log(`Monto total a recargar al cliente: ${totalDebtAmount} DOMI`);

    await conn.query('UPDATE wallets SET balance_custody = ? WHERE id = ?', [totalDebtAmount + 5, clientWallet.id]);
    await domiRedis.setBalance('user', testClientUserId, totalDebtAmount + 5);

    // Pagar deuda store
    console.log('Liquidando deuda de la sede (productos)...');
    await domiService.payDebt(testClientUserId, systemDebt.id, reqSimulated);

    // Verificar que la deuda está pagada
    const [updatedDebts] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderId]);
    if (updatedDebts[0].status !== 'paid') {
      throw new Error(`Error: La deuda debería estar pagada. Estado actual: ${updatedDebts[0].status}`);
    }
    console.log('✓ Deuda única marcada como paid en la base de datos.');

    // Verificar comisiones del sistema finales
    const [[sysFinal]] = await conn.query('SELECT balance_utility, balance_custody FROM wallets WHERE id = ?', [systemWallet.id]);
    console.log(`Balance final del Sistema - Utility: ${sysFinal.balance_utility}, Custody (tasas de procesamiento): ${sysFinal.balance_custody}`);
    
    const expectedUtility = parseFloat((parseFloat(sysInitial.balance_utility) + 1.75).toFixed(8));
    const actualUtility = parseFloat(parseFloat(sysFinal.balance_utility).toFixed(8));
    console.log(`Comisiones del sistema final: Esperada Utility: ${expectedUtility}, Obtenida: ${actualUtility}`);

    if (actualUtility !== expectedUtility) {
      throw new Error(`Fallo en recuperación total de comisiones: Esperado ${expectedUtility}, obtenido ${actualUtility}`);
    }

    console.log('\n=== TEST DE CANCELACIÓN EN listo_despacho EXITOSO ===');
  } catch (error) {
    console.error('Error durante la prueba de integración listo_despacho:', error);
    process.exit(1);
  } finally {
    // Limpiar registros de prueba temporales para mantener la DB limpia
    console.log('\nLimpiando fixtures de prueba...');
    await conn.query('DELETE FROM domi_order_debts WHERE order_id = (SELECT id FROM orders WHERE customer_user_id = ?)', [testClientUserId]);
    await conn.query('DELETE FROM order_items WHERE order_id = (SELECT id FROM orders WHERE customer_user_id = ?)', [testClientUserId]);
    await conn.query('DELETE FROM orders WHERE customer_user_id = ?', [testClientUserId]);
    await conn.query('DELETE FROM products WHERE id = ?', [testProductId]);
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (?, ?)', [testClientUserId, testDriverUserId]);
    await conn.query('DELETE FROM wallets WHERE user_id IN (?, ?)', [testClientUserId, testDriverUserId]);
    await conn.query('DELETE FROM users WHERE id IN (?, ?)', [testClientUserId, testDriverUserId]);
    
    // Restaurar min_domi_balance_driver y tasas de anticipos
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query(`
      UPDATE protocol_rules 
      SET min_domi_balance_driver = 600.00000000,
          customer_cancel_store_commission_refund_dispatch_rate = 0.75,
          customer_cancel_driver_commission_refund_dispatch_rate = 0.90
      WHERE id = 1
    `);
    await conn.query('SET @domi_bypass_security = NULL');

    conn.release();
    await db.end();
  }
}

runTest();
