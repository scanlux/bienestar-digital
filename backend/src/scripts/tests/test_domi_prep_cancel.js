const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../config/db');
const redisClient = require('../../config/redis');
const domiRedis = require('../../services/domiRedis');
const orderService = require('../../domains/order/order.service');
const domiEngine = require('../../services/domiEngine');
const { checkDatabaseResetAllowed } = require('../../utils/envGuard');
const wallets = require('../../services/domi-kernel/wallets');

const securityEvents = [];
require('../../utils/securityLogger').logSecurityEvent = async (userId, eventType, severity, req, details) => {
  securityEvents.push({ userId, eventType, severity, details });
  console.log(`[AUDIT LOG] ${eventType} (${severity}) - ${JSON.stringify(details)}`);
};

async function runTest() {
  checkDatabaseResetAllowed();
  console.log('=== INICIANDO PRUEBA DE INTEGRACIÓN: CANCELACIÓN DOMI PREPARACIÓN ===');
  const conn = await db.getConnection();

  const testStoreId = 1; // Sede Chapinero M
  const testProductId = Math.floor(Math.random() * 20000) + 80000;
  const testClientId = Math.floor(Math.random() * 20000) + 10000;

  try {
    // 1. SETUP: Crear Fixtures
    await conn.query(`
      INSERT INTO products (id, store_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano)
      VALUES (?, ?, ?, 'Mock product for cancellation test', 10000, 10, 1, 0)
    `, [testProductId, testStoreId, 'Producto Cancel DOMI ' + testProductId]);

    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
      VALUES (?, ?, 'mock', 'activo', 60, 'customer')
    `, [testClientId, `client_domi_${testClientId}@trendy.sytes.net`]);

    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Client', 'DOMI', ?, ?)
    `, [testClientId, String(testClientId), '300' + String(testClientId).padStart(7, '0')]);

    // 2. wallets and saldos
    const clientWallet = await wallets.getUserWallet(conn, testClientId);
    const storeWallet = await wallets.getStoreWallet(conn, testStoreId);
    const systemWallet = await wallets.getSystemWallet(conn);

    const storeInitialCustody = parseFloat(storeWallet.balance_custody);
    const systemInitialCustody = parseFloat(systemWallet.balance_custody);
    const systemInitialUtility = parseFloat(systemWallet.balance_utility);

    // Cliente tiene 25 DOMIs bloqueados para el pedido
    await conn.query('UPDATE wallets SET locked_balance = 25.0 WHERE id = ?', [clientWallet.id]);
    await domiRedis.incrementBalance('user', testClientId, 0.0); // warm up cache

    // 3. Crear pedido DOMI
    const [orderInsert] = await conn.query(`
      INSERT INTO orders (
        store_id, customer_user_id, total_cop, driver_domi_cost, payment_method_customer, status, distance_km, driver_cost_domi_snapshot, fiat_peg_snapshot
      ) VALUES (?, ?, 10000, 7.5, 'domi', 'preparando', 3.0, 0.75, 400.0)
    `, [testStoreId, testClientId]);
    const orderId = orderInsert.insertId;

    // Simular cobro comisión tienda
    await domiEngine.processChargeSync(orderId, testStoreId, null, 1.0, 0);

    // 4. Cancelar
    console.log('\n--- Cancelando pedido en estado preparando ---');
    await orderService.updateOrderStatus(
      { id: testClientId, rol: 'customer', actorType: 'user' },
      orderId,
      'cancelado',
      { body: { observation: 'Cliente cancela pedido DOMI' } }
    );

    // 5. VALIDACIONES
    const [[clientWalletUpdated]] = await conn.query('SELECT * FROM wallets WHERE id = ?', [clientWallet.id]);
    const [[storeWalletUpdated]] = await conn.query('SELECT * FROM wallets WHERE id = ?', [storeWallet.id]);
    const [[systemWalletUpdated]] = await conn.query('SELECT * FROM wallets WHERE id = ?', [systemWallet.id]);
    const [debts] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderId]);

    const results = [
      { test: 'locked_balance del cliente liberado a 0', expected: '0.00000000', actual: clientWalletUpdated.locked_balance, pass: parseFloat(clientWalletUpdated.locked_balance) === 0 },
      { test: 'Cliente recibe envío (7.5) + abono (0.7)', expected: '8.20000000', actual: clientWalletUpdated.balance_custody, pass: Math.abs(parseFloat(clientWalletUpdated.balance_custody) - 8.2) < 0.00001 },
      { test: 'Tienda recibe neto parcial (15.75)', expected: String(storeInitialCustody - 1.0 + 15.75), actual: storeWalletUpdated.balance_custody, pass: Math.abs(parseFloat(storeWalletUpdated.balance_custody) - (storeInitialCustody - 1.0 + 15.75)) < 0.00001 },
      { test: 'Sistema recibe retención (1.05)', expected: String(systemInitialCustody + 1.05), actual: systemWalletUpdated.balance_custody, pass: Math.abs(parseFloat(systemWalletUpdated.balance_custody) - (systemInitialCustody + 1.05)) < 0.00001 },
      { test: 'Ninguna deuda generada', expected: '0', actual: debts.length, pass: debts.length === 0 }
    ];

    console.log('\n=== RESULTADOS DE VALIDACIÓN ===');
    console.table(results);

    const hasFailed = results.some(r => !r.pass);
    if (hasFailed) {
      throw new Error('Algunas validaciones fallaron en la prueba de cancelación DOMI.');
    }

    console.log('\n*** PRUEBA CANCELACIÓN DOMI PREPARACIÓN FINALIZADA CON ÉXITO (PASS) ***');
  } finally {
    conn.release();
    redisClient.quit();
  }
}

runTest().catch(err => {
  console.error('\n❌ Error critico en el test:', err);
  process.exit(1);
});
