// fsm/calculators/storeCancel.calc.js
// FUNCIONES PURAS: cálculos para cuando la SEDE cancela.
// Ver MATRIZ_CANCELACIONES_SEDE.md — Secciones A y B.
//
// REGLA KEY: La sede NO recibe reembolso de su comisión en NINGÚN estado.
//            La comisión de la sede es retenida al 100% como penalización.
// REGLA KEY: La sede NO puede cancelar en en_camino ni en_rescate.
//            Esas transiciones no existen en transitions.js.
//
// REGLA FINANCIERA: El sistema cubre el anticipo del conductor
//                   usando balance_utility del sistema (no del cliente).
//                   Fuente: REGLAS §5 — RECUPERAR (cancelación de sede).

/**
 * Estado: pendiente / aceptado / preparando / listo
 *
 * REGLA:
 *   - Comisión de la sede: retenida 100% (penalización).
 *   - Conductor (si asignado): recibe anticipo de comisión (90%) desde sistema.
 *   - Conductor (si asignado): recibe 50% del domicilio desde sistema (COD con fee / DOMI sin fee).
 *   - Cliente: indemnización de fidelización (store_cancel_client_indemnity_domi_amount_snapshot).
 *   - COD: cliente recibe el bono en DOMIs. DOMI: locked_balance devuelto + bono.
 *   - Penalización de contador de confiabilidad de sede: +store_penalty_points_prep_snapshot.
 */
function forPreparation(order) {
  const isCod     = order.payment_method_customer === 'cash_cod';
  const fee       = isCod ? parseFloat(order.platform_processing_fee_rate_snapshot || 0) : 0;
  const hasDriver = !!order.driver_user_id;

  // La comisión de la sede se retiene al 100% (sin reembolso)
  const storeCommissionRetained = parseFloat(order.store_commission_advance || 0);

  // El sistema paga el anticipo de comisión al conductor (si existe)
  const driverCommissionFromSystem = hasDriver
    ? parseFloat(order.driver_commission_advance || 0)
      * parseFloat(order.driver_commission_refund_on_store_cancel_rate_snapshot || 0.90)
    : 0;

  // El sistema paga 50% del domicilio al conductor (si existe)
  const domiCost     = parseFloat(order.driver_domi_cost || 0);
  const splitRate    = parseFloat(order.store_cancel_driver_delivery_pct_rate_snapshot || 0.5);
  const driverDeliveryFromSystem = hasDriver
    ? parseFloat((domiCost * splitRate * (1 - fee)).toFixed(8))
    : 0;

  // Indemnización al cliente (bono de fidelización por cancelación de sede)
  const clientIndemnity = parseFloat(order.store_cancel_client_indemnity_domi_amount_snapshot || 0);

  // DOMI: reembolso del locked_balance
  const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
  const lockedBalance = isCod ? 0 : parseFloat((orderTotalDomi + domiCost).toFixed(8));

  // Penalización de confiabilidad de sede
  const storePenaltyPoints = parseFloat(order.store_penalty_points_prep_snapshot || 1);

  return {
    storeCommissionRetained,      // queda retenida como penalización
    driverCommissionFromSystem,   // sistema paga al conductor (90% del anticipo)
    driverDeliveryFromSystem,     // sistema paga 50% del domicilio al conductor
    clientIndemnity,              // bono de fidelización al cliente
    lockedBalance,                // DOMI: devolución al cliente
    storePenaltyPoints,
    hasDriver,
    isCod,
  };
}

/**
 * Estado: listo_despacho
 * El conductor ya fue formalmente asignado y está en ruta hacia la sede.
 * Mayor penalización de sede.
 * Distribución idéntica a forPreparation con snapshot de dispatch.
 */
function forDispatch(order) {
  const isCod  = order.payment_method_customer === 'cash_cod';
  const fee    = isCod ? parseFloat(order.platform_processing_fee_rate_snapshot || 0) : 0;

  const storeCommissionRetained = parseFloat(order.store_commission_advance || 0);

  const driverCommissionFromSystem = parseFloat(order.driver_commission_advance || 0)
    * parseFloat(order.driver_commission_refund_on_store_cancel_rate_snapshot || 0.90);

  const domiCost   = parseFloat(order.driver_domi_cost || 0);
  const splitRate  = parseFloat(order.store_cancel_driver_delivery_pct_rate_snapshot || 0.5);
  const driverDeliveryFromSystem = parseFloat((domiCost * splitRate * (1 - fee)).toFixed(8));

  const clientIndemnity = parseFloat(order.store_cancel_client_indemnity_domi_amount_snapshot || 0);
  const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
  const lockedBalance   = isCod ? 0 : parseFloat((orderTotalDomi + domiCost).toFixed(8));

  // Mayor penalización en listo_despacho
  const storePenaltyPoints = parseFloat(order.store_penalty_points_dispatch_snapshot || 2);

  return {
    storeCommissionRetained,
    driverCommissionFromSystem,
    driverDeliveryFromSystem,
    clientIndemnity,
    lockedBalance,
    storePenaltyPoints,
    isCod,
  };
}

module.exports = { forPreparation, forDispatch };

