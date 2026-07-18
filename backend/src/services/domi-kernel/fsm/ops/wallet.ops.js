// fsm/ops/wallet.ops.js
// Operaciones atómicas de wallet reutilizables por todos los handlers del FSM.
// Wrappers sobre las queries directas a wallets, con registro en domi_ledger.

const wallets = require('../../wallets');
const ledger  = require('../../ledger');
const domiRedis = require('../../../domiRedis');

/**
 * Acredita saldo disponible (balance_custody) a un wallet de usuario.
 */
async function creditAvailableUser(userId, amountDomis, conn, ledgerMeta = {}) {
  if (amountDomis <= 0) return;
  const wallet = await wallets.getUserWallet(conn, userId);
  await conn.execute(
    'UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?',
    [amountDomis, wallet.id]
  );
  await domiRedis.incrementBalance('user', userId, amountDomis);
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
 * Acredita saldo disponible (balance_custody) a un wallet de sede (store).
 */
async function creditAvailableStore(storeId, amountDomis, conn, ledgerMeta = {}) {
  if (amountDomis <= 0) return;
  const wallet = await wallets.getStoreWallet(conn, storeId);
  await conn.execute(
    'UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?',
    [amountDomis, wallet.id]
  );
  await domiRedis.incrementBalance('store', storeId, amountDomis);
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
 * Debita saldo bloqueado (locked_balance) del cliente.
 */
async function debitLocked(clientUserId, amountToDebit, conn) {
  if (amountToDebit <= 0) return;
  const wallet = await wallets.getUserWallet(conn, clientUserId);
  await conn.execute(
    'UPDATE wallets SET locked_balance = GREATEST(0, locked_balance - ?) WHERE id = ?',
    [amountToDebit, wallet.id]
  );
}

/**
 * Intenta debitar del balance_custody del cliente (COD).
 */
async function tryDebitCustody(clientUserId, amountRequested, conn) {
  if (amountRequested <= 0) return 0;
  const wallet = await wallets.getUserWallet(conn, clientUserId);
  const available = parseFloat(wallet.balance_custody || 0);
  const deducted  = Math.min(available, amountRequested);
  if (deducted > 0) {
    await conn.execute(
      'UPDATE wallets SET balance_custody = GREATEST(0, balance_custody - ?) WHERE id = ?',
      [deducted, wallet.id]
    );
    await domiRedis.incrementBalance('user', clientUserId, -deducted);
  }
  return deducted;
}

/**
 * Intenta debitar del balance_custody de la sede (store).
 *
 * @param {number} storeId
 * @param {number} amountRequested
 * @param {object} conn
 * @returns {Promise<number>} Monto debitado
 */
async function tryDebitStore(storeId, amountRequested, conn) {
  if (amountRequested <= 0) return 0;
  const wallet = await wallets.getStoreWallet(conn, storeId);
  const available = parseFloat(wallet.balance_custody || 0);
  const deducted  = Math.min(available, amountRequested);
  if (deducted > 0) {
    await conn.execute(
      'UPDATE wallets SET balance_custody = GREATEST(0, balance_custody - ?) WHERE id = ?',
      [deducted, wallet.id]
    );
    await domiRedis.incrementBalance('store', storeId, -deducted);
  }
  return deducted;
}

/**
 * Acredita desde el balance del SISTEMA (balance_utility).
 */
async function creditFromSystem(recipientUserId, amountDomis, conn, ledgerMeta = {}) {
  if (amountDomis <= 0) return;
  const systemWallet    = await wallets.getSystemWallet(conn);
  const recipientWallet = await wallets.getUserWallet(conn, recipientUserId);

  await conn.execute(
    'UPDATE wallets SET balance_utility = GREATEST(0, balance_utility - ?) WHERE id = ?',
    [amountDomis, systemWallet.id]
  );
  await conn.execute(
    'UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?',
    [amountDomis, recipientWallet.id]
  );
  await domiRedis.incrementBalance('user', recipientUserId, amountDomis);
  if (ledgerMeta.referenceId) {
    await ledger.appendLedger(conn, {
      txType:           'refund',
      fromWalletId:     systemWallet.id,
      toWalletId:       recipientWallet.id,
      amountDomis,
      referenceType:    'order',
      referenceId:      ledgerMeta.referenceId,
      protocolSnapshot: ledgerMeta.protocolSnapshot || {},
      notes:            ledgerMeta.notes || `Reembolso de comisión del sistema al usuario ${recipientUserId}`,
    });
  }
}

/**
 * Deduce puntos del Score del cliente.
 */
async function deductScore(userId, points, conn) {
  if (!points || points <= 0) return;
  await conn.execute(
    'UPDATE users SET domi_score = GREATEST(0, domi_score - ?) WHERE id = ?',
    [points, userId]
  );
}

module.exports = {
  creditAvailableUser,
  creditAvailableStore,
  debitLocked,
  tryDebitCustody,
  tryDebitStore,
  creditFromSystem,
  deductScore,
};
