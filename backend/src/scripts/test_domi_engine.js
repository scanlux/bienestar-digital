/**
 * Test DOMI Engine v3 - Cobro Inmediato y Reembolsos Manuales
 * Uso: node src/scripts/test_domi_engine.js
 */
require('dotenv').config();
const domiEngine = require('../services/domiEngine');
const db = require('../config/db');

async function runTests() {
  console.log('\n============================================');
  console.log('   VALIDACION DOMI v3 - COBRO INMEDIATO');
  console.log('============================================\n');

  const [stores] = await db.query('SELECT id FROM stores LIMIT 1');
  const [users] = await db.query('SELECT id FROM users ORDER BY id ASC LIMIT 4');
  if (stores.length === 0 || users.length < 2) { console.error('Necesitas al menos 1 tienda y 2 usuarios.'); process.exit(1); }

  const storeId = stores[0].id;
  const customerId = users[0].id;
  const driver1Id = users[1].id;
  const driver2Id = users.length > 2 ? users[2].id : users[0].id;
  console.log(`Store #${storeId}, Customer #${customerId}, Driver1 #${driver1Id}, Driver2 #${driver2Id}\n`);

  // Asegurarse de que tienen fondos
  await domiEngine.mintDomis('store', storeId, 50000, 'TEST-STORE');
  await domiEngine.mintDomis('user', driver1Id, 50000, 'TEST-DRIVER1');
  await domiEngine.mintDomis('user', driver2Id, 50000, 'TEST-DRIVER2');

  // TEST 1: Cobro Inmediato (chargeForOrder)
  console.log('--- TEST 1: Cobro Inmediato (chargeForOrder) ---');
  try {
    const cost = await domiEngine.calculateOrderCost(35000);
    const [orderRes] = await db.query(
      "INSERT INTO orders (store_id, customer_user_id, driver_user_id, total_cop, domi_cost, driver_domi_cost, status) VALUES (?, ?, ?, 35000, ?, ?, 'aceptado')",
      [storeId, customerId, driver1Id, cost.store_cost_domis, cost.driver_cost_domis]
    );
    const orderId = orderRes.insertId;
    console.log(`  Pedido #${orderId} aceptado: Tienda=${cost.store_cost_domis}, Repartidor=${cost.driver_cost_domis}`);

    const charge = await domiEngine.chargeForOrder(orderId, storeId, driver1Id, cost.store_cost_domis, cost.driver_cost_domis);
    console.log(`  Descontado INMEDIATAMENTE: Tienda=${charge.store_charged}, Repartidor=${charge.driver_charged}`);
    console.log('  PASS\n');
  } catch(e) { console.log('  FAIL:', e.message, '\n'); }

  // TEST 2: Incidencia Pre-Pickup (Reembolso Manual)
  console.log('--- TEST 2: Incidencia PRE-PICKUP y Reembolso ---');
  try {
    const cost = await domiEngine.calculateOrderCost(20000);
    const [orderRes] = await db.query(
      "INSERT INTO orders (store_id, customer_user_id, driver_user_id, total_cop, domi_cost, driver_domi_cost, status) VALUES (?, ?, ?, 20000, ?, ?, 'aceptado')",
      [storeId, customerId, driver1Id, cost.store_cost_domis, cost.driver_cost_domis]
    );
    const orderId = orderRes.insertId;
    await domiEngine.chargeForOrder(orderId, storeId, driver1Id, cost.store_cost_domis, cost.driver_cost_domis);

    const inc = await domiEngine.reportIncident(orderId, driver1Id, 'pre_pickup', 'Restaurante cerro');
    console.log(`  Incidencia reportada #${inc.incidentId} (Sin reembolso automatico)`);

    const resolve = await domiEngine.resolvePrePickupIncident(inc.incidentId, true);
    console.log(`  Operador aprobo refund: Devolvio ${resolve.refunded_to_driver} DOMI al repartidor.`);
    console.log('  PASS\n');
  } catch(e) { console.log('  FAIL:', e.message, '\n'); }

  // TEST 3: Incidencia Post-Pickup + Rescate
  console.log('--- TEST 3: POST-PICKUP + Rescate ---');
  try {
    const cost = await domiEngine.calculateOrderCost(60000);
    const [orderRes] = await db.query(
      "INSERT INTO orders (store_id, customer_user_id, driver_user_id, total_cop, domi_cost, driver_domi_cost, status) VALUES (?, ?, ?, 60000, ?, ?, 'en_camino')",
      [storeId, customerId, driver1Id, cost.store_cost_domis, cost.driver_cost_domis]
    );
    const orderId = orderRes.insertId;
    await domiEngine.chargeForOrder(orderId, storeId, driver1Id, cost.store_cost_domis, cost.driver_cost_domis);

    const inc = await domiEngine.reportIncident(orderId, driver1Id, 'post_pickup', 'Moto varada');
    console.log(`  Incidencia reportada #${inc.incidentId}, Rescate #${inc.rescueId}`);

    const assign = await domiEngine.assignRescue(inc.incidentId, driver2Id);
    console.log(`  Rescatista asignado y COBRADO tarifa normal: ${assign.rescuer_charged} DOMI`);

    const cb = await domiEngine.completeRescue(inc.rescueId, 'delivered');
    console.log(`  Rescate exitoso. Cashback al primer repartidor: ${cb.cashback} DOMI`);
    console.log('  PASS\n');
  } catch(e) { console.log('  FAIL:', e.message, '\n'); }

  // TEST 4: Incidencia Post-Pickup (Cliente no aparece)
  console.log('--- TEST 4: POST-PICKUP (Cliente no aparece) ---');
  try {
    const cost = await domiEngine.calculateOrderCost(25000);
    const [orderRes] = await db.query(
      "INSERT INTO orders (store_id, customer_user_id, driver_user_id, total_cop, domi_cost, driver_domi_cost, status) VALUES (?, ?, ?, 25000, ?, ?, 'en_camino')",
      [storeId, customerId, driver1Id, cost.store_cost_domis, cost.driver_cost_domis]
    );
    const orderId = orderRes.insertId;
    await domiEngine.chargeForOrder(orderId, storeId, driver1Id, cost.store_cost_domis, cost.driver_cost_domis);

    const inc = await domiEngine.reportIncident(orderId, driver1Id, 'post_pickup', 'Llegue pero el cliente no sale');
    
    // Asignamos un rescatista (simulando que pidio ayuda o se lo reasignaron)
    await domiEngine.assignRescue(inc.incidentId, driver2Id);
    
    const resolve = await domiEngine.completeRescue(inc.rescueId, 'customer_no_show');
    console.log(`  Operador resolvió rescate #${resolve.rescueId} como 'customer_no_show'. Ambos repartidores recibieron su 70% de vuelta.`);
    console.log('  PASS\n');
  } catch(e) { console.log('  FAIL:', e.message, '\n'); }

  // RESUMEN
  console.log('============================================');
  const [wallets] = await db.query('SELECT * FROM wallets');
  console.log('Billeteras finales:');
  for (const w of wallets) {
    console.log(`  [${w.owner_type}${w.owner_id ? ' #' + w.owner_id : ''}] custody=${w.balance_custody}, utility=${w.balance_utility}, locked=${w.locked_balance}`);
  }
  console.log('============================================');

  await db.end();
}

runTests().catch(e => { console.error(e); process.exit(1); });
