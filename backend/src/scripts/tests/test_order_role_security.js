const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../config/db');
const domiEngine = require('../../services/domiEngine');
const domiRedis = require('../../services/domiRedis');
const { checkDatabaseResetAllowed } = require('../../utils/envGuard');
// Mock security logger for clean test output
let securityEvents = [];
const securityLogger = require('../../utils/securityLogger');
securityLogger.logSecurityEvent = async (userId, eventType, severity, req, details) => {
  securityEvents.push({ userId, eventType, severity, details });
  console.log(`  [AUDIT MOCK LOG] Event: ${eventType} | Severity: ${severity} | Reason: ${details?.reason || 'None'}`);
};

const orderService = require('../../domains/order/order.service');

async function runTests() {
  checkDatabaseResetAllowed();
  console.log('=== INICIANDO PRUEBAS DE SEGURIDAD DE ROLES Y PEDIDOS ===');
  const conn = await db.getConnection();

  const testCustomerUserId = 8801;
  const testDriverUserId = 8802;
  const testAdminUserId = 8803;
  const testProductId = 8804;
  const testStoreId = 1; // Sede principal o existente

  try {
    // 1. Limpieza de residuos
    console.log('\n1. Limpiando fixtures previos...');
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query('SET @domi_is_root = 1');
    await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_user_id IN (?, ?, ?))', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM orders WHERE customer_user_id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM user_roles WHERE user_id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM wallets WHERE user_id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM users WHERE id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM products WHERE id = ?', [testProductId]);
    await conn.query('SET @domi_bypass_security = NULL');
    await conn.query('SET @domi_is_root = NULL');

    // 2. Probando trigger de auto-asignación al insertar usuarios
    console.log('\n2. Probando Trigger auto_assign_customer_role...');
    
    // Insertar cliente normal
    console.log('Insertando cliente normal (rol = customer, es_repartidor = 0)...');
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
      VALUES (?, 'test_cust_sec@trendy.sytes.net', 'hash', 'activo', 100, 'customer')
    `, [testCustomerUserId]);
    
    // Verificar que se le asignó el rol 10 (customer)
    let [rolesRows] = await conn.query('SELECT role_id FROM user_roles WHERE user_id = ?', [testCustomerUserId]);
    if (rolesRows.length === 1 && rolesRows[0].role_id === 10) {
      console.log('✅ OK: Cliente normal asignado automáticamente al rol customer (10).');
    } else {
      throw new Error(`Fallo: Cliente normal debería tener rol 10, pero tiene: ${JSON.stringify(rolesRows)}`);
    }

    // Insertar repartidor
    console.log('Insertando repartidor (rol = customer, es_repartidor = 1)...');
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol, es_repartidor)
      VALUES (?, 'test_driver_sec@trendy.sytes.net', 'hash', 'activo', 100, 'customer', 1)
    `, [testDriverUserId]);
    
    // Verificar que se le asignó el rol 10 (customer) y el rol 11 (driver)
    [rolesRows] = await conn.query('SELECT role_id FROM user_roles WHERE user_id = ? ORDER BY role_id', [testDriverUserId]);
    if (rolesRows.length === 2 && rolesRows[0].role_id === 10 && rolesRows[1].role_id === 11) {
      console.log('✅ OK: Repartidor asignado automáticamente a los roles customer (10) y driver (11).');
    } else {
      throw new Error(`Fallo: Repartidor debería tener roles [10, 11], pero tiene: ${JSON.stringify(rolesRows)}`);
    }

    // 3. Probando trigger de actualización de rol por cambio de es_repartidor
    console.log('\n3. Probando Trigger sync_user_roles_after_update...');
    
    console.log('Habilitando modo repartidor para el cliente normal (es_repartidor -> 1)...');
    await conn.query('UPDATE users SET es_repartidor = 1 WHERE id = ?', [testCustomerUserId]);
    
    [rolesRows] = await conn.query('SELECT role_id FROM user_roles WHERE user_id = ? ORDER BY role_id', [testCustomerUserId]);
    if (rolesRows.length === 2 && rolesRows[0].role_id === 10 && rolesRows[1].role_id === 11) {
      console.log('✅ OK: El rol se actualizó a los roles customer (10) y driver (11) correctamente.');
    } else {
      throw new Error(`Fallo: El rol no cambió a [10, 11], tiene: ${JSON.stringify(rolesRows)}`);
    }

    console.log('Deshabilitando modo repartidor para el cliente normal (es_repartidor -> 0)...');
    await conn.query('UPDATE users SET es_repartidor = 0 WHERE id = ?', [testCustomerUserId]);
    
    [rolesRows] = await conn.query('SELECT role_id FROM user_roles WHERE user_id = ? ORDER BY role_id', [testCustomerUserId]);
    if (rolesRows.length === 1 && rolesRows[0].role_id === 10) {
      console.log('✅ OK: El rol se revirtió a customer (10) correctamente.');
    } else {
      throw new Error(`Fallo: El rol no regresó a 10, tiene: ${JSON.stringify(rolesRows)}`);
    }

    // 4. Configurar wallets y fixtures para pruebas de pedidos
    console.log('\n4. Inicializando wallets y producto de prueba...');
    await conn.query("INSERT IGNORE INTO wallets (user_id) VALUES (?)", [testCustomerUserId]);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE user_id = ?', [testCustomerUserId]);
    await domiRedis.setBalance('user', testCustomerUserId, 10.0);

    await conn.query("INSERT IGNORE INTO wallets (user_id) VALUES (?)", [testDriverUserId]);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE user_id = ?', [testDriverUserId]);
    await domiRedis.setBalance('user', testDriverUserId, 10.0);

    // Insertar un usuario admin de prueba (rol = admin)
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
      VALUES (?, 'test_admin_sec@trendy.sytes.net', 'hash', 'activo', 100, 'admin')
    `, [testAdminUserId]);
    await conn.query("INSERT IGNORE INTO wallets (user_id) VALUES (?)", [testAdminUserId]);

    // Crear producto fixture
    await conn.query(`
      INSERT INTO products (id, store_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano)
      VALUES (?, ?, 'Producto Test', 'Test de seguridad', 1000, 5, 1, 0)
    `, [testProductId, testStoreId]);

    // 5. Probando creación de pedidos mediante el servicio API
    console.log('\n5. Probando validación en OrderService.createOrder...');
    
    const baseOrderData = {
      store_id: testStoreId,
      total_cop: 1000,
      payment_method_customer: 'domi',
      delivery_address: 'Calle 100 # 15-20',
      items: [{ product_id: testProductId, quantity: 1, price: 1000 }]
    };

    // A. Cliente normal compra (Debe funcionar)
    console.log('A. Cliente normal intenta comprar (Debería permitir)...');
    const customerContext = { id: testCustomerUserId, rol: 'customer', actorType: 'user' };
    const orderResult1 = await orderService.createOrder(customerContext, {
      ...baseOrderData,
      customer_user_id: testCustomerUserId
    }, {});
    console.log(`✅ OK: Pedido creado con éxito por cliente. ID: ${orderResult1.id}`);

    // B. Repartidor compra (Debe funcionar ya que su rol en la tabla users es 'customer')
    console.log('B. Repartidor intenta comprar (Debería permitir)...');
    const driverContext = { id: testDriverUserId, rol: 'customer', actorType: 'user', es_repartidor: 1 };
    const orderResult2 = await orderService.createOrder(driverContext, {
      ...baseOrderData,
      customer_user_id: testDriverUserId
    }, {});
    console.log(`✅ OK: Pedido creado con éxito por repartidor. ID: ${orderResult2.id}`);

    // C. Admin intenta comprar para sí mismo (Debe rechazar con 403)
    console.log('C. Admin intenta comprar para sí mismo (Debería denegar)...');
    const adminContext = { id: testAdminUserId, rol: 'admin', actorType: 'user' };
    securityEvents = [];
    try {
      await orderService.createOrder(adminContext, {
        ...baseOrderData,
        customer_user_id: testAdminUserId
      }, {});
      throw new Error('Fallo: Se permitió la creación de un pedido para un admin, lo cual viola la restricción.');
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('Solo los usuarios con rol de cliente')) {
        console.log('✅ OK: Se denegó correctamente el pedido para el admin.');
        // Verificar que se registró el evento de auditoría
        const hasLog = securityEvents.some(ev => ev.eventType === 'UNAUTHORIZED_ORDER_CREATION_ROLE');
        if (hasLog) {
          console.log('✅ OK: Evento UNAUTHORIZED_ORDER_CREATION_ROLE auditado correctamente.');
        } else {
          throw new Error('Fallo: No se registró el evento de auditoría UNAUTHORIZED_ORDER_CREATION_ROLE.');
        }
      } else {
        throw err;
      }
    }

    // 6. Probando trigger de seguridad directo en base de datos
    console.log('\n6. Probando Trigger enforce_customer_role_on_order_insert...');
    
    // Intento de inserción directa a la base de datos para el usuario admin
    console.log('Intentando inserción directa SQL en orders para el admin...');
    try {
      await conn.query(`
        INSERT INTO orders (store_id, customer_user_id, total_cop, payment_method_customer, status)
        VALUES (?, ?, 1000, 'domi', 'pendiente')
      `, [testStoreId, testAdminUserId]);
      throw new Error('Fallo: El trigger de base de datos no bloqueó la inserción directa de un pedido para un admin.');
    } catch (err) {
      if (err.sqlState === '45000' && err.message.includes('Solo un usuario con rol customer puede realizar pedidos')) {
        console.log('✅ OK: El trigger enforce_customer_role_on_order_insert bloqueó correctamente la inserción en base de datos.');
      } else {
        throw err;
      }
    }

    console.log('\n=== TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO ===\n');

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LAS PRUEBAS:', error);
    process.exit(1);
  } finally {
    // 7. Limpieza final de fixtures de prueba
    console.log('7. Limpiando fixtures de prueba finales...');
    await conn.query('SET @domi_bypass_security = 1');
    await conn.query('SET @domi_is_root = 1');
    await conn.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_user_id IN (?, ?, ?))', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM orders WHERE customer_user_id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM user_roles WHERE user_id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM wallets WHERE user_id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM users WHERE id IN (?, ?, ?)', [testCustomerUserId, testDriverUserId, testAdminUserId]);
    await conn.query('DELETE FROM products WHERE id = ?', [testProductId]);
    await conn.query('SET @domi_bypass_security = NULL');
    await conn.query('SET @domi_is_root = NULL');
    conn.release();
    process.exit(0);
  }
}

runTests();
