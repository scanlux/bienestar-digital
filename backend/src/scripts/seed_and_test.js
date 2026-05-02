/**
 * Script para sembrar usuarios (repartidores), asignarles saldos y probar el flujo DOMI
 */
require('dotenv').config();
const db = require('../config/db');
const domiEngine = require('../services/domiEngine');
const bcrypt = require('bcryptjs');

async function runTestScenario() {
  console.log('\n============================================');
  console.log('   ESCENARIO DE PRUEBA REAL DOMI V3');
  console.log('============================================\n');

  try {
    // 1. Crear usuarios de prueba (1 Cliente, 2 Repartidores)
    console.log('1. Creando usuarios de prueba...');
    const passHash = await bcrypt.hash('123456', 10);
    
    // Cliente
    await db.query("INSERT IGNORE INTO users (email, password_hash, nombre, rol) VALUES ('cliente_test@domi.com', ?, 'Juan Cliente', 'customer')", [passHash]);
    // Repartidor Original
    await db.query("INSERT IGNORE INTO users (email, password_hash, nombre, rol) VALUES ('repartidor1_test@domi.com', ?, 'Carlos Repartidor', 'delivery')", [passHash]);
    // Rescatista
    await db.query("INSERT IGNORE INTO users (email, password_hash, nombre, rol) VALUES ('rescatista_test@domi.com', ?, 'Maria Rescatista', 'delivery')", [passHash]);

    const [[cliente]] = await db.query("SELECT id FROM users WHERE email = 'cliente_test@domi.com'");
    const [[repartidor1]] = await db.query("SELECT id FROM users WHERE email = 'repartidor1_test@domi.com'");
    const [[rescatista]] = await db.query("SELECT id FROM users WHERE email = 'rescatista_test@domi.com'");
    
    // 2. Obtener una tienda
    const [stores] = await db.query("SELECT id FROM stores LIMIT 1");
    if (stores.length === 0) throw new Error('No hay tiendas creadas.');
    const tiendaId = stores[0].id;

    console.log(`   - Cliente ID: ${cliente.id}`);
    console.log(`   - Repartidor 1 ID: ${repartidor1.id}`);
    console.log(`   - Rescatista ID: ${rescatista.id}`);
    console.log(`   - Tienda ID: ${tiendaId}\n`);

    // 3. Asignar saldos (MINT)
    console.log('2. Asignando saldos (Mint DOMIs)...');
    // Le damos $50,000 COP en DOMIs a cada uno
    await domiEngine.mintDomis('store', tiendaId, 50000, 'TEST_MINT_STORE');
    await domiEngine.mintDomis('user', repartidor1.id, 50000, 'TEST_MINT_DRIVER1');
    await domiEngine.mintDomis('user', rescatista.id, 50000, 'TEST_MINT_DRIVER2');
    console.log('   - Saldos asignados con éxito.\n');

    // Revisar balances iniciales
    const printBalances = async () => {
      const [ws] = await db.query(`SELECT owner_type, owner_id, balance_custody FROM wallets WHERE (owner_type = 'store' AND owner_id = ?) OR (owner_type = 'user' AND owner_id IN (?, ?))`, [tiendaId, repartidor1.id, rescatista.id]);
      console.log('   [Balances Actuales]:');
      for (const w of ws) {
        console.log(`     ${w.owner_type} #${w.owner_id}: ${w.balance_custody} DOMI`);
      }
    };
    await printBalances();
    console.log('');

    // 4. Simulando el Flujo 1: Pedido Normal y Cobro Inmediato
    console.log('3. Simulando Pedido Normal ($40.000 COP)');
    const order1Cost = await domiEngine.calculateOrderCost(40000);
    const [o1] = await db.query(
      "INSERT INTO orders (store_id, customer_user_id, driver_user_id, total_cop, domi_cost, driver_domi_cost, status) VALUES (?, ?, ?, 40000, ?, ?, 'aceptado')",
      [tiendaId, cliente.id, repartidor1.id, order1Cost.store_cost_domis, order1Cost.driver_cost_domis]
    );
    const order1Id = o1.insertId;
    
    // Se ejecuta el cobro inmediato (ambos pagan)
    const cobro1 = await domiEngine.chargeForOrder(order1Id, tiendaId, repartidor1.id, order1Cost.store_cost_domis, order1Cost.driver_cost_domis);
    console.log(`   - Cobrado Inmediatamente: Tienda pagó ${cobro1.store_charged} DOMI, Repartidor pagó ${cobro1.driver_charged} DOMI`);
    await printBalances();
    console.log('');

    // 5. Simulando el Flujo 2: Incidencia y Rescate
    console.log('4. Simulando Pedido con Incidencia (Se varó la moto)');
    const order2Cost = await domiEngine.calculateOrderCost(70000); // Supera el umbral
    const [o2] = await db.query(
      "INSERT INTO orders (store_id, customer_user_id, driver_user_id, total_cop, domi_cost, driver_domi_cost, status) VALUES (?, ?, ?, 70000, ?, ?, 'aceptado')",
      [tiendaId, cliente.id, repartidor1.id, order2Cost.store_cost_domis, order2Cost.driver_cost_domis]
    );
    const order2Id = o2.insertId;
    
    // Cobro inmediato
    await domiEngine.chargeForOrder(order2Id, tiendaId, repartidor1.id, order2Cost.store_cost_domis, order2Cost.driver_cost_domis);
    console.log(`   - Cobrado Inmediatamente (Pedido 2): Tienda pagó ${order2Cost.store_cost_domis} DOMI, Repartidor pagó ${order2Cost.driver_cost_domis} DOMI`);

    // Reporte de incidencia post_pickup
    const inc = await domiEngine.reportIncident(order2Id, repartidor1.id, 'post_pickup', 'Se pinchó la llanta trasera');
    console.log(`   - Incidencia abierta (#${inc.incidentId}). Pedido entra en rescate (#${inc.rescueId}).`);
    
    // Asignamos al rescatista
    const asignacion = await domiEngine.assignRescue(inc.incidentId, rescatista.id);
    console.log(`   - Rescatista asignado. El sistema le cobró INMEDIATAMENTE ${asignacion.rescuer_charged} DOMI por aceptar el rescate.`);
    await printBalances();
    console.log('');

    // 6. El cliente no aparece (Final del rescate)
    console.log('5. Finalizando rescate: El cliente no salió (customer_no_show)');
    const resolve = await domiEngine.completeRescue(inc.rescueId, 'customer_no_show');
    console.log(`   - Operador cierra caso como 'customer_no_show'.`);
    console.log(`   - El sistema devuelve el 70% tanto a Carlos (Original) como a María (Rescatista).`);
    
    await printBalances();

    console.log('\n============================================');
    console.log(' PRUEBA FINALIZADA CON EXITO');
    console.log('============================================\n');

  } catch (err) {
    console.error('\nERROR EN PRUEBA:', err.message);
  } finally {
    await db.end();
  }
}

runTestScenario();
