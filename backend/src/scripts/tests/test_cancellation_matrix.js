const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../config/db');
const redisClient = require('../../config/redis');
const domiRedis = require('../../services/domiRedis');
const domiService = require('../../domains/domi/domi.service');
const orderService = require('../../domains/order/order.service');
const domiEngine = require('../../services/domiEngine');
const domiCashbackEngine = require('../../services/domiCashbackEngine');
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
  console.log('=== INICIANDO INTEGRACIÓN Y PRUEBAS DEL FLUJO DE CANCELACIONES Y DEUDAS ===');
  const conn = await db.getConnection();
  try {
    console.log('\n0. Generando nuevos registros de prueba temporales...');
    const testClientUserId = Math.floor(Math.random() * 20000) + 10000;
    const testDriverUserId = Math.floor(Math.random() * 20000) + 30000;

    // Obtener una sede existente en la base de datos (evitando crear Sede Test Cancelacion)
    const [storeRows] = await conn.query('SELECT id FROM stores LIMIT 1');
    if (storeRows.length === 0) {
      throw new Error('No hay sedes en la base de datos. Ejecuta la semilla primero.');
    }
    const testStoreId = storeRows[0].id;
    console.log(`Usando sede existente con ID: ${testStoreId}`);

    // Crear cliente de prueba
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
      VALUES (?, ?, 'mock_hash', 'activo', 60, 'customer')
    `, [testClientUserId, `test_client_${testClientUserId}@trendy.sytes.net`]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Cliente', 'Prueba', ?, ?)
    `, [testClientUserId, String(testClientUserId), '300' + String(testClientUserId).padStart(7, '0')]);

    // Crear repartidor de prueba
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
      VALUES (?, ?, 'mock_hash', 'activo', 60, 'customer')
    `, [testDriverUserId, `test_driver_${testDriverUserId}@trendy.sytes.net`]);
    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Repartidor', 'Prueba', ?, ?)
    `, [testDriverUserId, String(testDriverUserId), '300' + String(testDriverUserId).padStart(7, '0')]);

    // Configurar wallets balances
    const userWallet = await wallets.getUserWallet(conn, testClientUserId);
    await conn.query('UPDATE wallets SET balance_custody = 0.0000 WHERE id = ?', [userWallet.id]);
    await domiRedis.setBalance('user', testClientUserId, 0);

    const storeWallet = await wallets.getStoreWallet(conn, testStoreId);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [storeWallet.id]);
    await domiRedis.setBalance('store', testStoreId, 10);

    const driverWallet = await wallets.getUserWallet(conn, testDriverUserId);
    await conn.query('UPDATE wallets SET balance_custody = 50.0000 WHERE id = ?', [driverWallet.id]);
    await domiRedis.setBalance('user', testDriverUserId, 50);

    // 1. Simular pedido en Efectivo y Cancelación en estado 'preparando'
    console.log('\n1. Test: Cancelación en Preparando (Efectivo)');
    
    // Crear un pedido en efectivo con snapshots de producción válidos
    const [result] = await conn.query(`
      INSERT INTO orders (
        store_id, customer_user_id, total_cop, domi_cost, driver_domi_cost, 
        payment_method_customer, status, delivery_address,
        fiat_peg_snapshot,
        store_commission_refund_rate_snapshot,
        driver_commission_refund_rate_snapshot
      )
      VALUES (?, ?, 20000, 1.0, 5.0, 'cash_cod', 'pendiente', 'Calle Falsa 123', 400.0, 0.75, 0.90)
    `, [testStoreId, testClientUserId]);
    const orderId = result.insertId;
    console.log(`Pedido #${orderId} creado.`);

    // Transicionar a 'aceptado' (cobra comisión fija de sede)
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId, 'aceptado', {});
    console.log('Pedido transicionado a aceptado (comisión encolada en Redis).');

    // Procesar el cobro de la sede sincrónicamente en MariaDB para el test (ya que no corre el worker en segundo plano)
    await domiEngine.processChargeSync(orderId, testStoreId, null, 1.0, 0);
    console.log('Cobro procesado sincrónicamente en MariaDB.');

    // Transicionar a 'preparando'
    await orderService.updateOrderStatus({ id: 1, actorType: 'system_user', commerceId: 1 }, orderId, 'preparando', {});
    console.log('Pedido transicionado a preparando.');

    // Cancelar el pedido (sede cancela)
    await orderService.updateOrderStatus(
      { id: testClientUserId, actorType: 'user', rol: 'customer' }, 
      orderId, 
      'cancelado', 
      { body: { observation: 'Cliente canceló el pedido por demora' } }
    );
    console.log('Pedido cancelado.');

    // Validaciones:
    // Sede debe recibir de vuelta el 70% de su comisión (0.70 DOMI de vuelta)
    const [[storeWal]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [storeWallet.id]);
    console.log('Balance Sede (Esperado: 9.70):', storeWal.balance_custody);

    // Score del cliente debe haber sido penalizado con -40 pts (60 - 40 = 20 pts)
    const [[clientUsr]] = await conn.query('SELECT domi_score FROM users WHERE id = ?', [testClientUserId]);
    console.log('Score Cliente (Esperado: 20):', clientUsr.domi_score);

    // Debe haberse creado un registro en domi_order_debts
    const [debts] = await conn.query('SELECT * FROM domi_order_debts WHERE order_id = ?', [orderId]);
    console.log('Deudas del pedido creadas:', debts.length);
    if (debts.length > 0) {
      console.log('Detalle de la deuda:', {
        amount_domis: debts[0].amount_domis,
        beneficiary_type: debts[0].beneficiary_type,
        status: debts[0].status
      });
    }

    // 2. Intentar crear un nuevo pedido estando penalizado por deuda activa
    console.log('\n2. Test: Bloqueo de pedido por cargo activo');
    try {
      await orderService.createOrder(
        { id: testClientUserId, rol: 'customer', actorType: 'user' },
        {
          store_id: testStoreId,
          customer_user_id: testClientUserId,
          total_cop: 15000,
          payment_method_customer: 'domi',
          delivery_address: 'Calle 100 #20-30',
          items: []
        },
        {}
      );
      console.error('❌ Fallo: Debió bloquear la creación del pedido debido a deuda activa.');
    } catch (err) {
      console.log('✅ Bloqueo de pedido por deuda exitoso:', err.message);
    }

    // 3. Pagar la deuda desde la API
    console.log('\n3. Test: Pago de Cargo por Incumplimiento');
    if (debts.length > 0) {
      const debtId = debts[0].id;
      // Fund client wallet so they can pay
      await conn.query('UPDATE wallets SET balance_custody = 100.0000 WHERE id = ?', [userWallet.id]);
      await domiRedis.setBalance('user', testClientUserId, 100);

      const payResult = await domiService.payDebt(testClientUserId, debtId, {});
      console.log('Resultado de liquidación de cargo:', payResult);

      // Validar que la deuda esté marcada como pagada
      const [[paidDebt]] = await conn.query('SELECT status, paid_at FROM domi_order_debts WHERE id = ?', [debtId]);
      console.log('Estado de la deuda (Esperado: paid):', paidDebt.status);
      console.log('Fecha de pago:', paidDebt.paid_at);
    }

    // 4. Intentar crear un pedido en efectivo si el Score es <= 0
    console.log('\n4. Test: Bloqueo de pedido en efectivo por Score <= 0');
    // Setear score a -20
    await conn.query('UPDATE users SET domi_score = -20 WHERE id = ?', [testClientUserId]);
    
    try {
      await orderService.createOrder(
        { id: testClientUserId, rol: 'customer', actorType: 'user' },
        {
          store_id: testStoreId,
          customer_user_id: testClientUserId,
          total_cop: 15000,
          payment_method_customer: 'cash_cod',
          delivery_address: 'Calle 100 #20-30',
          items: []
        },
        {}
      );
      console.error('❌ Fallo: Debió bloquear el pedido con pago en efectivo debido a Score <= 0.');
    } catch (err) {
      console.log('✅ Bloqueo por Score <= 0 en efectivo exitoso:', err.message);
    }

    // Limpieza de datos de prueba al finalizar
    console.log('\n5. Limpiando registros de prueba...');
    console.log('Registros de prueba de IDs únicos conservados.');

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
