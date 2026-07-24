const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../config/db');
const redisClient = require('../../config/redis');
const domiRedis = require('../../services/domiRedis');
const orderGroupService = require('../../domains/order/services/OrderGroupService');
const orderService = require('../../domains/order/order.service');
const wallets = require('../../services/domi-kernel/wallets');
const gracePeriodChecker = require('../../domains/order/services/OrderGroupGracePeriodChecker');
const { checkDatabaseResetAllowed } = require('../../utils/envGuard');

async function run() {
  checkDatabaseResetAllowed();
  console.log('=== INICIANDO PRUEBAS DE INTEGRACIÓN: PEDIDOS MULTI-SEDE Y CANCELACIONES ===');

  const conn = await db.getConnection();
  try {
    const testClientUserId = 12001;
    const testDriverUserId = 13001;

    // 1. Limpieza inicial
    console.log('1. Limpiando datos de prueba anteriores...');
    await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_user_id = ?)', [testClientUserId]);
    await conn.query('DELETE FROM orders WHERE customer_user_id = ?', [testClientUserId]);
    await conn.query('DELETE FROM order_groups WHERE customer_user_id = ?', [testClientUserId]);
    await conn.query('DELETE FROM stores WHERE id IN (9991, 9992, 9993)');
    await conn.query('DELETE FROM users WHERE id IN (?, ?, 15001, 15002, 15003)', [testClientUserId, testDriverUserId]);
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (?, ?, 15001, 15002, 15003)', [testClientUserId, testDriverUserId]);

    // 2. Crear usuarios y configurar monederos
    console.log('2. Creando usuarios de prueba (Cliente, Repartidor y Administradores de Sede)...');
    // Cliente
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
      VALUES (?, 'test_client_group@trendy.sytes.net', 'mock_hash', 'activo', 60, 'customer')
    `, [testClientUserId]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Cliente', 'Grupo', '9999001', '3009999001')
    `, [testClientUserId]);
    
    // Repartidor
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol, es_repartidor, repartidor_activo)
      VALUES (?, 'test_driver_group@trendy.sytes.net', 'mock_hash', 'activo', 100, 'customer', 1, 1)
    `, [testDriverUserId]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Repartidor', 'Grupo', '9999002', '3009999002')
    `, [testDriverUserId]);

    // Admins de Sede
    for (const adminId of [15001, 15002, 15003]) {
      await conn.query(`
        INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
        VALUES (?, 'test_store_admin_${adminId}@trendy.sytes.net', 'mock_hash', 'activo', 100, 'customer')
      `, [adminId]);
      await conn.query(`
        INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
        VALUES (?, 'Admin', 'Sede', ?, ?)
      `, [adminId, String(adminId), '300' + String(adminId).padStart(7, '0')]);
    }

    const clientWallet = await wallets.getUserWallet(conn, testClientUserId);
    await conn.query('UPDATE wallets SET balance_custody = 200.0000 WHERE id = ?', [clientWallet.id]);
    await domiRedis.setBalance('user', testClientUserId, 200);

    const driverWallet = await wallets.getUserWallet(conn, testDriverUserId);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [driverWallet.id]);
    await domiRedis.setBalance('user', testDriverUserId, 10);

    // 3. Crear 3 Sedes en Yopal
    console.log('3. Creando sedes de prueba en Yopal...');
    // Sede 1 (Cerca)
    await conn.query(`
      INSERT INTO stores (id, commerce_id, usuario_id, nombre_sucursal, latitud, longitud, estado, acceptance_mode, direccion)
      VALUES (9991, 1, 15001, 'Sede Test A (Cerca)', 5.33981, -72.39210, 'operativo', 'automatico', 'Calle 1 # 2-3')
    `);
    // Sede 2 (Media)
    await conn.query(`
      INSERT INTO stores (id, commerce_id, usuario_id, nombre_sucursal, latitud, longitud, estado, acceptance_mode, direccion)
      VALUES (9992, 1, 15002, 'Sede Test B (Media)', 5.34510, -72.38950, 'operativo', 'automatico', 'Calle 4 # 5-6')
    `);
    // Sede 3 (Lejos)
    await conn.query(`
      INSERT INTO stores (id, commerce_id, usuario_id, nombre_sucursal, latitud, longitud, estado, acceptance_mode, direccion)
      VALUES (9993, 1, 15003, 'Sede Test C (Lejos)', 5.35220, -72.38120, 'operativo', 'automatico', 'Calle 7 # 8-9')
    `);

    // Habilitar wallets de las sedes con balance para comisiones
    for (const sid of [9991, 9992, 9993]) {
      const sw = await wallets.getStoreWallet(conn, sid);
      await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [sw.id]);
      await domiRedis.setBalance('store', sid, 10);
    }

    // 4. Crear productos de prueba para las sedes
    await conn.query('DELETE FROM products WHERE id IN (99991, 99992, 99993)');
    await conn.query("INSERT INTO products (id, store_id, nombre, precio_base, disponible, tiempo_prep_estimado) VALUES (99991, 9991, 'Hamburguesa A', 12000.00, 1, 15)");
    await conn.query("INSERT INTO products (id, store_id, nombre, precio_base, disponible, tiempo_prep_estimado) VALUES (99992, 9992, 'Pizza B', 16000.00, 1, 20)");
    await conn.query("INSERT INTO products (id, store_id, nombre, precio_base, disponible, tiempo_prep_estimado) VALUES (99993, 9993, 'Perro C', 10000.00, 1, 10)");

    // 5. Crear el Grupo de Pedidos Multi-Sede
    console.log('4. Creando pedido grupal multi-sede...');
    const groupData = {
      customer_user_id: testClientUserId,
      payment_method_customer: 'domi',
      delivery_address: 'Calle 10 # 20-30, Yopal',
      suborders: [
        {
          store_id: 9991,
          total_cop: 12000.00,
          items: [{ product_id: 99991, quantity: 1, price: 12000.00 }]
        },
        {
          store_id: 9992,
          total_cop: 16000.00,
          items: [{ product_id: 99992, quantity: 1, price: 16000.00 }]
        },
        {
          store_id: 9993,
          total_cop: 10000.00,
          items: [{ product_id: 99993, quantity: 1, price: 10000.00 }]
        }
      ]
    };

    const groupResult = await orderGroupService.createGroup(
      { id: testClientUserId, rol: 'customer' },
      groupData,
      {}
    );

    console.log('Resultado de Creación:', JSON.stringify(groupResult, null, 2));

    if (!groupResult.success || !groupResult.groupOrderId) {
      throw new Error('Fallo al crear el grupo de pedidos.');
    }
    const groupId = groupResult.groupOrderId;

    // Verificar que se crearon las 3 sub-órdenes con la FK group_order_id correspondiente
    const [subOrders] = await conn.query('SELECT * FROM orders WHERE group_order_id = ?', [groupId]);
    console.log(`Sub-órdenes creadas: ${subOrders.length}`);
    if (subOrders.length !== 3) {
      throw new Error(`Se esperaban 3 sub-órdenes, se encontraron ${subOrders.length}`);
    }

    // Verificar distribución segment-proportional y driver_cost_domi_snapshot de 0.45 flat
    console.log('Verificando snapshots de sub-órdenes:');
    let totalAssignedDeliveryCost = 0;
    for (const order of subOrders) {
      console.log(`- Sub-orden #${order.id} Sede: ${order.store_id}:`);
      console.log(`  * Tarifa envío asignada: ${order.driver_domi_cost} DOMI`);
      console.log(`  * Comisión uniformada del repartidor: ${order.driver_cost_domi_snapshot} DOMI`);
      if (parseFloat(order.driver_cost_domi_snapshot) !== 0.45) {
        throw new Error(`Se esperaba comisión de 0.45 DOMI, se obtuvo: ${order.driver_cost_domi_snapshot}`);
      }
      totalAssignedDeliveryCost += parseFloat(order.driver_domi_cost);
    }
    console.log(`Tarifa de envío consolidada asignada total: ${totalAssignedDeliveryCost} DOMI`);

    // 6. Test de Aceptación del Pedido Grupal por el Repartidor (con saldo suficiente)
    console.log('\n5. Test: Aceptación del grupo con saldo suficiente...');
    // Actualizar balance de repartidor para tener suficiente saldo: 0.45 * 3 = 1.35 DOMIs + margen mínimo (600)
    await conn.query('UPDATE wallets SET balance_custody = 700.0000 WHERE id = ?', [driverWallet.id]);
    await domiRedis.setBalance('user', testDriverUserId, 700.0);

    const acceptRes = await orderService.acceptOrder(
      { id: testDriverUserId, rol: 'driver', actorType: 'driver' },
      subOrders[0].id,
      {}
    );
    console.log('Resultado de Aceptación:', acceptRes.message);

    // Procesar los cobros asíncronos en MariaDB sincrónicamente para el test
    const domiEngine = require('../../services/domiEngine');
    for (const go of subOrders) {
      await domiEngine.processChargeSync(go.id, go.store_id, testDriverUserId, 0, parseFloat(go.driver_cost_domi_snapshot));
    }

    // Verificar saldo final del repartidor
    const [driverWalletCheck] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    const finalDriverBalance = parseFloat(driverWalletCheck[0].balance_custody);
    console.log(`Saldo final del repartidor: ${finalDriverBalance} DOMIs (Esperado: 700.0 - 1.35 = 698.65 DOMIs)`);
    if (parseFloat(finalDriverBalance.toFixed(4)) !== 698.6500) {
      throw new Error(`Saldo incorrecto del repartidor: ${finalDriverBalance}`);
    }

    // Verificar que todas las sub-órdenes pasaron a 'listo_despacho' y tienen al conductor asignado
    const [subOrdersAccepted] = await conn.query('SELECT id, status, driver_user_id FROM orders WHERE group_order_id = ?', [groupId]);
    for (const order of subOrdersAccepted) {
      if (order.status !== 'listo_despacho') {
        throw new Error(`Sub-orden #${order.id} no está en estado 'listo_despacho' (actual: ${order.status})`);
      }
      if (order.driver_user_id !== testDriverUserId) {
        throw new Error(`Sub-orden #${order.id} no tiene asignado al repartidor correcto.`);
      }
    }
    console.log('¡Todas las sub-órdenes se actualizaron correctamente a listo_despacho!');

    // 7. Test de Periodo de Gracia (Aceptación sin saldo suficiente)
    console.log('\n6. Test: Periodo de gracia por saldo insuficiente...');
    // Desasignar repartidor y limpiar grupo para repetir aceptación
    await conn.query('UPDATE orders SET driver_user_id = NULL, status = \'preparando\' WHERE group_order_id = ?', [groupId]);
    await conn.query('UPDATE order_groups SET driver_deposit_status = \'no_deposit\', driver_deposit_grace_expiry = NULL WHERE id = ?', [groupId]);

    // Bajar balance del repartidor a 0
    await conn.query('UPDATE wallets SET balance_custody = 0.0000 WHERE id = ?', [driverWallet.id]);
    await domiRedis.setBalance('user', testDriverUserId, 0.0);

    const acceptGraceRes = await orderService.acceptOrder(
      { id: testDriverUserId, rol: 'driver', actorType: 'driver' },
      subOrders[0].id,
      {}
    );
    console.log('Resultado Aceptación con saldo insuficiente:', acceptGraceRes.message);

    // Verificar estado del grupo
    const [groupCheck] = await conn.query('SELECT driver_deposit_status, driver_deposit_grace_expiry FROM order_groups WHERE id = ?', [groupId]);
    console.log(`Estado del depósito: ${groupCheck[0].driver_deposit_status}`);
    console.log(`Vencimiento del periodo de gracia: ${groupCheck[0].driver_deposit_grace_expiry}`);

    if (groupCheck[0].driver_deposit_status !== 'pending' || !groupCheck[0].driver_deposit_grace_expiry) {
      throw new Error('No se activó el periodo de gracia en el grupo.');
    }

    // Simular expiración del periodo de gracia (forzar fecha vencida en DB)
    console.log('Simulando expiración del periodo de gracia...');
    await conn.query('UPDATE order_groups SET driver_deposit_grace_expiry = DATE_SUB(NOW(6), INTERVAL 1 MINUTE) WHERE id = ?', [groupId]);

    // Ejecutar el checker
    await gracePeriodChecker.checkExpiredGracePeriods();

    // Verificar que se desasignó el repartidor y regresaron a 'preparando'
    const [subOrdersExpired] = await conn.query('SELECT id, status, driver_user_id FROM orders WHERE group_order_id = ?', [groupId]);
    for (const order of subOrdersExpired) {
      if (order.status !== 'preparando' || order.driver_user_id !== null) {
        throw new Error(`Sub-orden #${order.id} no se revirtió correctamente. Status: ${order.status}, Repartidor: ${order.driver_user_id}`);
      }
    }
    const [groupCheckExpired] = await conn.query('SELECT driver_deposit_status FROM order_groups WHERE id = ?', [groupId]);
    if (groupCheckExpired[0].driver_deposit_status !== 'expired') {
      throw new Error(`Estado de depósito incorrecto: ${groupCheckExpired[0].driver_deposit_status}`);
    }
    console.log('¡Checker de periodo de gracia funcionó correctamente!');

    // 8. Test de Cancelación Parcial por parte de una Sede
    console.log('\n7. Test: Cancelación parcial por parte de una sede...');
    // Volver a asignar el conductor (con saldo suficiente)
    await conn.query('UPDATE wallets SET balance_custody = 700.0000 WHERE id = ?', [driverWallet.id]);
    await domiRedis.setBalance('user', testDriverUserId, 700.0);
    await orderService.acceptOrder(
      { id: testDriverUserId, rol: 'driver', actorType: 'driver' },
      subOrders[0].id,
      {}
    );

    for (const go of subOrders) {
      await domiEngine.processChargeSync(go.id, go.store_id, testDriverUserId, 0, parseFloat(go.driver_cost_domi_snapshot));
    }

    // Obtener balances iniciales de wallets
    const swBefore = await wallets.getStoreWallet(conn, 9992);
    const storeBBefore = parseFloat(swBefore.balance_custody);

    const [dwBefore] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    const driverBefore = parseFloat(dwBefore[0].balance_custody);

    const [cwBefore] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [clientWallet.id]);
    const clientBefore = parseFloat(cwBefore[0].balance_custody);

    // Cancelar sub-orden 2 (Sede B, ID: 9992)
    const targetOrder = subOrders.find(o => o.store_id === 9992);
    console.log(`Cancelando sub-orden #${targetOrder.id} por la Sede B...`);

    await orderService.updateOrderStatus(
      { id: 9992, rol: 'partner', actorType: 'partner', commerceId: 1 },
      targetOrder.id,
      'cancelado',
      { body: { observation: 'Se agotó la pizza de prueba' } }
    );

    // Verificar balances finales
    const swAfter = await wallets.getStoreWallet(conn, 9992);
    const storeBAfter = parseFloat(swAfter.balance_custody);

    const [dwAfter] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [driverWallet.id]);
    const driverAfter = parseFloat(dwAfter[0].balance_custody);

    const [cwAfter] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [clientWallet.id]);
    const clientAfter = parseFloat(cwAfter[0].balance_custody);

    console.log(`Balances:`);
    console.log(`  * Sede B (Culpable): ${storeBBefore} -> ${storeBAfter} DOMIs`);
    console.log(`  * Conductor (Compensado): ${driverBefore} -> ${driverAfter} DOMIs`);
    console.log(`  * Cliente (Reembolsado + Bono): ${clientBefore} -> ${clientAfter} DOMIs`);

    // Sede B debió ser penalizada con:
    // - clientIndemnity (0.25) + driverDeliveryCompensation (50% de su tramo de envío)
    const segmentDomiCost = parseFloat(targetOrder.driver_domi_cost);
    const expectedStoreDebit = 0.25 + (segmentDomiCost * 0.5);
    console.log(`  - Débito esperado de Sede B: ${expectedStoreDebit} DOMIs`);
    if (parseFloat((storeBBefore - storeBAfter).toFixed(4)) !== parseFloat(expectedStoreDebit.toFixed(4))) {
      throw new Error(`Débito incorrecto en wallet de Sede B. Delta obtenido: ${storeBBefore - storeBAfter}`);
    }

    // 9. Test de Cancelación en Cascada del Cliente (con Score Penalty único)
    console.log('\n8. Test: Cancelación en cascada del cliente...');
    // Cancelar el grupo completo
    const cancelGroupRes = await orderGroupService.cancelGroup(
      { id: testClientUserId, rol: 'customer' },
      groupId,
      {}
    );
    console.log('Resultado de cancelación en cascada:', JSON.stringify(cancelGroupRes, null, 2));

    // Verificar que todas las sub-órdenes pasaron a cancelado
    const [subOrdersFinal] = await conn.query('SELECT id, status FROM orders WHERE group_order_id = ?', [groupId]);
    for (const order of subOrdersFinal) {
      if (order.status !== 'cancelado') {
        throw new Error(`Sub-orden #${order.id} no se canceló en cascada (status actual: ${order.status})`);
      }
    }
    console.log('¡Todas las sub-órdenes quedaron canceladas con éxito!');

    // Limpieza final de datos de prueba
    console.log('Limpiando datos de prueba al finalizar...');
    await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE group_order_id = ?)', [groupId]);
    await conn.query('DELETE FROM orders WHERE group_order_id = ?', [groupId]);
    await conn.query('DELETE FROM order_groups WHERE customer_user_id = ?', [testClientUserId]);
    await conn.query('DELETE FROM products WHERE id IN (99991, 99992, 99993)');
    await conn.query('DELETE FROM stores WHERE id IN (9991, 9992, 9993)');

    await conn.query('DELETE FROM profiles WHERE usuario_id IN (?, ?, 15001, 15002, 15003)', [testClientUserId, testDriverUserId]);
    await conn.query('DELETE FROM users WHERE id IN (?, ?, 15001, 15002, 15003)', [testClientUserId, testDriverUserId]);

    console.log('\n=== TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON EXITOSAMENTE ===');

  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS DE INTEGRACIÓN:', error);
    process.exit(1);
  } finally {
    conn.release();
    await redisClient.quit();
    await db.end();
  }
}

run().catch(console.error);
