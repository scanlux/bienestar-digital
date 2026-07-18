// fsm/ops/driver.ops.js
// Resolución del actor domiciliario y gestión del contador de prioridad.
// Ver REGLAS_DE_NEGOCIO.md §7 — Resolución del Actor Domiciliario.

const wallets   = require('../../wallets');
const wallet_ops = require('./wallet.ops');
const ledger    = require('../../ledger');
const domiRedis = require('../../../domiRedis');

/**
 * Resuelve qué wallet recibe los pagos del repartidor.
 * Si la orden tiene empresa de delivery afiliada → wallet de la empresa.
 * Si no → wallet personal del conductor.
 *
 * @param {object} order - Fila completa de la orden
 * @returns {{ ownerType: string, ownerId: number }}
 */
function resolveDriverWallet(order) {
  if (order.delivery_company_id) {
    return { ownerType: 'delivery_company', ownerId: order.delivery_company_id };
  }
  return { ownerType: 'user', ownerId: order.driver_user_id };
}

/**
 * Resuelve la wallet del rescatista.
 *
 * @param {object} order
 * @returns {{ ownerType: 'user', ownerId: number }}
 */
function resolveRescuerWallet(order) {
  return { ownerType: 'user', ownerId: order.rescue_driver_id };
}

/**
 * Acredita al wallet del actor domiciliario correcto (conductor o empresa).
 */
async function creditDriver(order, amountDomis, conn, ledgerMeta = {}) {
  if (amountDomis <= 0) return;
  const { ownerType, ownerId } = resolveDriverWallet(order);
  await _creditByType(ownerType, ownerId, amountDomis, conn, ledgerMeta);
}

/**
 * Acredita al rescatista activo.
 */
async function creditRescuer(order, amountDomis, conn, ledgerMeta = {}) {
  if (amountDomis <= 0) return;
  await wallet_ops.creditAvailableUser(order.rescue_driver_id, amountDomis, conn, ledgerMeta);
}

/**
 * Intenta debitar del balance disponible del conductor o de la empresa de reparto.
 * Devuelve cuánto se pudo efectivamente debitar.
 *
 * @param {object} order
 * @param {number} amountRequested
 * @param {object} conn
 * @returns {Promise<number>} Monto debitado
 */
async function tryDebitDriver(order, amountRequested, conn) {
  if (amountRequested <= 0) return 0;
  const { ownerType, ownerId } = resolveDriverWallet(order);

  let wallet;
  if (ownerType === 'delivery_company') {
    wallet = await wallets.getDeliveryCompanyWallet(conn, ownerId);
  } else {
    wallet = await wallets.getUserWallet(conn, ownerId);
  }

  const available = parseFloat(wallet.balance_custody || 0);
  const deducted  = Math.min(available, amountRequested);

  if (deducted > 0) {
    await conn.execute(
      'UPDATE wallets SET balance_custody = GREATEST(0, balance_custody - ?) WHERE id = ?',
      [deducted, wallet.id]
    );
    await domiRedis.incrementBalance(ownerType, ownerId, -deducted);
  }

  return deducted;
}

/**
 * Suma puntos al contador de penalización de prioridad del conductor.
 */
async function addPriorityPenalty(order, points, conn) {
  if (!points || points <= 0) return;
  const { ownerType, ownerId } = resolveDriverWallet(order);

  if (ownerType === 'user') {
    await conn.execute(
      `UPDATE driver_priority_counters
       SET    penalty_points = penalty_points + ?
       WHERE  owner_type = 'user' AND owner_id = ?`,
      [points, ownerId]
    );
  } else {
    await conn.execute(
      `UPDATE driver_priority_counters
       SET    penalty_points = penalty_points + ?
       WHERE  owner_type = 'delivery_company' AND owner_id = ?`,
      [points, ownerId]
    );
  }
}

/**
 * Limpia los campos de rescate de la orden tras resolución.
 */
async function clearRescueFields(orderId, conn) {
  await conn.execute(
    `UPDATE orders
     SET    rescue_driver_id = NULL,
            rescue_attempt_count = 0,
            rescue_started_at = NULL
     WHERE  id = ?`,
    [orderId]
  );
}

/**
 * Incrementa rescue_attempt_count y actualiza rescue_driver_id.
 */
async function assignRescuer(orderId, rescuerUserId, conn) {
  await conn.execute(
    `UPDATE orders
     SET    rescue_driver_id     = ?,
            rescue_attempt_count = rescue_attempt_count + 1,
            rescue_started_at    = COALESCE(rescue_started_at, NOW(6))
     WHERE  id = ?`,
    [rescuerUserId, orderId]
  );
}

// Helpers internos

async function _creditByType(ownerType, ownerId, amountDomis, conn, ledgerMeta) {
  let wallet;
  if (ownerType === 'delivery_company') {
    wallet = await wallets.getDeliveryCompanyWallet(conn, ownerId);
  } else {
    wallet = await wallets.getUserWallet(conn, ownerId);
  }

  await conn.execute(
    'UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?',
    [amountDomis, wallet.id]
  );
  await domiRedis.incrementBalance(ownerType, ownerId, amountDomis);

  if (ledgerMeta.referenceId) {
    await ledger.appendLedger(conn, {
      txType:           'transfer',
      fromWalletId:     null,
      toWalletId:       wallet.id,
      amountDomis,
      referenceType:    'order',
      referenceId:      ledgerMeta.referenceId,
      protocolSnapshot: ledgerMeta.protocolSnapshot || {},
      notes:            ledgerMeta.notes || null,
    });
  }
}

/**
 * Acredita al conductor (o empresa) desde la billetera de utilidad del sistema.
 *
 * @param {object} order
 * @param {number} amountDomis
 * @param {object} conn
 * @param {object} ledgerMeta
 */
async function creditDriverFromSystem(order, amountDomis, conn, ledgerMeta = {}) {
  if (amountDomis <= 0) return;
  const { ownerType, ownerId } = resolveDriverWallet(order);
  const systemWallet = await wallets.getSystemWallet(conn);

  let wallet;
  if (ownerType === 'delivery_company') {
    wallet = await wallets.getDeliveryCompanyWallet(conn, ownerId);
  } else {
    wallet = await wallets.getUserWallet(conn, ownerId);
  }

  await conn.execute(
    'UPDATE wallets SET balance_utility = GREATEST(0, balance_utility - ?) WHERE id = ?',
    [amountDomis, systemWallet.id]
  );
  await conn.execute(
    'UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?',
    [amountDomis, wallet.id]
  );
  await domiRedis.incrementBalance(ownerType, ownerId, amountDomis);

  if (ledgerMeta.referenceId) {
    await ledger.appendLedger(conn, {
      txType:           'transfer',
      fromWalletId:     systemWallet.id,
      toWalletId:       wallet.id,
      amountDomis,
      referenceType:    'order',
      referenceId:      ledgerMeta.referenceId,
      protocolSnapshot: ledgerMeta.protocolSnapshot || {},
      notes:            ledgerMeta.notes || null,
    });
  }
}

module.exports = {
  resolveDriverWallet,
  resolveRescuerWallet,
  creditDriver,
  creditRescuer,
  tryDebitDriver,
  addPriorityPenalty,
  clearRescueFields,
  assignRescuer,
  creditDriverFromSystem,
};
