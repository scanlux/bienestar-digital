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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  checkDatabaseResetAllowed();
  console.log('=== INICIANDO PRUEBA DE INTEGRACION: CANCELACION EN CAMINO COD CON ADELANTO Y TASA ADMIN ===');
  const conn = await db.getConnection();
  
  console.log('\nGenerando registros de prueba temporales...');
  const testClientUserId = Math.floor(Math.random() * 20000) + 10000;
  const testDriverUserId = Math.floor(Math.random() * 20000) + 30000;
  const testStoreId = 1; // Sede Chapinero M (Real)
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
    
    // Wallet del cliente: 20 DOMIs exactos (Score inicial es 60, positivo para permitir COD)
    const clientWallet = await wallets.getUserWallet(conn, testClientUserId);
    await conn.query('UPDATE wallets SET balance_custody = 20.0000 WHERE id = ?', [clientWallet.id]);
    await domiRedis.setBalance('user', testClientUserId, 20.0);

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
    const [[sysInitial]] = await conn.query('SELECT balance_utility, balance_custody FROM wallets WHERE id = ?', [systemWallet.id]);
    console.log(`Balance inicial del Sistema - Utility: ${sysInitial.balance_utility}, Custody: ${sysInitial.balance_custody}`);

    const token = await domiEngine.getTokenRegistry(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);
    console.log(`Peg del Token DOMI: 1 DOMI = ${fiatPeg} COP`);

    // 3. CREACION DEL PEDIDO
    console.log('\n--- PASO 3: Creando pedido cash_cod por 25,000 COP ---');
    const orderData = {
      store_id: testStoreId,
      customer_user_id: testClientUserId,
      total_cop: 25000,
      payment_method_customer: 'cash_cod',
      delivery_address: 'Cra 7 # 60-10, Chapinero, Bogota',
      items: [
        { product_id: testProductId, quantity: 1, price: 25000 }
      ]
    };

    const clientUser = { id: testClientUserId, rol: 'customer', actorType: 'user' };
    const orderResult = await orderService.createOrder(clientUser, orderData, {});
    const orderId = orderResult.id;
    console.log(`Pedido #${orderId} creado con éxito. Estado inicial: '${orderResult.status}'`);

    const costDetails = orderResult.costDetails;
    const storeFixedFeeDomi = costDetails.store_cost_domis;
    const driverFixedFeeDomi = costDetails.driver_cost_domis;

    console.log(`Aplicando cobro sincrono de comision de tienda: ${storeFixedFeeDomi} DOMI`);
    await domiEngine.processChargeSync(orderId, testStoreId, null, storeFixedFeeDomi, 0);

    // Repartidor acepta el pedido
    console.log('\n--- PASO 4: Repartidor acepta el pedido ---');
    const driverUser = { id: testDriverUserId, actorType: 'user' };
    await orderService.acceptOrder(driverUser, orderId, {});

    // Cobrar comision del repartidor
    console.log(`Aplicando cobro sincrono de comision del repartidor: ${driverFixedFeeDomi} DOMI`);
    await domiEngine.processChargeSync(orderId, testStoreId, testDriverUserId, 0, driverFixedFeeDomi);

    // 4. CAMBIO A EN CAMINO
    console.log('\n--- PASO 5: Repartidor marca pedido en_camino ---');
    await orderService.updateOrderStatus({ id: testDriverUserId, rol: 'driver', actorType: 'user' }, orderId, 'en_camino', {});
    // Simular un cambio en la tasa global de tránsito antes de cancelar.
    // Esto verifica que el sistema use la tasa de tránsito snapshot guardada en el pedido.
    console.log('\n--- PASO 5b: Cambiando tasa global de anticipo en tránsito en protocol_rules (Simulación) ---');
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query(`
      UPDATE protocol_rules 
      SET customer_cancel_driver_commission_refund_transit_rate = 0.10
      WHERE id = 1
    `);
    await conn.query('SET @domi_bypass_security = NULL');

    // 5. CANCELAR EN CAMINO
    console.log('\n--- PASO 6: Cliente cancela pedido en_camino ---');
    await orderService.updateOrderStatus(
      { id: testClientUserId, rol: 'customer', actorType: 'user' },
      orderId,
      'cancelado',
      { body: { observation: 'Cliente cancela a mitad de camino' } }
    );

    // ==========================================
    // VALIDACIONES DE CANCELACION
    // ==========================================
    console.log('\n=== VALIDACIONES TRAS CANCELACION ===');
    const results = [];

    // Validacion 1: Estado del pedido
    const [[orderFinal]] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    results.push({
      test: 'Estado de pedido es cancelado',
      expected: 'cancelado',
      actual: orderFinal.status,
      pass: orderFinal.status === 'cancelado'
    });

    // Validacion 2: Score penalizado
    const [[clientFinal]] = await conn.query('SELECT domi_score FROM users WHERE id = ?', [testClientUserId]);
    results.push({
      test: 'Score del cliente penalizado (-60)',
      expected: '0',
      actual: String(clientFinal.domi_score),
      pass: parseInt(clientFinal.domi_score) === 0
    });

    // Validacion 3: Wallet de cliente debitada
    const [[clientWalletFinal]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [clientWallet.id]);
    results.push({
      test: 'Wallet del cliente vaciada (20 DOMIs debitados)',
      expected: '0.00000000',
      actual: clientWalletFinal.balance_custody,
      pass: parseFloat(clientWalletFinal.balance_custody) === 0
    });

    // Validacion 4: Wallet del repartidor (Anticipo de 75% comisión + porción productos de lo debitado)
    const driverDomiCost = parseFloat(orderFinal.driver_domi_cost);
    const productsDomiCost = (25000 / fiatPeg) - driverDomiCost;
    const cargoTotal = parseFloat((productsDomiCost + driverDomiCost).toFixed(8));
    const amountToDebit = Math.min(20.0, cargoTotal);

    const portionProducts = parseFloat((amountToDebit * (productsDomiCost / cargoTotal)).toFixed(8));
    const portionDelivery = parseFloat((amountToDebit - portionProducts).toFixed(8));
    const sysFeeRate = 0.004;
    const sysFee = parseFloat((portionDelivery * sysFeeRate).toFixed(8));
    const netToDriver = parseFloat((portionDelivery - sysFee).toFixed(8));

    const driverCommissionAdvance = 0.75 * 0.75; // 0.5625
    const sysRecoverAdvance = Math.min(netToDriver, driverCommissionAdvance);
    const driverNet = parseFloat((netToDriver - sysRecoverAdvance).toFixed(8));

    const expectedDriverDomi = parseFloat((2.0 - 0.75 + driverCommissionAdvance + portionProducts + driverNet).toFixed(8));

    const [[driverWalletFinal]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    const diffDriver = Math.abs(parseFloat(driverWalletFinal.balance_custody) - expectedDriverDomi);
    results.push({
      test: 'Billetera del repartidor tras anticipo y débito parcial',
      expected: String(expectedDriverDomi),
      actual: driverWalletFinal.balance_custody,
      pass: diffDriver < 0.001
    });

    // Validacion 5: Deuda generada en domi_order_debts
    const [debts] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderId]);
    const expectedDebtAmount = parseFloat((cargoTotal - amountToDebit).toFixed(8));
    const expectedRemainingAdvance = parseFloat((driverCommissionAdvance - sysRecoverAdvance).toFixed(8));
    const diffDebt = Math.abs(parseFloat(debts[0].amount_domis) - expectedDebtAmount);
    const diffAdvance = Math.abs(parseFloat(debts[0].refunded_service_fee_domis) - expectedRemainingAdvance);
    results.push({
      test: 'Una única deuda registrada a favor del repartidor',
      expected: `1 deuda de ${expectedDebtAmount} DOMI, anticipo restante de ${expectedRemainingAdvance} DOMI`,
      actual: `Cantidad de deudas: ${debts.length}, Monto: ${debts[0]?.amount_domis}, Anticipo: ${debts[0]?.refunded_service_fee_domis}`,
      pass: debts.length === 1 && debts[0].beneficiary_type === 'driver' && diffDebt < 0.001 && diffAdvance < 0.001
    });

    console.table(results);

    // 6. PAGAR DEUDA
    console.log('\n--- PASO 7: Cliente paga la deuda de Compensación Automática ---');
    // Cargar balance al cliente para poder pagar
    await conn.query('UPDATE wallets SET balance_custody = 50.0000 WHERE id = ?', [clientWallet.id]);
    await domiRedis.setBalance('user', testClientUserId, 50.0);

    const debtId = debts[0].id;
    const payResult = await domiService.payDebt(testClientUserId, debtId, {});
    console.log('Resultado de payDebt:', payResult);

    // ==========================================
    // VALIDACIONES DE PAGO DE DEUDA
    // ==========================================
    console.log('\n=== VALIDACIONES TRAS PAGO DE DEUDA ===');
    const resultsPay = [];

    // Validacion 6: Estado de la deuda
    const [[debtFinal]] = await conn.query('SELECT status, paid_at FROM domi_order_debts WHERE id = ?', [debtId]);
    resultsPay.push({
      test: 'Deuda marcada como pagada (paid)',
      expected: 'paid',
      actual: debtFinal.status,
      pass: debtFinal.status === 'paid' && debtFinal.paid_at !== null
    });

    // Validacion 7: Wallet del repartidor (Debe recibir el neto restante)
    const sysFeePaid = parseFloat((expectedDebtAmount * sysFeeRate).toFixed(8));
    const expectedDriverPay = parseFloat((expectedDriverDomi + (expectedDebtAmount - sysFeePaid - expectedRemainingAdvance)).toFixed(8));

    const [[driverWalletPay]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    const diffDriverPay = Math.abs(parseFloat(driverWalletPay.balance_custody) - expectedDriverPay);
    resultsPay.push({
      test: 'Billetera del repartidor recibe el neto de la deuda',
      expected: String(expectedDriverPay),
      actual: driverWalletPay.balance_custody,
      pass: diffDriverPay < 0.001
    });

    // Validacion 8: Wallet de sistema recupera todo
    const [[sysWalletFinal]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [systemWallet.id]);
    const expectedSysGain = parseFloat((sysFee + sysFeePaid + expectedRemainingAdvance).toFixed(8));
    const sysCustodyInitial = parseFloat(sysInitial.balance_custody);
    const sysCustodyFinal = parseFloat(sysWalletFinal.balance_custody);
    const sysGainActual = sysCustodyFinal - sysCustodyInitial;
    const diffSys = Math.abs(sysGainActual - expectedSysGain);
    resultsPay.push({
      test: 'Billetera del sistema recupera anticipo y retiene tasa admin del 0.4%',
      expected: `Ganancia neta: ${expectedSysGain} DOMI`,
      actual: `Ganancia neta real: ${sysGainActual} DOMI`,
      pass: diffSys < 0.01
    });


    console.table(resultsPay);

    const failedCount = results.filter(r => !r.pass).length + resultsPay.filter(r => !r.pass).length;
    if (failedCount === 0) {
      console.log('\n*** PRUEBA FINALIZADA EXITOSAMENTE: TODAS LAS VALIDACIONES PASARON (PASS) ***');
    } else {
      console.log(`\n*** PRUEBA FALLIDA: ${failedCount} validaciones fallaron ***`);
    }

  } catch (err) {
    console.error('❌ Error critico ejecutando el flujo de la prueba:', err);
  } finally {
    try {
      const connRestore = await db.getConnection();
      await connRestore.query('SET @domi_bypass_security = 1');
      await connRestore.query('UPDATE protocol_rules SET customer_cancel_driver_commission_refund_transit_rate = 0.75 WHERE id = 1');
      await connRestore.query('SET @domi_bypass_security = NULL');
      connRestore.release();
    } catch (e) {
      console.error('Error restaurando reglas en test_cod_transit_cancel:', e);
    }
    conn.release();
    await db.end();
    await redisClient.quit();
    console.log('Conexiones a DB y Redis cerradas.');
  }
}

runTest();
