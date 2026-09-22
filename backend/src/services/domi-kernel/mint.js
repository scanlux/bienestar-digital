const db = require('../../config/db');
const protocol = require('./protocol');
const { resolveWallet } = require('./wallet-resolver');
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
    let existingPackageId = null;
    if (paymentRef) {
      const [existing] = await conn.query(
        'SELECT id, domis_purchased, status FROM domi_packages WHERE payment_ref = ? LIMIT 1',
        [paymentRef]
      );
      if (existing.length > 0) {
        if (existing[0].status === 'confirmado') {
          // Pago ya procesado — retornar respuesta idempotente sin crear duplicado
          console.log(`[DOMI] Mint idempotente: paymentRef '${paymentRef}' ya está confirmado (pkg #${existing[0].id}). Retornando resultado original.`);
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
        } else if (existing[0].status === 'pendiente') {
          existingPackageId = existing[0].id;
        }
      }
    }

    const token = await protocol.getTokenRegistry(conn);
    const rules = await protocol.getProtocolRules(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);
    const domis = parseFloat((fiatAmount / fiatPeg).toFixed(4));

    const wallet = await resolveWallet(conn, ownerType, ownerId);

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

    let packageId;
    if (existingPackageId) {
      await conn.query(`
        UPDATE domi_packages SET 
          status = ?, is_confirmed = ?, confirmed_at = ?, confirmed_by = ?, vault_tx_id = ?, fiat_paid_cop = ?, exchange_rate = ?
        WHERE id = ?
      `, [
        isConfirmed ? 'confirmado' : 'pendiente',
        isConfirmed ? 1 : 0,
        isConfirmed ? new Date() : null,
        confirmedBy,
        vaultTxId,
        fiatAmount,
        fiatPeg,
        existingPackageId
      ]);
      packageId = existingPackageId;
    } else {
      const [pkgResult] = await conn.query(`
        INSERT INTO domi_packages (
          store_id, wallet_id, owner_entity_type, owner_entity_id, domis_purchased, fiat_paid_cop, 
          exchange_rate, payment_ref, status, is_confirmed, confirmed_at, confirmed_by, vault_tx_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ownerType === 'store' ? ownerId : null, 
        wallet.id, 
        ownerType,
        ownerId,
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
      packageId = pkgResult.insertId;
    }

    await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [domis, wallet.id]);

    await ledger.appendLedger(conn, {
      txType: 'mint', fromWalletId: null, toWalletId: wallet.id,
      amountDomis: domis, amountFiatCop: fiatAmount,
      referenceType: 'package', referenceId: packageId,
      protocolSnapshot: { 
        token, 
        rules,
        resolution_path: {
          owner_type_received: ownerType,
          resolver_used: 'resolveWallet',
          entity_id: ownerId,
          wallet_id: wallet.id
        }
      },
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

async function quarantineMint(ownerType, ownerId, fiatAmount, paymentRef, errorMsg, externalConn = null) {
  const conn = externalConn || await db.getConnection();
  const isInternalTx = !externalConn;
  try {
    if (isInternalTx) {
      await conn.beginTransaction();
    }

    const token = await protocol.getTokenRegistry(conn);
    const rules = await protocol.getProtocolRules(conn);
    const fiatPeg = parseFloat(token.fiat_peg_cop);
    const domis = parseFloat((fiatAmount / fiatPeg).toFixed(4));

    // 1. Obtener la wallet de cuarentena
    const [qWallets] = await conn.query('SELECT * FROM wallets WHERE is_quarantine = 1 LIMIT 1');
    if (qWallets.length === 0) {
      throw new Error('DOMI_ENGINE_FATAL: Billetera de cuarentena no encontrada.');
    }
    const quarantineWallet = qWallets[0];

    // 2. Buscar si existe el paquete
    let packageId;
    let existingPackage = null;
    if (paymentRef) {
      const [existing] = await conn.query(
        'SELECT id, status FROM domi_packages WHERE payment_ref = ? LIMIT 1',
        [paymentRef]
      );
      if (existing.length > 0) {
        existingPackage = existing[0];
      }
    }

    if (existingPackage) {
      await conn.query(`
        UPDATE domi_packages SET 
          wallet_id = ?, status = 'confirmado', is_confirmed = 1, confirmed_at = NOW(), fiat_paid_cop = ?, exchange_rate = ?
        WHERE id = ?
      `, [
        quarantineWallet.id,
        fiatAmount,
        fiatPeg,
        existingPackage.id
      ]);
      packageId = existingPackage.id;
    } else {
      const [pkgResult] = await conn.query(`
        INSERT INTO domi_packages (
          store_id, wallet_id, owner_entity_type, owner_entity_id, domis_purchased, fiat_paid_cop, 
          exchange_rate, payment_ref, status, is_confirmed, confirmed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmado', 1, NOW())
      `, [
        ownerType === 'store' ? ownerId : null,
        quarantineWallet.id,
        ownerType,
        ownerId,
        domis,
        fiatAmount,
        fiatPeg,
        paymentRef || null
      ]);
      packageId = pkgResult.insertId;
    }

    // 3. Acreditar saldo a la wallet de cuarentena
    await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [domis, quarantineWallet.id]);

    // 4. Registrar movimiento en el Ledger (Libro Mayor)
    await ledger.appendLedger(conn, {
      txType: 'mint', fromWalletId: null, toWalletId: quarantineWallet.id,
      amountDomis: domis, amountFiatCop: fiatAmount,
      referenceType: 'package', referenceId: packageId,
      protocolSnapshot: { 
        token, 
        rules,
        resolution_path: {
          owner_type_received: ownerType,
          entity_id: ownerId,
          wallet_id: quarantineWallet.id,
          is_quarantined: true,
          quarantine_reason: errorMsg
        }
      },
      notes: `Mint en cuarentena por fallo: ${errorMsg}`
    });

    if (isInternalTx) {
      await conn.commit();
    }

    console.warn(`[DOMI] Depósito enviado a cuarentena: ${domis} DOMI. Referencia: ${paymentRef}. Motivo: ${errorMsg}`);
    return { packageId, domis, fiatAmount, exchangeRate: fiatPeg, quarantined: true };
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
  mintDomis,
  quarantineMint
};
