const crypto = require('crypto');
const db = require('../../config/db');

async function getProtocolRules(conn) {
  const queryExecutor = conn || db;
  const [rows] = await queryExecutor.query('SELECT * FROM protocol_rules WHERE id = 1');
  if (rows.length === 0) throw new Error('DOMI_ENGINE: protocol_rules no encontrado.');
  return rows[0];
}

async function getTokenRegistry(conn) {
  const queryExecutor = conn || db;
  const [rows] = await queryExecutor.query('SELECT * FROM token_registry WHERE id = 1');
  if (rows.length === 0) throw new Error('DOMI_ENGINE: token_registry no encontrado.');
  return rows[0];
}

async function verifyIntegrity() {
  const conn = await db.getConnection();
  try {
    const token = await getTokenRegistry(conn);
    const expectedPayload = `${token.symbol}|${token.name}|${token.decimals}|${parseFloat(token.fiat_peg_cop).toFixed(4)}|${token.protocol_version}`;
    const expectedHash = crypto.createHash('sha256').update(expectedPayload).digest('hex');
    if (token.integrity_hash !== expectedHash) {
      throw new Error(`DOMI_ENGINE: Integridad comprometida!`);
    }
    console.log('[DOMI] Integridad del token verificada.');
    return true;
  } finally {
    conn.release();
  }
}

async function calculateDeliveryCost(conn, distanceKm) {
  const rules = await getProtocolRules(conn);
  const token = await getTokenRegistry(conn);
  const fiatPeg = parseFloat(token.fiat_peg_cop);

  const baseFareCop = parseFloat(rules.delivery_base_fare_cop || 3100.00);
  const baseDistanceKm = parseFloat(rules.delivery_base_distance_km || 3.00);
  const extraRateCopPerKm = parseFloat(rules.delivery_extra_rate_cop_per_km || 400.00);
  const maxDistanceKm = parseFloat(rules.delivery_max_distance_km || 9.00);

  // Clamp distance Km to max coverage
  const clampedKm = Math.min(distanceKm, maxDistanceKm);

  const deliveryCostCop = clampedKm <= baseDistanceKm
    ? baseFareCop
    : baseFareCop + ((clampedKm - baseDistanceKm) * extraRateCopPerKm);

  const deliveryCostDomi = parseFloat((deliveryCostCop / fiatPeg).toFixed(8));
  return {
    deliveryCostCop: Math.round(deliveryCostCop),
    deliveryCostDomi,
    distanceKmUsed: clampedKm,
    fiatPeg
  };
}

