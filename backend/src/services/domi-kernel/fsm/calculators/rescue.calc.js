// fsm/calculators/rescue.calc.js
// FUNCIONES PURAS: cálculos para el protocolo en_rescate.
// Ver MATRIZ_CANCELACIONES_REPARTIDOR.md — Sección C.
// Ver REGLAS_DE_NEGOCIO.md §9 — Protocolo de Incidente y Rescate.
//
// REGLAS CLAVE:
//   - El rescatista sigue el flujo NORMAL de entrega: cobra el 100% del domicilio.
//   - El conductor original recupera el 70% de su comisión de servicio ÚNICAMENTE
//     si la orden llega a ser entregada (driver_rescue_commission_refund_rate_snapshot).
//   - Si el orden NO se entrega: el original recibe 0% de reembolso.
//   - El reembolso al original sale del BALANCE DEL SISTEMA (no del locked_balance).

/**
 * Rescatista completa la entrega exitosamente → orden pasa a 'entregado'.
 *
 * Flujo:
 *   1. Rescatista recibe 100% del domicilio (flujo normal de entrega).
 *   2. Conductor original recibe 70% de su comisión de servicio (del sistema).
 *   3. Conductor original recibe penalización reducida de contador (2 pts).
 */
function forComplete(order) {
  const isCod = order.payment_method_customer === 'cash_cod';
  const fee   = isCod ? parseFloat(order.platform_processing_fee_rate_snapshot || 0) : 0;

  // Rescatista: 100% del domicilio (flujo normal, sin split)
  const rescuerDeliveryPay = parseFloat(
    (parseFloat(order.driver_domi_cost || 0) * (1 - fee)).toFixed(8)
  );

  // Original: 70% de su comisión de servicio (sale del sistema, no del locked_balance)
  const refundRate = parseFloat(order.driver_rescue_commission_refund_rate_snapshot || 0.70);
  const originalCommissionRefund = parseFloat(
    (parseFloat(order.driver_commission_advance || 0) * refundRate).toFixed(8)
  );

  // Penalización reducida al conductor original (reconoce que reportó correctamente)
  const originalPriorityPenalty = parseFloat(order.driver_penalty_points_rescue_original_snapshot || 2);

  return {
    rescuerDeliveryPay,          // → wallet del rescatista
    originalCommissionRefund,    // → wallet del conductor original (desde sistema)
    originalPriorityPenalty,     // → contador de prioridad del conductor original
    isCod,
  };
}

/**
 * El rescatista también falla → cadena de rescate (orden permanece en 'en_rescate').
 * El sistema busca otro rescatista.
 *
 * Flujo:
 *   1. Rescatista que falló: penalización mínima de contador (1 pt).
 *   2. Su comisión queda retenida al 100% (igual que driver/cancelTransit).
 *   3. La orden permanece en en_rescate para el siguiente intento.
 */
function forFailRescuer(order) {
  return {
    // Penalización mínima (reconoce el intento fallido)
    rescuerPriorityPenalty: parseFloat(order.driver_rescue_chain_penalty_points_snapshot || 1),
    // No hay distribución financiera: la orden sigue pendiente de resolución
    isCod: order.payment_method_customer === 'cash_cod',
  };
}

/**
 * Timeout del sistema o max_attempts alcanzado → orden pasa a 'cancelado'.
 * Se aplican las mismas reglas financieras que driver/cancelTransit
 * pero la penalización al conductor original es máxima (igual que abandono).
 *
 * REGLA: En timeout, el conductor original NO recibe reembolso de comisión
 *        (a diferencia del caso forComplete donde sí recibe 70%).
 */
function forTimeout(order) {
  const isCod = order.payment_method_customer === 'cash_cod';
  const fee   = isCod ? parseFloat(order.platform_processing_fee_rate_snapshot || 0) : 0;

  // Comisiones de sede: reembolso estándar
  const storeCommissionRefund = parseFloat(order.store_commission_advance || 0)
    * parseFloat(order.store_commission_refund_rate_snapshot || 0);

  // Comisión del conductor original: retenida (sin reembolso, igual que abandono)
  const driverCommissionRetained = parseFloat(order.driver_commission_advance || 0);

  // Domicilio: el conductor había recogido el pedido → se aplican reglas de en_camino
  const domiCost = parseFloat(order.driver_domi_cost || 0);
  const deliveryCompensation = parseFloat((domiCost * (1 - fee)).toFixed(8));

  // Derivar costo de productos en DOMIs
  const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
  const productsCost = parseFloat((orderTotalDomi - domiCost).toFixed(8));

  // Productos
  const productsToDriver = isCod ? parseFloat((productsCost * (1 - fee)).toFixed(8)) : 0;
  const productsToStore  = isCod ? 0 : productsCost;

  // Penalización máxima al conductor original
  const originalPriorityPenalty = parseFloat(order.driver_penalty_points_transit_snapshot || 3);

  // COD: deuda del cliente (igual que cancelTransit)
  const debtTotal = isCod
    ? parseFloat((
        storeCommissionRefund + driverCommissionRetained
        + deliveryCompensation + productsToDriver
      ).toFixed(8))
    : 0;

  return {
    storeCommissionRefund,
    driverCommissionRetained,
    deliveryCompensation,
    productsToDriver,
    productsToStore,
    originalPriorityPenalty,
    debtTotal,
    isCod,
  };
}

module.exports = { forComplete, forFailRescuer, forTimeout };

