const db = require('../../../config/db');
const appLogger = require('../../../utils/appLogger');
const { logSecurityEvent } = require('../../../utils/securityLogger');

async function checkExpiredGracePeriods() {
  const conn = await db.getConnection();
  try {
    // 1. Encontrar grupos con grace period expirado
    const [expiredGroups] = await conn.query(
      "SELECT id, customer_user_id FROM order_groups WHERE driver_deposit_status = 'pending' AND driver_deposit_grace_expiry <= NOW(6)"
    );

    for (const group of expiredGroups) {
      await conn.beginTransaction();
      try {
        // Obtener el driver_user_id antes de desasignar para auditoría
        const [orders] = await conn.query('SELECT id, driver_user_id FROM orders WHERE group_order_id = ?', [group.id]);
        const driverUserId = orders[0]?.driver_user_id;

        // 2. Revertir sub-órdenes: desasignar repartidor y regresar a 'preparando'
        await conn.query(
          "UPDATE orders SET driver_user_id = NULL, status = 'preparando' WHERE group_order_id = ?",
          [group.id]
        );

        // 3. Actualizar estado del grupo
        await conn.query(
          "UPDATE order_groups SET driver_deposit_status = 'expired', driver_deposit_grace_expiry = NULL WHERE id = ?",
          [group.id]
        );

        await conn.commit();
        appLogger.info(`[GRACE_PERIOD] Expiró periodo de gracia para grupo de pedidos #${group.id}. Conductor #${driverUserId} desasignado.`);
        
        if (driverUserId) {
          await logSecurityEvent(driverUserId, 'GROUP_ORDER_DEPOSIT_EXPIRED', 'MEDIUM', null, { groupOrderId: group.id, reason: 'Período de gracia de depósito expirado' }, 'system');
        }
      } catch (err) {
        await conn.rollback();
        appLogger.error(`[GRACE_PERIOD_ERROR] Error al procesar expiración de grupo #${group.id}: ${err.message}`);
      }
    }
  } catch (error) {
    appLogger.error(`[GRACE_PERIOD_ERROR] Error en checkExpiredGracePeriods: ${error.message}`);
  } finally {
    conn.release();
  }
}

function startChecker(intervalMs = 15000) {
  appLogger.info(`[GRACE_PERIOD] Iniciando checker de expiración de grace period (intervalo: ${intervalMs}ms)...`);
  setInterval(() => {
    checkExpiredGracePeriods().catch(err => {
      appLogger.error(`[GRACE_PERIOD_INTERVAL_ERROR] ${err.message}`);
    });
  }, intervalMs);
}

module.exports = {
  checkExpiredGracePeriods,
  startChecker
};
