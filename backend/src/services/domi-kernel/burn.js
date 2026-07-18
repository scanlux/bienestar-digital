const db = require('../../config/db');
const protocol = require('./protocol');
const wallets = require('./wallets');
const ledger = require('./ledger');
const domiRedis = require('../domiRedis');
const domiTreasuryEngine = require('../domiTreasuryEngine');

async function burnDomis(conn, walletId, amountDomis, adminUserId) {
  // 1. Verificar si los retiros globales están habilitados
  const [flagRows] = await conn.query("SELECT enabled FROM system_financial_flags WHERE `key` = 'withdrawals_enabled'");
  if (flagRows.length > 0 && flagRows[0].enabled === 0) {
    throw new Error('Los retiros de tokens DOMI estan suspendidos de forma global por el administrador.');
  }

  // 2. Validar solvencia fiduciaria antes del retiro
  const solvencyVal = await domiTreasuryEngine.validateSolvencyBeforeWithdrawal(conn, amountDomis);
  if (!solvencyVal.ok) {
    throw new Error(`Retiro rechazado por insolvencia fiduciaria: ${solvencyVal.detail}`);
  }

  // 3. Contar retiros del mes actual para esta wallet
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const periodoMes = `${year}-${month}`;

  const [countRows] = await conn.query(
    'SELECT COUNT(*) as cnt FROM domi_withdrawal_log WHERE wallet_id = ? AND periodo_mes = ?',
    [walletId, periodoMes]
  );
  const withdrawalsCount = countRows[0].cnt;

  // 4. Obtener reglas y peg
  const rules = await protocol.getProtocolRules(conn);
  const token = await protocol.getTokenRegistry(conn);
  const fiatPeg = parseFloat(token.fiat_peg_cop);

  let isFree = 1;
  let feeCop = 0;
  let feeDomis = 0;

  if (withdrawalsCount >= rules.free_withdrawals_per_month) {
    isFree = 0;
    feeCop = parseFloat(rules.withdrawal_fee_cop);
    feeDomis = parseFloat((feeCop / fiatPeg).toFixed(4));
  }

  const totalDomisDebited = amountDomis + feeDomis;

  // 5. Validar saldo disponible de la wallet
  const [[wallet]] = await conn.query(
    `SELECT balance_custody,
            CASE
              WHEN user_id IS NOT NULL THEN 'user'
              WHEN is_system = 1 THEN 'system'
            END as owner_type,
            user_id as owner_id
     FROM wallets WHERE id = ? FOR UPDATE`,
    [walletId]
  );
  if (!wallet) {
    throw new Error(`Billetera con ID ${walletId} no encontrada.`);
  }

  const balance = parseFloat(wallet.balance_custody);
  if (balance < totalDomisDebited) {
    throw new Error(`Saldo insuficiente en balance_custody. Disponible: ${balance} DOMI. Requerido para retiro + comision: ${totalDomisDebited} DOMI.`);
  }

  // 6. Restar saldo de la wallet
  await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [totalDomisDebited, walletId]);

  // 7. Insertar en domi_withdrawal_log
  const amountCop = amountDomis * fiatPeg;
  await conn.query(
    `INSERT INTO domi_withdrawal_log 
     (wallet_id, amount_domis, amount_cop, peg_at_withdrawal, fee_cop, fee_domis, is_free, periodo_mes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [walletId, amountDomis, amountCop, fiatPeg, feeCop, feeDomis, isFree, periodoMes]
  );

  // 8. Registrar transacciones en el ledger
  const txHash = await ledger.appendLedger(conn, {
    txType: 'burn_manual',
    fromWalletId: walletId,
    toWalletId: null,
    amountDomis,
    amountFiatCop: amountCop,
    referenceType: 'manual',
    referenceId: walletId,
    protocolSnapshot: { rules, token },
    notes: `Retiro de ${amountDomis} DOMIs`
  });

  if (feeDomis > 0) {
    const systemWallet = await wallets.getSystemWallet(conn);
    await conn.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [feeDomis, systemWallet.id]);
    
    await ledger.appendLedger(conn, {
      txType: 'exit_fee',
      fromWalletId: walletId,
      toWalletId: systemWallet.id,
      amountDomis: feeDomis,
      amountFiatCop: feeCop,
      referenceType: 'manual',
      referenceId: walletId,
      protocolSnapshot: { rules, token },
      notes: `Comision fija de retiro excedente (${feeCop} COP)`
    });
  }

  const newBalance = parseFloat((balance - totalDomisDebited).toFixed(8));

  return {
    totalDomisDebited,
    ownerType: wallet.owner_type,
    ownerId: wallet.owner_id,
    txHash,
    newBalance
  };
}

module.exports = {
  burnDomis
};
