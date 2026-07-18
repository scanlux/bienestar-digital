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

async function cancelDispatch({ order, conn }) {
  const amounts = calc.forDispatch(order);

  // 1. Penalizar contador de prioridad del conductor
  await driver_ops.addPriorityPenalty(order, amounts.priorityPenaltyPoints, conn);

  // 2. Desasignar conductor y regresar a listo
  await conn.execute(
    'UPDATE orders SET driver_user_id = NULL WHERE id = ?',
    [order.id]
  );

  return { amounts };
}

module.exports = cancelDispatch;
