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
  console.log('=== INICIANDO PRUEBAS DE INTEGRACIÓN: CANCELACIÓN COD PREPARACIÓN ===');
  const conn = await db.getConnection();

  const testStoreId = 1; // Sede Chapinero M
  const testProductId = Math.floor(Math.random() * 20000) + 80000;

  try {
    // Setup Product
    await conn.query(`
      INSERT INTO products (id, store_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano)
      VALUES (?, ?, ?, 'Mock prod for cancellation test', 10000, 10, 1, 0)
    `, [testProductId, testStoreId, 'Producto Cancel COD ' + testProductId]);

    // ==========================================
    // ESCENARIO A: CLIENTE TIENE SALDO SUFICIENTE (18 DOMIs)
    // ==========================================
    console.log('\n--- ESCENARIO A: Saldo Suficiente (18 DOMIs) ---');
    const clientA = Math.floor(Math.random() * 20000) + 10000;
    await conn.query(`INSERT INTO users (id, email, password_hash, estado, domi_score, rol) VALUES (?, ?, 'mock', 'activo', 60, 'customer')`, [clientA, `clientA_${clientA}@trendy.sytes.net`]);
    await conn.query(`INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, 'Client', 'A', ?, ?)`, [clientA, String(clientA), '300' + String(clientA).padStart(7, '0')]);
    
    // Asignar 18 DOMIs a clientA
    const walletA = await wallets.getUserWallet(conn, clientA);
    await conn.query('UPDATE wallets SET balance_custody = 18.0 WHERE id = ?', [walletA.id]);
    await domiRedis.incrementBalance('user', clientA, 18.0);

    // Crear pedido total 10000 COP, producto 7000, envio 3000
    // Usamos distance_km para simular envio de 3000 COP (con peg 400 = 7.5 DOMIs)
    // Para simplificar, insertamos directamente en la base de datos con los valores exactos calculados
    const [orderInsert] = await conn.query(`
      INSERT INTO orders (
        store_id, customer_user_id, total_cop, driver_domi_cost, payment_method_customer, status, distance_km, driver_cost_domi_snapshot
      ) VALUES (?, ?, 10000, 7.5, 'cash_cod', 'aceptado', 3.0, 0.75)
    `, [testStoreId, clientA]);
    const orderIdA = orderInsert.insertId;

    // Simular cobro comisión tienda
    await domiEngine.processChargeSync(orderIdA, testStoreId, null, 1.0, 0);

    // Cancelar en preparando
    await orderService.updateOrderStatus(
      { id: clientA, rol: 'customer', actorType: 'user' },
      orderIdA,
      'cancelado',
      { body: { observation: 'Cliente cancela escenario A' } }
    );

    // Validaciones A
    const [[walletAUpdated]] = await conn.query('SELECT * FROM wallets WHERE id = ?', [walletA.id]);
    const [debtsA] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderIdA]);
    
    console.log(`Saldo final cliente A: ${walletAUpdated.balance_custody} DOMIs (Esperado: 1.20)`);
    console.log(`Deudas cliente A: ${debtsA.length} (Esperado: 0)`);

    // ==========================================
    // ESCENARIO B: CLIENTE TIENE SALDO PARCIAL (10 DOMIs)
    // ==========================================
    console.log('\n--- ESCENARIO B: Saldo Parcial (10 DOMIs) ---');
    const clientB = Math.floor(Math.random() * 20000) + 10000;
    await conn.query(`INSERT INTO users (id, email, password_hash, estado, domi_score, rol) VALUES (?, ?, 'mock', 'activo', 60, 'customer')`, [clientB, `clientB_${clientB}@trendy.sytes.net`]);
    await conn.query(`INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, 'Client', 'B', ?, ?)`, [clientB, String(clientB), '300' + String(clientB).padStart(7, '0')]);
    
    const walletB = await wallets.getUserWallet(conn, clientB);
    await conn.query('UPDATE wallets SET balance_custody = 10.0 WHERE id = ?', [walletB.id]);
    await domiRedis.incrementBalance('user', clientB, 10.0);

    const [orderInsertB] = await conn.query(`
      INSERT INTO orders (
        store_id, customer_user_id, total_cop, driver_domi_cost, payment_method_customer, status, distance_km, driver_cost_domi_snapshot
      ) VALUES (?, ?, 10000, 7.5, 'cash_cod', 'preparando', 3.0, 0.75)
    `, [testStoreId, clientB]);
    const orderIdB = orderInsertB.insertId;

    // Simular cobro comisión tienda
    await domiEngine.processChargeSync(orderIdB, testStoreId, null, 1.0, 0);

    // Cancelar en preparando
    await orderService.updateOrderStatus(
      { id: clientB, rol: 'customer', actorType: 'user' },
      orderIdB,
      'cancelado',
      { body: { observation: 'Cliente cancela escenario B' } }
    );

    const [[walletBUpdated]] = await conn.query('SELECT * FROM wallets WHERE id = ?', [walletB.id]);
    const [debtsB] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderIdB]);

    console.log(`Saldo final cliente B: ${walletBUpdated.balance_custody} DOMIs (Esperado: 0.40)`);
    console.log(`Deuda registrada cliente B: ${debtsB[0]?.amount_domis} DOMIs (Esperado: 7.50)`);

    // ==========================================
    // ESCENARIO C: CLIENTE TIENE SALDO CERO
    // ==========================================
    console.log('\n--- ESCENARIO C: Saldo Cero ---');
    const clientC = Math.floor(Math.random() * 20000) + 10000;
    await conn.query(`INSERT INTO users (id, email, password_hash, estado, domi_score, rol) VALUES (?, ?, 'mock', 'activo', 60, 'customer')`, [clientC, `clientC_${clientC}@trendy.sytes.net`]);
    await conn.query(`INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, 'Client', 'C', ?, ?)`, [clientC, String(clientC), '300' + String(clientC).padStart(7, '0')]);
    
    const walletC = await wallets.getUserWallet(conn, clientC);
    
    const [orderInsertC] = await conn.query(`
      INSERT INTO orders (
        store_id, customer_user_id, total_cop, driver_domi_cost, payment_method_customer, status, distance_km, driver_cost_domi_snapshot
      ) VALUES (?, ?, 10000, 7.5, 'cash_cod', 'listo', 3.0, 0.75)
    `, [testStoreId, clientC]);
    const orderIdC = orderInsertC.insertId;

    // Simular cobro comisión tienda
    await domiEngine.processChargeSync(orderIdC, testStoreId, null, 1.0, 0);

    // Cancelar en listo
    await orderService.updateOrderStatus(
      { id: clientC, rol: 'customer', actorType: 'user' },
      orderIdC,
      'cancelado',
      { body: { observation: 'Cliente cancela escenario C' } }
    );

    const [[walletCUpdated]] = await conn.query('SELECT * FROM wallets WHERE id = ?', [walletC.id]);
    const [debtsC] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderIdC]);

    console.log(`Saldo final cliente C: ${walletCUpdated.balance_custody} DOMIs (Esperado: 0.00)`);
    console.log(`Deuda registrada cliente C: ${debtsC[0]?.amount_domis} DOMIs (Esperado: 17.50)`);

    // Report Summary
    const results = [
      { test: 'Escenario A: Saldo del cliente', expected: '1.20000000', actual: walletAUpdated.balance_custody, pass: Math.abs(parseFloat(walletAUpdated.balance_custody) - 1.2) < 0.00001 },
      { test: 'Escenario A: Deuda registrada (marcada como paid)', expected: 'paid', actual: debtsA[0]?.status, pass: debtsA.length === 1 && debtsA[0].status === 'paid' && parseFloat(debtsA[0].amount_domis) === 0 },
      { test: 'Escenario B: Saldo del cliente', expected: '0.40000000', actual: walletBUpdated.balance_custody, pass: Math.abs(parseFloat(walletBUpdated.balance_custody) - 0.4) < 0.00001 },
      { test: 'Escenario B: Deuda registrada', expected: '7.50000000', actual: debtsB[0]?.amount_domis, pass: Math.abs(parseFloat(debtsB[0]?.amount_domis) - 7.5) < 0.00001 },
      { test: 'Escenario C: Saldo del cliente', expected: '0.00000000', actual: walletCUpdated.balance_custody, pass: Math.abs(parseFloat(walletCUpdated.balance_custody) - 0.0) < 0.00001 },
      { test: 'Escenario C: Deuda registrada', expected: '17.50000000', actual: debtsC[0]?.amount_domis, pass: Math.abs(parseFloat(debtsC[0]?.amount_domis) - 17.5) < 0.00001 }
    ];

    console.log('\n=== RESULTADOS DE VALIDACIÓN ===');
    console.table(results);

    const hasFailed = results.some(r => !r.pass);
    if (hasFailed) {
      throw new Error('Algunas validaciones fallaron en la prueba de cancelación COD.');
    }

    console.log('\n*** PRUEBA CANCELACIÓN COD PREPARACIÓN FINALIZADA CON ÉXITO (PASS) ***');
  } finally {
    conn.release();
    redisClient.quit();
  }
}

runTest().catch(err => {
  console.error('\n❌ Error critico en el test:', err);
  process.exit(1);
});
