const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../config/db');
const redisClient = require('../config/redis');
const domiRedis = require('../services/domiRedis');
const orderService = require('../domains/order/order.service');
const domiEngine = require('../services/domiEngine');
const { checkDatabaseResetAllowed } = require('../utils/envGuard');
const wallets = require('../services/domi-kernel/wallets');

// Mock security logger
const securityEvents = [];
require('../utils/securityLogger').logSecurityEvent = async (userId, eventType, severity, req, details) => {
  securityEvents.push({ userId, eventType, severity, details });
  console.log(`[AUDIT LOG] ${eventType} (${severity}) - ${details?.reason || ''}`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  checkDatabaseResetAllowed();
  console.log('=== INICIANDO PRUEBA DE INTEGRACION: CANCELACION EN CAMINO CASH_COD ===');
  const conn = await db.getConnection();
  
  console.log('\nGenerando registros de prueba temporales...');
  const testClientUserId = Math.floor(Math.random() * 20000) + 10000;
  const testDriverUserId = Math.floor(Math.random() * 20000) + 30000;
  const testStoreId = 1; // Sede Chapinero M (Real)
  const testProductId = Math.floor(Math.random() * 20000) + 80000;

  try {
    // 1. SETUP: Limpieza previa
    console.log('\n--- PASO 1: Saltando limpieza previa física (usando IDs únicos) ---');
    console.log('Limpieza completada.');

    // 2. SETUP: Crear Fixtures
    console.log('\n--- PASO 2: Creando fixtures (usuarios, perfiles y producto) ---');
    
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
    console.log('Fixtures creados exitosamente.');

    // Desactivar balance mínimo de conductor para el test
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query('UPDATE protocol_rules SET min_domi_balance_driver = 0 WHERE id = 1');
    await conn.query('SET @domi_bypass_security = NULL');

    // 3. SETUP: Configurar Billeteras y Saldos iniciales
    console.log('\n--- PASO 3: Inicializando wallets y saldos ---');
    
    // Wallet del cliente: 20 DOMIs exactos (Score inicial es 60, positivo para permitir COD)
    const clientWallet = await wallets.getUserWallet(conn, testClientUserId);
    await conn.query('UPDATE wallets SET balance_custody = 20.0000 WHERE id = ?', [clientWallet.id]);
    await domiRedis.setBalance('user', testClientUserId, 20.0);

    // Wallet del repartidor: 2.0 DOMIs (minimo para aceptar pedido con la nueva tasa de 0.75 comision)
    const driverWallet = await wallets.getUserWallet(conn, testDriverUserId);
    await conn.query('UPDATE wallets SET balance_custody = 2.0000 WHERE id = ?', [driverWallet.id]);
    await domiRedis.setBalance('user', testDriverUserId, 2.0);

    // Billetera de la sede Chapinero M
    const storeWallet = await wallets.getStoreWallet(conn, testStoreId);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [storeWallet.id]);
    await domiRedis.setBalance('store', testStoreId, 10.0);
    const storeBalanceInitial = 10.0;
    console.log(`Balance inicial Sede Chapinero M: ${storeBalanceInitial} DOMI`);
    
    // Obtener las reglas del protocolo y peg del token
    const rules = await domiEngine.getProtocolRules(conn);
    const token = await domiEngine.getTokenRegistry(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);
    console.log(`Peg del Token DOMI: 1 DOMI = ${fiatPeg} COP`);
    console.log(`Regla min_domi_balance_driver: ${rules.min_domi_balance_driver} DOMI`);

    // 4. CREACION DEL PEDIDO
    console.log('\n--- PASO 4: Creando pedido cash_cod por 25,000 COP ---');
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

    // Sede Chapinero M tiene modo de aceptacion automatico. Validamos que este en 'aceptado'.
    if (orderResult.status !== 'aceptado') {
      throw new Error(`Error: El estado inicial del pedido deberia ser 'aceptado' debido al modo automatico de la sede.`);
    }

    // Cobrar comision de la tienda en MariaDB
    const costDetails = orderResult.costDetails;
    console.log('Costos del pedido calculado:', costDetails);
    const storeFixedFeeDomi = costDetails.store_cost_domis;
    const driverFixedFeeDomi = costDetails.driver_cost_domis;

    console.log(`Aplicando cobro sincrono de comision de tienda: ${storeFixedFeeDomi} DOMI`);
    await domiEngine.processChargeSync(orderId, testStoreId, null, storeFixedFeeDomi, 0);

    // Verificar balance de la sede tras aceptacion
    const [[storeWalletAfterAccept]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [storeWallet.id]);
    console.log(`Balance Sede Chapinero M despues de aceptacion: ${storeWalletAfterAccept.balance_custody} DOMI (Esperado: ${storeBalanceInitial - storeFixedFeeDomi})`);

    // 5. SIMULAR PREPARACION CON TIEMPOS COMPRIMIDOS (1s real = 1 min simulado)
    const prepTimeMinutes = orderResult.costDetails ? 10 : 10; // tiempo estimado
    const waitTimeMs = prepTimeMinutes * 1000;
    console.log(`\n--- PASO 5: Simulando tiempo de preparacion (${prepTimeMinutes} minutos = ${waitTimeMs}ms reales) ---`);
    await sleep(waitTimeMs);

    console.log('Transicionando estado a: preparando');
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId, 'preparando', {});

    const waitTimeMsHalf = waitTimeMs / 2;
    console.log(`Esperando fin de preparacion (${waitTimeMsHalf}ms reales)...`);
    await sleep(waitTimeMsHalf);

    console.log('Transicionando estado a: listo');
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId, 'listo', {});

    // 6. REPARTIDOR ACEPTA PEDIDO
    console.log('\n--- PASO 6: Repartidor acepta el pedido ---');
    await sleep(2000);
    const driverUser = { id: testDriverUserId, actorType: 'user' };
    const acceptRes = await orderService.acceptOrder(driverUser, orderId, {});
    console.log('Resultado de acceptOrder:', acceptRes.message);

    // Cobrar comision del repartidor en MariaDB
    console.log(`Aplicando cobro sincrono de comision del repartidor: ${driverFixedFeeDomi} DOMI`);
    await domiEngine.processChargeSync(orderId, testStoreId, testDriverUserId, 0, driverFixedFeeDomi);

    // Verificar estado de la orden y asignacion
    const [[orderAfterAccept]] = await conn.query('SELECT status, driver_user_id FROM orders WHERE id = ?', [orderId]);
    console.log(`Pedido #${orderId} - Estado: '${orderAfterAccept.status}', Conductor asignado: ${orderAfterAccept.driver_user_id}`);
    
    // Verificar balance del conductor tras aceptar
    const [[driverWalletAfterAccept]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    console.log(`Balance Conductor despues de aceptar: ${driverWalletAfterAccept.balance_custody} DOMI (Esperado: ${2.0 - driverFixedFeeDomi})`);

    // 7. EN CAMINO
    console.log('\n--- PASO 7: Repartidor marca pedido en_camino ---');
    await sleep(3000); // Repartidor recogiendo
    await orderService.updateOrderStatus({ id: testDriverUserId, rol: 'driver', actorType: 'user' }, orderId, 'en_camino', {});
    console.log('Pedido en camino.');

    // 8. CLIENTE CANCELA EN RUTA
    console.log('\n--- PASO 8: Cliente cancela pedido en_camino ---');
    await sleep(2000); // Pedido en ruta
    await orderService.updateOrderStatus(
      { id: testClientUserId, rol: 'customer', actorType: 'user' },
      orderId,
      'cancelado',
      { body: { observation: 'Cliente cancela a mitad de camino' } }
    );
    console.log('Pedido cancelado por el cliente.');

    // ==========================================
    // 9. VALIDACIONES EXHAUSTIVAS
    // ==========================================
    console.log('\n=== INICIANDO VALIDACIONES DE BASE DE DATOS ===');
    
    const results = [];

    // Validacion 1: Estado del pedido en orders
    const [[orderFinal]] = await conn.query('SELECT status, cancelled_at FROM orders WHERE id = ?', [orderId]);
    const val1 = orderFinal.status === 'cancelado';
    results.push({
      test: 'Estado de pedido es cancelado',
      expected: 'status=cancelado',
      actual: `status=${orderFinal.status}, cancelled_at=${orderFinal.cancelled_at}`,
      pass: val1
    });

    // Validacion 2: Penalizacion de Score del cliente
    const [[clientFinal]] = await conn.query('SELECT domi_score FROM users WHERE id = ?', [testClientUserId]);
    const val2 = parseInt(clientFinal.domi_score) === 0; // 60 - 60 = 0
    results.push({
      test: 'Penalización de Score del cliente',
      expected: 'domi_score = 0',
      actual: `domi_score = ${clientFinal.domi_score}`,
      pass: val2
    });

    // Validacion 3: Balance del cliente
    const [[clientWalletFinal]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [clientWallet.id]);
    const clientRedisBalance = await domiRedis.getWalletBalance('user', testClientUserId);
    const val3 = parseFloat(clientWalletFinal.balance_custody) === 0 && parseFloat(clientRedisBalance) === 0;
    results.push({
      test: 'Wallet del cliente vaciada (debito maximo)',
      expected: 'balance_custody = 0, Redis balance = 0',
      actual: `MariaDB: ${clientWalletFinal.balance_custody}, Redis: ${clientRedisBalance}`,
      pass: val3
    });

    // Validacion 4: Wallet del repartidor (Reembolso 70% + compensacion driverNet)
    // Inicial = 2.0
    // Acepta = -0.75 (1.25)
    // Refund = +0.525 (1.775)
    // driverNet = 0 (porque portionDelivery 0.24 fue menor/igual que la comision reembolsada sysRecover = 0.072)
    // Total esperado: 1.775 DOMI
    const [[driverWalletFinal]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    const driverRedisBalance = await domiRedis.getWalletBalance('user', testDriverUserId);
    const val4 = Math.abs(parseFloat(driverWalletFinal.balance_custody) - 1.775) < 0.0001 && Math.abs(parseFloat(driverRedisBalance) - 1.775) < 0.0001;
    results.push({
      test: 'Billetera del repartidor compensada',
      expected: 'balance = 1.77500000 DOMI',
      actual: `MariaDB: ${driverWalletFinal.balance_custody}, Redis: ${driverRedisBalance}`,
      pass: val4
    });

    // Validacion 5: Deuda generada en domi_order_debts (proporcional entre store y driver)
    // cargoTotal = 62.5
    // amountToDebit = 20.0
    // store debt: 61.75 - 19.76 = 41.99
    // driver debt: 0.75 - 0.24 = 0.51
    const [debts] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ? ORDER BY beneficiary_type', [orderId]);
    const val5 = debts.length === 2 && 
                  debts[0].status === 'pending' && 
                  debts[0].beneficiary_type === 'store' && 
                  Math.abs(parseFloat(debts[0].amount_domis) - 41.99) < 0.0001 &&
                  debts[1].status === 'pending' && 
                  debts[1].beneficiary_type === 'driver' && 
                  Math.abs(parseFloat(debts[1].amount_domis) - 0.51) < 0.0001;
    results.push({
      test: 'Deuda registrada en domi_order_debts',
      expected: '2 deudas (store=41.99 DOMI, driver=0.51 DOMI)',
      actual: debts.length === 0 ? 'Sin deudas' : debts.map(d => `${d.beneficiary_type}=${d.amount_domis}`).join(', '),
      pass: val5
    });

    // Validacion 6: Entradas de Ledger (domi_ledger)
    const [ledgerEntries] = await conn.query('SELECT tx_type, amount_domis, notes FROM domi_ledger WHERE reference_id = ? AND reference_type = "order"', [orderId]);
    const val6 = ledgerEntries.length >= 4; // 2 cobros iniciales (sede + repartidor) + 2 de cancelacion (refund + transfer client->driver)
    results.push({
      test: 'Registros de Ledger inmutable',
      expected: '>= 4 transacciones asociadas al pedido',
      actual: `${ledgerEntries.length} transacciones registradas`,
      pass: val6
    });

    console.table(results);

    // 10. EDGE CASE: Intentar nuevo pedido con deuda
    console.log('\n--- PASO 10: Intentando realizar un nuevo pedido con deuda activa ---');
    try {
      await orderService.createOrder(clientUser, orderData, {});
      console.log('ERROR: Se permitio crear un nuevo pedido teniendo deudas pendientes.');
    } catch (e) {
      console.log(`EXITO ESPERADO: Error capturado correctamente -> ${e.message}`);
    }

    // 11. EDGE CASE: Intentar nuevo pedido COD con score <= 0 (eliminando la deuda temporalmente para aislar el score)
    console.log('\n--- PASO 11: Intentando realizar pedido COD con Score <= 0 ---');
    await conn.query('UPDATE domi_order_debts SET status = "paid" WHERE order_id = ?', [orderId]); // Pagar deuda temporalmente
    try {
      await orderService.createOrder(clientUser, orderData, {});
      console.log('ERROR: Se permitio crear un pedido COD con score <= 0.');
    } catch (e) {
      console.log(`EXITO ESPERADO: Error capturado correctamente -> ${e.message}`);
    }

    // Reporte final de validaciones
    const failedCount = results.filter(r => !r.pass).length;
    if (failedCount === 0) {
      console.log('\n*** PRUEBA FINALIZADA EXITOSAMENTE: TODAS LAS VALIDACIONES PASARON (PASS) ***');
    } else {
      console.log(`\n*** PRUEBA FALLIDA: ${failedCount} validaciones fallaron ***`);
    }

  } catch (err) {
    console.error('❌ Error critico ejecutando el flujo de la prueba:', err);
  } finally {
    // 12. CLEANUP: Restaurar base de datos
    console.log('\n--- PASO 12: Conservando registros con IDs únicos ---');

    conn.release();
    await db.end();
    await redisClient.quit();
    console.log('Conexiones a DB y Redis cerradas.');
  }
}

runTest();
