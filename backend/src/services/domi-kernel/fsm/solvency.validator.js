// fsm/solvency.validator.js
// Validador de solvencia de los actores antes de interactuar con una orden.
// Ver REGLAS_DE_NEGOCIO.md — Sección 11.
//
// Reglas:
//   - Repartidor: balance_custody >= (products_cost_domi + sum_operational_commissions * 0.5)
//   - Cliente: locked_balance congelado en creación (DOMI: products + delivery)
//     - Para COD/DOMI: no debe tener deudas pendientes (domi_order_debts.status = 'pending')
//   - Sede: balance_custody >= (minimum_delivery_rate * 3 + sum_operational_commissions * 0.5)

const wallets = require('../wallets');
const protocol = require('../protocol');
const debt_ops = require('./ops/debt.ops');

/**
 * Valida si el cliente es solvente para solicitar una orden.
 * Se ejecuta al crear un pedido.
 *
 * @param {number} userId
 * @param {number} totalDomiCost - Costo total en DOMIs (productos + envío) para DOMI; 0 para COD
 * @param {object} conn
 * @returns {Promise<{ eligible: boolean, reason?: string }>}
 */
async function validateClientDomi(userId, totalDomiCost, conn) {
  // 1. Validar que no tenga deudas de Compensación Automática pendientes
  const hasDebt = await debt_ops.hasPendingDebts(userId, conn);
  if (hasDebt) {
    return {
      eligible: false,
      reason: 'El cliente tiene deudas de Compensación Automática pendientes de pago.'
    };
  }

  // 2. Si es pago DOMI, validar que tenga el saldo para congelar
  if (totalDomiCost > 0) {
    const wallet = await wallets.getUserWallet(conn, userId);
    const balance = parseFloat(wallet.balance_custody || 0);
    if (balance < totalDomiCost) {
      return {
        eligible: false,
        reason: `Saldo DOMI insuficiente. Requerido: ${totalDomiCost} DOMIs, Disponible: ${balance} DOMIs.`
      };
    }
  }

  return { eligible: true };
}

/**
 * Valida si un conductor o empresa es solvente para aceptar una asignación.
 * Se ejecuta al aceptar una oferta de reparto.
 *
 * @param {number} driverUserId
 * @param {object} order - Fila de la orden con snapshots
 * @param {object} conn
 * @returns {Promise<{ eligible: boolean, reason?: string }>}
 */
async function validateDriverEligibility(driverUserId, order, conn) {
  const rules = await protocol.getProtocolRules(conn);
  const fiatPeg = parseFloat(order.fiat_peg_snapshot || 400.0);

  // Derivar costo de productos en DOMIs
  const domiCost = parseFloat(order.driver_domi_cost || 0);
  const orderTotalDomi = parseFloat((parseFloat(order.total_cop || 0) / fiatPeg).toFixed(8));
  const productsDomiCost = parseFloat((orderTotalDomi - domiCost).toFixed(8));

  // Comisiones operativas
  const storeFixedFeeDomi = parseFloat(order.store_cost_cop_snapshot || 0) / fiatPeg;
  const driverFixedFeeDomi = parseFloat(order.driver_cost_domi_snapshot || 0);
  const sumCommissions = storeFixedFeeDomi + driverFixedFeeDomi;

  // Fracción de garantía de solvencia (por defecto 0.50)
  const guaranteeFraction = parseFloat(rules.solvency_commission_guarantee_fraction || 0.50);

  // Solvencia requerida = products_domi_cost + comisiones * 0.5
  const requiredDomi = parseFloat((productsDomiCost + sumCommissions * guaranteeFraction).toFixed(8));

  // Resolver wallet del conductor o de la empresa
  let wallet;
  let ownerType = 'user';
  let ownerId = driverUserId;

  if (order.delivery_company_id) {
    ownerType = 'delivery_company';
    ownerId = order.delivery_company_id;
    wallet = await wallets.getDeliveryCompanyWallet(conn, ownerId);
  } else {
    wallet = await wallets.getUserWallet(conn, ownerId);
  }

  const balance = parseFloat(wallet.balance_custody || 0);

  if (balance < requiredDomi) {
    return {
      eligible: false,
      reason: `Saldo de garantía insuficiente. Requerido: ${requiredDomi} DOMIs, Disponible: ${balance} DOMIs.`
    };
  }

  return { eligible: true };
}

/**
 * Valida si la sede cumple con el saldo mínimo para abrir turno activo.
 * Se ejecuta al iniciar sesión o abrir el establecimiento.
 *
 * @param {number} storeId
 * @param {object} conn
 * @returns {Promise<{ eligible: boolean, reason?: string }>}
 */
async function validateStoreSession(storeId, conn) {
  const rules = await protocol.getProtocolRules(conn);
  const token = await protocol.getTokenRegistry(conn);
  const fiatPeg = parseFloat(token.fiat_peg_cop || 400.0);

  const minimumDeliveryRate = parseFloat(rules.minimum_delivery_rate || 3000.0);
  const multiplier = parseFloat(rules.store_solvency_delivery_multiplier || 3.0);
  const guaranteeFraction = parseFloat(rules.solvency_commission_guarantee_fraction || 0.50);

  // Comisiones operativas estimadas base
  const storeFixedFeeDomi = parseFloat(rules.store_fixed_fee_cop || 0) / fiatPeg;
  const driverFixedFeeDomi = parseFloat(rules.driver_fixed_fee_cop || 0) / fiatPeg;
  const sumCommissions = storeFixedFeeDomi + driverFixedFeeDomi;

  // Tarifa mínima de 3 domicilios convertida a DOMI + 50% comisiones operativas
  const deliveryRequiredDomi = (minimumDeliveryRate * multiplier) / fiatPeg;
  const requiredDomi = parseFloat((deliveryRequiredDomi + sumCommissions * guaranteeFraction).toFixed(8));

  const wallet = await wallets.getStoreWallet(conn, storeId);
  const balance = parseFloat(wallet.balance_custody || 0);

  if (balance < requiredDomi) {
    return {
      eligible: false,
      reason: `Saldo mínimo de sede insuficiente para operar. Requerido: ${requiredDomi} DOMIs, Disponible: ${balance} DOMIs.`
    };
  }

  return { eligible: true };
}

module.exports = {
  validateClientDomi,
  validateDriverEligibility,
  validateStoreSession
};
