// fsm/handlers/driver/cancelPreparation.js
// Escenario: El repartidor cancela su asignación durante 'preparando' o 'listo'.
//
// REGLA: No hay impacto financiero para el conductor.
//        El pedido retrocede al estado 'listo' (nextState = 'listo').
//        Se incrementa el contador de prioridad del conductor en driver_penalty_points_prep_snapshot.
//        El sistema buscará otro conductor.
//
// Ver MATRIZ_CANCELACIONES_REPARTIDOR.md — columna 'preparando / listo'.

const calc = require('../../calculators/driverCancel.calc');
const driver_ops = require('../../ops/driver.ops');

async function cancelPreparation({ order, conn, meta }) {
  const amounts = calc.forPreparation(order);

  // 1. Penalizar contador de prioridad del conductor
  if (!meta || !meta.skipPriorityPenalty) {
    await driver_ops.addPriorityPenalty(order, amounts.priorityPenaltyPoints, conn);
  }

  // 2. Limpiar el conductor asignado en la orden para que el sistema busque otro
  if (order.group_order_id) {
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

module.exports = cancelPreparation;
