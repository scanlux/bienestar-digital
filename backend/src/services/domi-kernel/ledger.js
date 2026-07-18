const crypto = require('crypto');
const db = require('../../config/db');

async function generateTxHash(conn, txType, fromWalletId, toWalletId, amount, referenceId) {
  const walletId = fromWalletId || toWalletId;
  let nonce = 0;
  if (walletId) {
    await conn.query('UPDATE wallets SET tx_nonce = tx_nonce + 1 WHERE id = ?', [walletId]);
    const [[w]] = await conn.query('SELECT tx_nonce FROM wallets WHERE id = ?', [walletId]);
    nonce = w.tx_nonce;
  }
  const payload = `${txType}|${fromWalletId || 'null'}|${toWalletId || 'null'}|${amount}|${referenceId}|${nonce}`;
  return { hash: crypto.createHash('sha256').update(payload).digest('hex'), nonce };
}

async function appendLedger(conn, { txType, fromWalletId, toWalletId, amountDomis, amountFiatCop, referenceType, referenceId, protocolSnapshot, notes }) {
  const walletId = fromWalletId || toWalletId;
  let prevTxHash = null;
  if (walletId) {
    const [[lastTx]] = await conn.query(
      'SELECT tx_hash FROM domi_ledger WHERE (from_wallet_id = ? OR to_wallet_id = ?) ORDER BY id DESC LIMIT 1',
      [walletId, walletId]
    );
    prevTxHash = lastTx?.tx_hash || null;
  }

  const { hash: txHash, nonce } = await generateTxHash(conn, txType, fromWalletId, toWalletId, amountDomis, referenceId);

  await conn.query(`
    INSERT INTO domi_ledger 
    (tx_hash, prev_tx_hash, nonce, tx_type, from_wallet_id, to_wallet_id, amount_domis, amount_fiat_cop, reference_type, reference_id, protocol_snapshot, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [txHash, prevTxHash, nonce, txType, fromWalletId || null, toWalletId || null, amountDomis, amountFiatCop || null, referenceType, referenceId, JSON.stringify(protocolSnapshot), notes || null]);
  return txHash;
}

module.exports = {
  generateTxHash,
  appendLedger
};
