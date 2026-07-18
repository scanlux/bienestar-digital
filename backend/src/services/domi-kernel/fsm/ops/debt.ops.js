// fsm/ops/debt.ops.js
// Registro de Compensación Automática (deudas en domi_order_debts y domi_store_debts).
// Centraliza toda la creación de deudas del FSM.

/**
 * Crea un registro de deuda en domi_order_debts.
 *
 * @param {object} params
 * @param {number}  params.orderId
 * @param {number}  params.debtorId                   - ID del usuario deudor (cliente o repartidor)
 * @param {string}  params.beneficiaryType            - 'store' | 'driver' | 'system'
 * @param {number|null} params.beneficiaryId          - ID del beneficiario
 * @param {number}  params.amountDomis                - Monto de la deudda en DOMIs
 * @param {number}  params.fiatPeg                    - Paridad fiat peg
 * @param {number}  [params.originalServiceFeeDomis]  - Comisión original si aplica
 * @param {number}  [params.refundedServiceFeeDomis]  - Comisión devuelta si aplica
 * @param {object}  conn
 * @returns {Promise<number>} ID de la deuda insertada
 */
async function create({
  orderId,
  debtorId,
  beneficiaryType,
  beneficiaryId = null,
  amountDomis,
  fiatPeg,
  originalServiceFeeDomis = 0,
  refundedServiceFeeDomis = 0,
  metadata = null
}, conn) {
  if (!amountDomis || amountDomis <= 0) return null;

  const [result] = await conn.execute(
    `INSERT INTO domi_order_debts (
      order_id, customer_user_id, beneficiary_type, beneficiary_id,
      amount_domis, fiat_peg_at_cancellation, original_service_fee_domis, refunded_service_fee_domis,
      status, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(6))`,
    [
      orderId,
      debtorId,
      beneficiaryType,
      beneficiaryId,
      amountDomis,
      fiatPeg,
      originalServiceFeeDomis,
      refundedServiceFeeDomis,
      metadata ? JSON.stringify(metadata) : null
    ]
  );

  return result.insertId;
}

/**
 * Crea un registro de deuda en domi_store_debts (deudas que la sede/tienda debe al conductor o al sistema).
 *
 * @param {object} params
 * @param {number}  params.orderId
 * @param {number}  params.storeId
 * @param {string}  params.beneficiaryType   - 'driver' | 'system'
 * @param {number|null} params.beneficiaryId - ID del beneficiario (driverUserId o null)
 * @param {number}  params.amountDomis
 * @param {number}  params.fiatPeg
 * @param {object}  conn
 * @returns {Promise<number>} ID de la deuda insertada
 */
async function createStoreDebt({
  orderId,
  storeId,
  beneficiaryType,
  beneficiaryId = null,
  amountDomis,
  fiatPeg
}, conn) {
  if (!amountDomis || amountDomis <= 0) return null;

  const [result] = await conn.execute(
    `INSERT INTO domi_store_debts (
      order_id, store_id, beneficiary_type, beneficiary_id,
      amount_domis, fiat_peg_at_cancellation, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(6))`,
    [
      orderId,
      storeId,
      beneficiaryType,
      beneficiaryId,
      amountDomis,
      fiatPeg
    ]
  );

  return result.insertId;
}

/**
 * Marca una deuda de cliente/driver como pagada.
 */
async function markPaid(debtId, conn) {
  await conn.execute(
    `UPDATE domi_order_debts
     SET status = 'paid', paid_at = NOW(6)
     WHERE id = ?`,
    [debtId]
  );
}

/**
 * Verifica si un usuario tiene deudas activas pendientes.
 */
async function hasPendingDebts(userId, conn) {
  const [rows] = await conn.execute(
    `SELECT id FROM domi_order_debts
     WHERE customer_user_id = ? AND status = 'pending'
     LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}

module.exports = { create, createStoreDebt, markPaid, hasPendingDebts };
