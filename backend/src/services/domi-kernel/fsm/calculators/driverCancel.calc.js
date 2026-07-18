// fsm/calculators/driverCancel.calc.js
// FUNCIONES PURAS: cálculos para cuando el REPARTIDOR cancela.
// Ver MATRIZ_CANCELACIONES_REPARTIDOR.md — Secciones A y B.
//
// REGLA KEY: Cancelar en preparando/listo/listo_despacho NO cancela la orden.
//            El pedido vuelve a 'listo'. Solo hay penalización de contador de prioridad.
//            NO hay cargo financiero al repartidor en estos estados.
//
// REGLA KEY: En en_camino, el repartidor ya tomó el producto.
//            COD: el conductor pagó en efectivo a la sede → el sistema gestiona el reembolso.

/**
 * Estado: preparando / listo
 * REGLA: Sin cargo financiero. Solo penalización de contador de prioridad.
 * El pedido retrocede a 'listo'. El cliente no se ve afecto.
 */
function forPreparation(order) {
  return {
    priorityPenaltyPoints: parseFloat(order.driver_penalty_points_prep_snapshot || 0),
    storeCommissionRefund:  0,
    driverCommissionRefund: 0,
    debtTotal:              0,
    isCod:                  order.payment_method_customer === 'cash_cod',
  };
}

/**
 * Estado: listo_despacho
 * REGLA: Sin cargo financiero directo. Mayor penalización de contador.
 * El pedido retrocede a 'listo'.
 */
function forDispatch(order) {
  return {
    priorityPenaltyPoints: parseFloat(order.driver_penalty_points_dispatch_snapshot || 0),
    storeCommissionRefund:  0,
    driverCommissionRefund: 0,
    debtTotal:              0,
    isCod:                  order.payment_method_customer === 'cash_cod',
  };
}

/**
 * Estado: en_camino (abandono voluntario)
 * REGLA COD:
 *   - Conductor pagó en efectivo a la sede. Sede está a salvo.
 *   - Conductor recibe cargo de 3% del producto: 2% va al cliente como bono, 1% al sistema.
 *   - Comisión del repartidor retenida al 100%.
 *   - Penalización de prioridad: +3 pts.
 * REGLA DOMI:
 *   - Cliente es reembolsado 100% de productos y domicilio del locked_balance.
 *   - Conductor compensa a la sede con el 100% del valor de los productos.
 *   - Comisión del repartidor retenida al 100%.
 *   - Penalización de prioridad: +3 pts.
 */
function forTransit(order) {
  const isCod = order.payment_method_customer === 'cash_cod';

  // Penalización de prioridad del conductor
  const priorityPenaltyPoints = parseFloat(order.driver_penalty_points_transit_snapshot || 3);

  // Comisión retenida sin reembolso
  const driverCommissionRetained = parseFloat(order.driver_commission_advance || 0);

  // Derivar costo de productos en DOMIs
  const domiCost = parseFloat(order.driver_domi_cost || 0);
  const peg = parseFloat(order.fiat_peg_snapshot || 1.0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / peg).toFixed(8));
  const productsCost = parseFloat((orderTotalDomi - domiCost).toFixed(8));

  let productsToClient = 0;
  let productsToStore = 0;
  let driverProductPenalty = 0;
  let sysRetain = 0;

  if (isCod) {
    productsToClient = parseFloat((productsCost * 0.02).toFixed(8));
    driverProductPenalty = parseFloat((productsCost * 0.03).toFixed(8));
    sysRetain = parseFloat((productsCost * 0.01).toFixed(8));
  } else {
    // Reembolso del locked_balance completo (productos + domicilio)
    productsToClient = orderTotalDomi; 
    productsToStore = productsCost;
    driverProductPenalty = productsCost;
  }

  return {
    priorityPenaltyPoints,
    driverCommissionRetained,
    productsToClient,
    productsToStore,
    driverProductPenalty,
    sysRetain,
    isCod,
  };
}

module.exports = { forPreparation, forDispatch, forTransit };
