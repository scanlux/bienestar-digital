const crypto = require('crypto');
const db = require('../config/db');
const domiEngine = require('./domiEngine');

/**
 * Obtiene el score actual del cliente.
 */
async function resolveScore(customerId, conn) {
  const [rows] = await conn.query('SELECT domi_score FROM users WHERE id = ?', [customerId]);
  if (rows.length === 0) return 0;
  return rows[0].domi_score;
}

/**
 * Genera un número pseudo-aleatorio entre 0 y 1 a partir de una semilla string.
 * Evita el uso de Math.random() para cumplir con estándares crypto-readiness y determinismo.
 */
function getPseudoRandom(seedString) {
  const hash = crypto.createHash('sha256').update(seedString).digest('hex');
  const intVal = parseInt(hash.substring(0, 8), 16);
  return intVal / 4294967295;
}

/**
 * Simula la ruleta de cashback ponderada por score y determina el monto ganado.
 */
async function rollCashback(customerId, maxCashbackDomi, scoreScore, orderId, conn) {
  const [rulesRows] = await conn.query('SELECT score_min_for_cashback FROM protocol_rules WHERE id = 1');
  const minScore = rulesRows.length > 0 ? rulesRows[0].score_min_for_cashback : 0;

  if (scoreScore < minScore) {
    return 0;
  }

  const seed = `${orderId}_${customerId}_${scoreScore}`;
  const winRoll = getPseudoRandom(seed + '_win');
  
  // Probabilidad de ganar: 10% base + hasta 40% según score (máximo 50% de probabilidad, mínimo 10% base)
  const winProbability = Math.max(0.10, Math.min(0.50, 0.10 + (scoreScore / 100) * 0.40));

  if (winRoll > winProbability) {
    return 0; // No ganó en esta tirada
  }

  // Fracción ganada: entre 5% y 100% del maxCashback, escalado por score
  const amountRoll = getPseudoRandom(seed + '_amount');
  const scoreMultiplier = Math.max(0.05, Math.min(1.0, 0.05 + (scoreScore / 100) * 0.95));
  const cashbackDomi = parseFloat((maxCashbackDomi * amountRoll * scoreMultiplier).toFixed(8));

  return Math.min(cashbackDomi, maxCashbackDomi);
}

/**
 * Acredita el cashback en la wallet del cliente y registra la transacción en el ledger.
 */
async function awardCashback(customerId, cashbackDomi, orderId, conn) {
  if (cashbackDomi <= 0) return;

  // 1. Obtener la wallet del cliente
  const [walletRows] = await conn.query("SELECT id, balance_utility FROM wallets WHERE user_id = ?", [customerId]);
  if (walletRows.length === 0) {
    throw new Error(`Billetera del cliente id ${customerId} no encontrada para acreditar cashback.`);
  }
  const clientWallet = walletRows[0];

  // 2. Obtener la wallet del sistema
  const [systemWalletRows] = await conn.query("SELECT id, balance_utility FROM wallets WHERE is_system = 1");
  if (systemWalletRows.length === 0) {
    throw new Error("Billetera del sistema no encontrada para debitar cashback.");
  }
  const systemWallet = systemWalletRows[0];

  // 3. Acreditar al cliente y debitar al sistema
  await conn.query(
    'UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?',
    [cashbackDomi, clientWallet.id]
  );
  await conn.query(
    'UPDATE wallets SET balance_utility = balance_utility - ? WHERE id = ?',
    [cashbackDomi, systemWallet.id]
  );

  // 4. Registrar la transaccion en el ledger a traves del motor
  const rules = await domiEngine.getProtocolRules(conn);
  const token = await domiEngine.getTokenRegistry(conn);

  await domiEngine.appendLedger(conn, {
    txType: 'cashback',
    fromWalletId: systemWallet.id,
    toWalletId: clientWallet.id,
    amountDomis: cashbackDomi,
    referenceType: 'order',
    referenceId: orderId,
    protocolSnapshot: { rules, token },
    notes: `Cashback acreditado por pedido #${orderId} (ruleta de score)`
  });

  // 5. Registrar en orders el cashback ganado
  await conn.query(
    'UPDATE orders SET customer_cashback_domi = ? WHERE id = ?',
    [cashbackDomi, orderId]
  );
}

/**
 * Incrementa o decrementa el score del cliente.
 */
async function incrementScore(customerId, delta, conn) {
  await conn.query(
    'UPDATE users SET domi_score = GREATEST(-100, LEAST(100, CAST(domi_score AS SIGNED) + ?)) WHERE id = ?',
    [delta, customerId]
  );
}

module.exports = {
  resolveScore,
  rollCashback,
  awardCashback,
  incrementScore
};
