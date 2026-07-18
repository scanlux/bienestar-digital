const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const db = require('../../config/db');
const redisClient = require('../../config/redis');
const domiRedis = require('../../services/domiRedis');
const deliveryCompanyService = require('../../domains/delivery-company/delivery-company.service');
const domiService = require('../../domains/domi/domi.service');
const domiEngine = require('../../services/domiEngine');
const { ForbiddenError } = require('../../utils/errors');

async function test() {
  console.log('=== INICIANDO PRUEBAS DE INTEGRACIÓN DE SEGURIDAD Y PERMISOS DE EMPRESA DE REPARTO ===');
  const conn = await db.getConnection();

  const testAdminUserId = 9988;
  const testDriverUserId = 9987;
  const testCompanyId = 9989;
  const testOrderId = 9989;

  try {
    // 0. Limpieza inicial
    console.log('\n0. Limpiando datos de prueba anteriores...');
    // Desactivar temporalmente los triggers de rbac para permitir borrar en user_roles en test
    await conn.query('SET @domi_is_root = 1');
    await conn.query('DELETE FROM user_roles WHERE user_id IN (?, ?)', [testAdminUserId, testDriverUserId]);
    await conn.query('DELETE FROM security_audit_logs WHERE actor_id IN (?, ?) OR (resource_type = "order" AND resource_id = ?)', [testAdminUserId, testDriverUserId, testOrderId]);
    await conn.query('DELETE FROM orders WHERE id = ?', [testOrderId]);
    await conn.query('DELETE FROM profiles WHERE usuario_id IN (?, ?)', [testAdminUserId, testDriverUserId]);
    await conn.query('DELETE FROM delivery_companies WHERE id = ?', [testCompanyId]);
    await conn.query('DELETE FROM wallets WHERE user_id IN (?, ?) OR delivery_company_id = ?', [testAdminUserId, testDriverUserId, testCompanyId]);
    await conn.query('DELETE FROM users WHERE id IN (?, ?)', [testAdminUserId, testDriverUserId]);

    await domiRedis.setBalance('delivery_company', testCompanyId, 0);

    // 1. Crear usuarios y roles para el test
    console.log('\n1. Creando usuarios de prueba...');
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol)
      VALUES (?, 'test_delivery_admin@trendy.sytes.net', 'mock_hash', 'activo', 100, 'admin')
    `, [testAdminUserId]);

    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Admin', 'Empresa Test', '99889988', '3009988998')
    `, [testAdminUserId]);

    const [[rBefore]] = await conn.query('SELECT @domi_is_root AS val');
    console.log('--- DEBUG: @domi_is_root value before user insert:', rBefore.val);
    await conn.query(`
      INSERT INTO users (id, email, password_hash, estado, domi_score, rol, es_repartidor, repartidor_activo)
      VALUES (?, 'test_delivery_driver@trendy.sytes.net', 'mock_hash', 'activo', 100, 'customer', 1, 1)
    `, [testDriverUserId]);

    await conn.query(`
      INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
      VALUES (?, 'Repartidor', 'Empresa Test', '99879987', '3009987998')
    `, [testDriverUserId]);

    // Crear la empresa de reparto
    await conn.query(`
      INSERT INTO delivery_companies (id, usuario_id, nit, razon_social, estado)
      VALUES (?, ?, '999-999-999', 'Test Mensajeria Express', 'activo')
    `, [testCompanyId, testAdminUserId]);

    // Asignar el rol delivery_company_admin en user_roles
    await conn.query(`
      INSERT IGNORE INTO user_roles (user_type, user_id, role_id)
      SELECT 'user', ?, id FROM roles WHERE code = 'delivery_company_admin'
    `, [testAdminUserId]);

    // Asignar el rol driver en user_roles para el repartidor
    await conn.query(`
      INSERT IGNORE INTO user_roles (user_type, user_id, role_id)
      SELECT 'user', ?, id FROM roles WHERE code = 'driver'
    `, [testDriverUserId]);

    // Crear Billetera Corporativa y calentar saldo en DB + Redis
    console.log('Creando billetera corporativa y calentando saldo...');
    const companyWallet = await domiEngine.getDeliveryCompanyWallet(conn, testCompanyId);
    await conn.query('UPDATE wallets SET balance_custody = 10.0000 WHERE id = ?', [companyWallet.id]);
    await domiRedis.setBalance('delivery_company', testCompanyId, 10.0);

    const adminContext = {
      id: testAdminUserId,
      rol: 'delivery_company_admin',
      actorType: 'user',
      deliveryCompanyId: testCompanyId
    };

    // 2. Probar Afiliación de Conductor
    console.log('\n2. Test: Afiliación de conductor');
    const affResult = await deliveryCompanyService.affiliateDriver(adminContext, {
      cedula: '99879987'
    });
    console.log('Resultado afiliación:', affResult);
    const [[driverProfile]] = await conn.query('SELECT delivery_company_id FROM profiles WHERE usuario_id = ?', [testDriverUserId]);
    if (driverProfile.delivery_company_id === testCompanyId) {
      console.log('✅ Conductor afiliado con éxito en DB');
    } else {
      throw new Error('Fallo al afiliar conductor');
    }

    // 3. Probar Aceptar Pedido y Cobro Fiduciario Asíncrono
    console.log('\n3. Test: Aceptar pedido y cobrar comisión');
    // Crear pedido en estado 'listo'
    await conn.query(`
      INSERT INTO orders (id, store_id, customer_user_id, total_cop, domi_cost, driver_domi_cost, payment_method_customer, status, delivery_address)
      VALUES (?, 1, ?, 20000, 1.0, 5.0, 'cash_cod', 'listo', 'Calle Falsa 123')
    `, [testOrderId, testDriverUserId]);

    const mockReq = {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Test Agent'
      },
      originalUrl: `/api/delivery-company/orders/${testOrderId}/accept`,
      method: 'POST'
    };

    const acceptResult = await deliveryCompanyService.acceptOrder(adminContext, testOrderId, mockReq);
    console.log('Resultado acceptOrder:', acceptResult);

    // Sincronizar el cobro en MariaDB para simular el worker
    await domiEngine.processChargeDeliveryCompanySync(testOrderId, testCompanyId, acceptResult.costPaid);
    console.log('Cobro procesado en MariaDB.');

    // Verificar estado de orden, pago y billetera en DB y Redis
    const [[orderAfterAccept]] = await conn.query('SELECT status, delivery_company_id, delivery_company_commission_paid FROM orders WHERE id = ?', [testOrderId]);
    const [[walletAfterAccept]] = await conn.query('SELECT balance_custody FROM wallets WHERE id = ?', [companyWallet.id]);
    const redisBalAfterAccept = await domiRedis.getWalletBalance('delivery_company', testCompanyId);

    console.log('Order status:', orderAfterAccept.status);
    console.log('Order paid:', orderAfterAccept.delivery_company_commission_paid);
    console.log('Wallet DB balance:', walletAfterAccept.balance_custody);
    console.log('Wallet Redis balance:', redisBalAfterAccept);

    if (
      orderAfterAccept.status === 'listo_despacho' &&
      orderAfterAccept.delivery_company_commission_paid === 1 &&
      parseFloat(walletAfterAccept.balance_custody) === 9.25 &&
      redisBalAfterAccept === 9.25
    ) {
      console.log('✅ Aceptar pedido y cobro fiduciario exitosos');
    } else {
      throw new Error('Fallo en acceptOrder o cobro fiduciario');
    }

    // Verificar registro de auditoría de aceptación de pedido
    const [acceptAuditLogs] = await conn.query(`
      SELECT * FROM security_audit_logs 
      WHERE actor_id = ? AND event_type = 'DELIVERY_COMPANY_ACCEPT_ORDER'
    `, [testAdminUserId]);
    if (acceptAuditLogs.length > 0 && acceptAuditLogs[0].resource_type === 'order' && acceptAuditLogs[0].resource_id === testOrderId) {
      console.log('✅ Log de auditoría para DELIVERY_COMPANY_ACCEPT_ORDER registrado correctamente con resource_type = order y resource_id');
    } else {
      console.error('Audit log:', acceptAuditLogs);
      throw new Error('Fallo al registrar audit log para DELIVERY_COMPANY_ACCEPT_ORDER');
    }

    // 4. Probar Asignación de Conductor
    console.log('\n4. Test: Asignar conductor al pedido');
    const mockReqAssign = {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Test Agent'
      },
      originalUrl: `/api/delivery-company/orders/${testOrderId}/assign-driver`,
      method: 'POST'
    };

    const assignResult = await deliveryCompanyService.assignDriver(adminContext, testOrderId, testDriverUserId, mockReqAssign);
    console.log('Resultado assignDriver:', assignResult);

    const [[orderAfterAssign]] = await conn.query('SELECT driver_user_id FROM orders WHERE id = ?', [testOrderId]);
    if (orderAfterAssign.driver_user_id === testDriverUserId) {
      console.log('✅ Conductor asignado exitosamente en DB');
    } else {
      throw new Error('Fallo al asignar conductor');
    }

    // Verificar registro de auditoría de asignación
    const [assignAuditLogs] = await conn.query(`
      SELECT * FROM security_audit_logs 
      WHERE actor_id = ? AND event_type = 'ASSIGN_DRIVER_BY_COMPANY'
    `, [testAdminUserId]);
    if (assignAuditLogs.length > 0 && assignAuditLogs[0].resource_type === 'order' && assignAuditLogs[0].resource_id === testOrderId) {
      console.log('✅ Log de auditoría para ASSIGN_DRIVER_BY_COMPANY registrado correctamente con resource_type = order y resource_id');
    } else {
      console.error('Audit log:', assignAuditLogs);
      throw new Error('Fallo al registrar audit log para ASSIGN_DRIVER_BY_COMPANY');
    }

    // 5. Probar BOLA (Acceder a billetera ajena)
    console.log('\n5. Test: BOLA (Acceso a billetera ajena)');
    try {
      // Intentamos ver la wallet del usuario 1 (cliente normal)
      await domiService.getWallet(adminContext, 'user', 1, mockReq);
      throw new Error('BOLA FAILED: Permitió acceso a billetera ajena');
    } catch (err) {
      if (err instanceof ForbiddenError) {
        console.log('Acceso denegado correctamente (ForbiddenError esperado):', err.message);
        
        // Verificar que se haya registrado el BOLA_ATTEMPT
        const [bolaAuditLogs] = await conn.query(`
          SELECT * FROM security_audit_logs 
          WHERE actor_id = ? AND event_type = 'BOLA_ATTEMPT'
        `, [testAdminUserId]);
        if (bolaAuditLogs.length > 0 && bolaAuditLogs[0].severity === 'HIGH') {
          console.log('✅ BOLA detectado y registrado en auditoría como HIGH con detalles completos');
        } else {
          console.error('BOLA logs:', bolaAuditLogs);
          throw new Error('Fallo al registrar evento BOLA en auditoría');
        }
      } else {
        throw err;
      }
    }

    console.log('\n=== TODAS LAS PRUEBAS DE INTEGRACIÓN DE SEGURIDAD Y AUDITORÍA SE COMPLETARON CON ÉXITO ===');
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS:', err);
  } finally {
    // 6. Limpieza final
    console.log('\n6. Limpiando datos de prueba...');
    try {
      await conn.query('SET @domi_is_root = 1');
      await conn.query('DELETE FROM user_roles WHERE user_id IN (?, ?)', [testAdminUserId, testDriverUserId]);
      await conn.query('DELETE FROM security_audit_logs WHERE actor_id IN (?, ?) OR (resource_type = "order" AND resource_id = ?)', [testAdminUserId, testDriverUserId, testOrderId]);
      await conn.query('DELETE FROM orders WHERE id = ?', [testOrderId]);
      await conn.query('DELETE FROM profiles WHERE usuario_id IN (?, ?)', [testAdminUserId, testDriverUserId]);
      await conn.query('DELETE FROM delivery_companies WHERE id = ?', [testCompanyId]);
      await conn.query('DELETE FROM wallets WHERE user_id IN (?, ?) OR delivery_company_id = ?', [testAdminUserId, testDriverUserId, testCompanyId]);
      await conn.query('DELETE FROM users WHERE id IN (?, ?)', [testAdminUserId, testDriverUserId]);
      await domiRedis.setBalance('delivery_company', testCompanyId, 0);
      console.log('Limpieza completada.');
    } catch (e) {
      console.error('Error en limpieza:', e.message);
    }

    conn.release();
    await db.end();
    await redisClient.disconnect();
    console.log('Conexiones cerradas.');
  }
}

test();