async function calculateOrderCost(orderTotalCop, distanceKm) {
  const conn = await db.getConnection();
  try {
    const rules = await getProtocolRules(conn);
    const token = await getTokenRegistry(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);

    const storeCostDomi = parseFloat((parseFloat(rules.store_fixed_fee_cop) / fiatPeg).toFixed(8));
    const driverCommissionDomi = parseFloat((parseFloat(rules.driver_fixed_fee_cop) / fiatPeg).toFixed(8));

    // Simulation fallback if distanceKm is not provided/null/undefined
    const finalDistanceKm = (distanceKm !== undefined && distanceKm !== null)
      ? parseFloat(distanceKm)
      : parseFloat((parseFloat(rules.delivery_base_distance_km || 3) + Math.random() * (parseFloat(rules.delivery_max_distance_km || 9) - parseFloat(rules.delivery_base_distance_km || 3))).toFixed(2));

    const delivery = await calculateDeliveryCost(conn, finalDistanceKm);
    const maxCashback = parseFloat((driverCommissionDomi * parseFloat(rules.cashback_rate_customer)).toFixed(8));

    return {
      store_cost_domis: storeCostDomi,
      store_cost_cop_snapshot: parseFloat(rules.store_fixed_fee_cop),
      
      // Comisión que la PLATAFORMA cobra al repartidor (fija)
      driver_commission_domis: driverCommissionDomi,
      driver_cost_domis: driverCommissionDomi, // Backward compatibility
      driver_cost_cop_snapshot: parseFloat(rules.driver_fixed_fee_cop),

      // Tarifa de domicilio que el CLIENTE paga al repartidor (dinámica por distancia)
      driver_delivery_cost_domis: delivery.deliveryCostDomi,
      driver_delivery_cost_cop: delivery.deliveryCostCop,
      distance_km_used: delivery.distanceKmUsed,

      max_customer_cashback_domis: maxCashback,
      total_cost_domis: parseFloat((storeCostDomi + delivery.deliveryCostDomi).toFixed(8)),
      fiat_peg_used: fiatPeg,

      // Tasas de reembolso de comisión para cancelaciones
      store_commission_refund_rate_snapshot: parseFloat(rules.customer_cancel_store_commission_refund_dispatch_rate),
      driver_commission_refund_rate_snapshot: parseFloat(rules.customer_cancel_driver_commission_refund_dispatch_rate),
      driver_commission_refund_transit_rate_snapshot: parseFloat(rules.customer_cancel_driver_commission_refund_transit_rate),

      // Nuevos snapshots FSM y Rescate
      driver_rescue_commission_refund_rate_snapshot: parseFloat(rules.driver_rescue_commission_refund_rate),
      driver_rescue_timeout_minutes_snapshot: parseInt(rules.driver_rescue_timeout_minutes),
      driver_rescue_max_attempts_snapshot: parseInt(rules.driver_rescue_max_attempts),
      driver_penalty_points_rescue_original_snapshot: parseInt(rules.driver_penalty_points_rescue_original),
      driver_rescue_chain_penalty_points_snapshot: parseInt(rules.driver_rescue_chain_penalty_points),
      minimum_delivery_rate_snapshot: parseFloat(rules.minimum_delivery_rate),
      store_solvency_delivery_multiplier_snapshot: parseInt(rules.store_solvency_delivery_multiplier),
      solvency_commission_guarantee_fraction_snapshot: parseFloat(rules.solvency_commission_guarantee_fraction),
      store_cancel_client_indemnity_domi_amount_snapshot: parseFloat(rules.store_cancel_client_indemnity_domi_amount),
      store_penalty_points_prep_snapshot: parseInt(rules.store_penalty_points_prep),
      store_penalty_points_dispatch_snapshot: parseInt(rules.store_penalty_points_dispatch),
      driver_penalty_points_prep_snapshot: parseInt(rules.driver_penalty_points_prep),
      driver_penalty_points_dispatch_snapshot: parseInt(rules.driver_penalty_points_dispatch),
      driver_penalty_points_transit_snapshot: parseInt(rules.driver_penalty_points_transit),
      store_cancel_driver_delivery_pct_rate_snapshot: parseFloat(rules.store_cancel_driver_delivery_pct_rate),
      store_cancel_client_indemnity_rate_snapshot: parseFloat(rules.store_cancel_client_indemnity_rate),
      customer_cancel_driver_delivery_pct_dispatch_rate_snapshot: parseFloat(rules.customer_cancel_driver_delivery_pct_dispatch_rate),
      driver_commission_refund_on_store_cancel_rate_snapshot: parseFloat(rules.driver_commission_refund_on_store_cancel_rate),
      score_penalty_cash_cancel_accepted_snapshot: parseInt(rules.score_penalty_cash_cancel_accepted),
      score_penalty_cash_cancel_dispatch_snapshot: parseInt(rules.score_penalty_cash_cancel_dispatch),
      score_penalty_cash_cancel_in_transit_snapshot: parseInt(rules.score_penalty_cash_cancel_in_transit),
      score_penalty_domi_cancel_accepted_snapshot: parseInt(rules.score_penalty_domi_cancel_accepted),
      score_penalty_domi_cancel_dispatch_snapshot: parseInt(rules.score_penalty_domi_cancel_dispatch),
      score_penalty_domi_cancel_in_transit_snapshot: parseInt(rules.score_penalty_domi_cancel_in_transit),
      platform_processing_fee_rate_snapshot: parseFloat(rules.platform_processing_fee_rate)
    };
  } finally {
    conn.release();
  }
}

module.exports = {
  getProtocolRules,
  getTokenRegistry,
  verifyIntegrity,
  calculateDeliveryCost,
  calculateOrderCost
};
