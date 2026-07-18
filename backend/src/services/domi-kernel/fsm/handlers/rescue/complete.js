// fsm/handlers/rescue/complete.js
// Escenario: El rescatista completa la entrega exitosamente.
// La orden cambia de 'en_rescate' a 'entregado' (estado terminal positivo).
//
// PIPELINE:
//   1. PENALIZAR ORIGINAL → addPriorityPenalty (+2 pts)
//   2. PAGAR RESCATISTA (flujo normal: 100% domicilio) → creditRescuer
//   3. REEMBOLSAR ORIGINAL (desde el sistema: 70% comisión) → creditDriverFromSystem
//   4. LIMPIAR CAMPOS DE RESCATE → clearRescueFields
//   5. REGISTRAR TIEMPO DE ENTREGA
//
// Ver REGLAS_DE_NEGOCIO.md §9 — Protocolo de Incidente y Rescate.
// Ver MATRIZ_CANCELACIONES_REPARTIDOR.md Sección C — Pago COD e incidentes de rescate.

const calc       = require('../../calculators/rescue.calc');
const driver_ops = require('../../ops/driver.ops');

async function completeRescue({ order, conn }) {
  const amounts = calc.forComplete(order);
  const meta    = { referenceId: order.id };

  // 1. Penalizar conductor original (penalización reducida de 2 pts por reportar)
  await driver_ops.addPriorityPenalty(order, amounts.originalPriorityPenalty, conn);

  // 2. Pagar 100% de la tarifa de envío al rescatista activo
  if (amounts.rescuerDeliveryPay > 0) {
    await driver_ops.creditRescuer(order, amounts.rescuerDeliveryPay, conn, {
      ...meta, notes: `Pago de tarifa de envío a rescatista por entrega exitosa #${order.id}`
    });
  }

  // 3. Reembolsar 70% de la comisión al conductor original (desde fondos del sistema)
  if (amounts.originalCommissionRefund > 0) {
    await driver_ops.creditDriverFromSystem(order, amounts.originalCommissionRefund, conn, {
      ...meta, notes: `Reembolso del 70% de comisión al repartidor original por rescate exitoso #${order.id}`
    });
  }

  // 4. Limpiar campos de rescate en la orden
  await driver_ops.clearRescueFields(order.id, conn);

  // 5. Registrar la fecha de entrega
  await conn.execute(
    'UPDATE orders SET delivered_at = NOW(6) WHERE id = ?',
    [order.id]
  );

  // 6. Registrar en rescue_assignments el éxito del rescatista
  await conn.execute(
    `UPDATE rescue_assignments
     SET    status = 'entregado', completed_at = NOW(6)
     WHERE  order_id = ? AND status = 'en_camino'`,
    [order.id]
  );

  return { amounts };
}

module.exports = completeRescue;
