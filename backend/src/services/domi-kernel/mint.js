const db = require('../../config/db');
const protocol = require('./protocol');
const wallets = require('./wallets');
const ledger = require('./ledger');
const domiRedis = require('../domiRedis');

async function mintDomis(ownerType, ownerId, fiatAmount, paymentRef, isConfirmed = true, confirmedBy = null, vaultTxId = null, externalConn = null) {
  const conn = externalConn || await db.getConnection();
  const isInternalTx = !externalConn;
  try {
    if (isInternalTx) {
      await conn.beginTransaction();
    }

    // Verificación de idempotencia ANTES de cualquier operación
    if (paymentRef) {
      const [existing] = await conn.query(
        'SELECT id, domis_purchased, status FROM domi_packages WHERE payment_ref = ? LIMIT 1',
        [paymentRef]
      );
      if (existing.length > 0) {
        // Pago ya procesado — retornar respuesta idempotente sin crear duplicado
        console.log(`[DOMI] Mint idempotente: paymentRef '${paymentRef}' ya existe (pkg #${existing[0].id}). Retornando resultado original.`);
        if (isInternalTx) {
          await conn.rollback();
        }
        return { 
          packageId: existing[0].id, 
          domis: parseFloat(existing[0].domis_purchased), 
          fiatAmount, 
          exchangeRate: null, 
          idempotent: true 
        };
      }
    }

    const token = await protocol.getTokenRegistry(conn);
    const rules = await protocol.getProtocolRules(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);
    const domis = parseFloat((fiatAmount / fiatPeg).toFixed(4));

    const wallet = ownerType === 'store'
      ? await wallets.getStoreWallet(conn, ownerId)
      : ownerType === 'commerce'
        ? await wallets.getCommerceWallet(conn, ownerId)
        : await wallets.getUserWallet(conn, ownerId);

    // Validacion Anti-Ballenas en compra (mint)
    if (wallet.tier === 'standard') {
      const currentBalance = parseFloat(wallet.balance_custody || 0);
      const maxLimit = parseFloat(wallet.max_balance_domi || 6500.00000000);
      if (currentBalance + domis > maxLimit) {
        if (wallet.excess_purchase_approved === 1) {
          await conn.query('UPDATE wallets SET excess_purchase_approved = 0 WHERE id = ?', [wallet.id]);
        } else {
          throw new Error(`DOMI: La compra excede el limite maximo de saldo para usuarios estandar (${maxLimit} DOMI). Requiere aprobacion de gerencia.`);
        }
      }
    }

    const [pkgResult] = await conn.query(`
      INSERT INTO domi_packages (
        store_id, wallet_id, domis_purchased, fiat_paid_cop, 
        exchange_rate, payment_ref, status, is_confirmed, confirmed_at, confirmed_by, vault_tx_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ownerType === 'store' ? ownerId : null, 
      wallet.id, 
      domis, 
      fiatAmount, 
      fiatPeg, 
      paymentRef || null, 
      isConfirmed ? 'confirmado' : 'pendiente',
      isConfirmed ? 1 : 0,
      isConfirmed ? new Date() : null,
      confirmedBy,
      vaultTxId
    ]);
    const packageId = pkgResult.insertId;

    await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [domis, wallet.id]);

    await ledger.appendLedger(conn, {
      txType: 'mint', fromWalletId: null, toWalletId: wallet.id,
      amountDomis: domis, amountFiatCop: fiatAmount,
      referenceType: 'package', referenceId: packageId,
      protocolSnapshot: { token, rules },
      notes: `Mint ${domis} DOMI para ${ownerType} #${ownerId}`
    });

    if (isInternalTx) {
      await conn.commit();
      
      // Sincronizar Caché de Redis (solo si finalizamos transacción interna aquí)
      await domiRedis.incrementBalance(ownerType, ownerId, domis);
    }
    
    console.log(`[DOMI] Mint: ${domis} DOMI para ${ownerType} #${ownerId} (Paquete #${packageId}, confirmado=${isConfirmed})`);
    return { packageId, domis, fiatAmount, exchangeRate: fiatPeg };
  } catch (err) {
    if (isInternalTx) {
      await conn.rollback();
    }
    throw err;
  } finally {
    if (isInternalTx) {
      conn.release();
    }
  }
}

module.exports = {
  mintDomis
};
