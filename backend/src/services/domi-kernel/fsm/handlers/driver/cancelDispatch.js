// fsm/handlers/driver/cancelDispatch.js
// Escenario: El repartidor cancela su asignación durante 'listo_despacho'.
//
// REGLA: Sin impacto financiero.
//        El pedido retrocede a 'listo' (nextState = 'listo').
//        Mayor penalización de prioridad de conductor (driver_penalty_points_dispatch_snapshot).
//        Se limpia driver_user_id para iniciar nueva búsqueda de conductor.
//
// Ver MATRIZ_CANCELACIONES_REPARTIDOR.md — columna 'listo_despacho'.

const calc = require('../../calculators/driverCancel.calc');
const driver_ops = require('../../ops/driver.ops');
const wallet_ops = require('../../ops/wallet.ops');

async function cancelDispatch({ order, conn, meta }) {
  const amounts = calc.forDispatch(order);

  // 1. Penalizar contador de prioridad del conductor
  if (!meta || !meta.skipPriorityPenalty) {
    await driver_ops.addPriorityPenalty(order, amounts.priorityPenaltyPoints, conn);
  }

  // 2. Desasignar conductor y regresar a listo
  if (order.group_order_id) {
    const [groupRows] = await conn.query('SELECT driver_deposit_status FROM order_groups WHERE id = ?', [order.group_order_id]);
    const depositStatus = groupRows[0]?.driver_deposit_status;

    if (depositStatus === 'paid') {
      const [groupOrders] = await conn.query('SELECT * FROM orders WHERE group_order_id = ? FOR UPDATE', [order.group_order_id]);
      for (const go of groupOrders) {
        const refundAmount = parseFloat((parseFloat(go.driver_cost_domi_snapshot || 0) * 0.70).toFixed(8));
        if (refundAmount > 0) {
          await wallet_ops.creditFromSystem(go.driver_user_id, refundAmount, conn, {
            referenceId: go.id,
            notes: `Devolución 70% comisión por cancelación del repartidor. Pedido #${go.id}`
          });
        }
      }
      await conn.query('UPDATE order_groups SET driver_deposit_status = \'no_deposit\', driver_deposit_grace_expiry = NULL WHERE id = ?', [order.group_order_id]);
    }

    await conn.execute(
      'UPDATE orders SET driver_user_id = NULL WHERE group_order_id = ?',
      [order.group_order_id]
    );
  } else {
    await conn.execute(
      'UPDATE orders SET driver_user_id = NULL WHERE id = ?',
      [order.id]
    );
  }

  return { amounts };
}

module.exports = cancelDispatch;
