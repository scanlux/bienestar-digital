const db = require('../../../config/db');
const domiEngine = require('../../../services/domiEngine');
const domiRedis = require('../../../services/domiRedis');
const { BusinessError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const { assertWalletAccess } = require('../guards/WalletAccessGuard');

class TransferDomis {
  async execute(userContext, data, req) {
    const { fromType, fromId, toType, toId, toAlias, amountDomis } = data;

    if (amountDomis <= 0) {
      throw new BusinessError('El monto a transferir debe ser mayor a cero.');
    }

    // 1. BOLA Check on the sender (from)
    await assertWalletAccess(userContext, fromType, fromId, 'transferir desde billetera', req);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Obtener billetera de origen utilizando helper de domiEngine
      const fromWallet = fromType === 'store'
        ? await domiEngine.getStoreWallet(conn, fromId)
        : fromType === 'commerce'
          ? await domiEngine.getCommerceWallet(conn, fromId)
          : await domiEngine.getUserWallet(conn, fromId);

      let toWallet;
      let resolvedToType = toType;
      let resolvedToId = toId;

      if (toAlias) {
        // Resolver alias
        const [aliasRows] = await conn.query('SELECT wallet_id FROM wallet_aliases WHERE alias = ?', [toAlias]);
        if (aliasRows.length === 0) {
          throw new BusinessError(`El alias "${toAlias}" no está registrado en el sistema.`);
        }
        const targetWalletId = aliasRows[0].wallet_id;
        const [walletRows] = await conn.query(
          `SELECT *, 
                  CASE
                    WHEN user_id IS NOT NULL THEN 'user'
                    WHEN commerce_id IS NOT NULL THEN 'commerce'
                    WHEN store_id IS NOT NULL THEN 'store'
                    WHEN delivery_company_id IS NOT NULL THEN 'delivery_company'
                    WHEN is_system = 1 THEN 'system'
                  END as owner_type,
                  COALESCE(user_id, commerce_id, store_id, delivery_company_id) as owner_id
           FROM wallets WHERE id = ?`,
          [targetWalletId]
        );
        if (walletRows.length === 0) {
          throw new BusinessError('La billetera de destino asociada al alias no existe.');
        }
        toWallet = walletRows[0];
        resolvedToType = toWallet.owner_type;
        resolvedToId = toWallet.owner_id;
      } else {
        if (!toType || !toId) {
          throw new BusinessError('Debe especificar el destinatario (tipo e ID) o el alias.');
        }
        toWallet = toType === 'store'
          ? await domiEngine.getStoreWallet(conn, toId)
          : toType === 'commerce'
            ? await domiEngine.getCommerceWallet(conn, toId)
            : await domiEngine.getUserWallet(conn, toId);
      }

      if (fromWallet.id === toWallet.id) {
        throw new BusinessError('No se puede transferir a la misma billetera.');
      }

      // Validar saldo suficiente
      const balance = parseFloat(fromWallet.balance_custody);
      if (balance < amountDomis) {
        throw new BusinessError(`Saldo insuficiente. Disponible: ${balance} DOMI, Requerido: ${amountDomis} DOMI.`);
      }

      // Obtener reglas y token para el snapshot
      const rules = await domiEngine.getProtocolRules(conn);
      const token = await domiEngine.getTokenRegistry(conn);
      const protocolSnapshot = { token, rules };
      const fiatPeg = parseFloat(token.fiat_peg_cop || 1000.00);
      const amountFiatCop = amountDomis * fiatPeg;

      // Descontar del origen, sumar al destino
      await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [amountDomis, fromWallet.id]);
      await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [amountDomis, toWallet.id]);

      // Registrar transaccion en el ledger central de forma deterministica
      const txHash = await domiEngine.appendLedger(conn, {
        txType: 'transfer',
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amountDomis,
        amountFiatCop,
        referenceType: 'manual',
        referenceId: fromId,
        protocolSnapshot,
        notes: `Transferencia de ${amountDomis} DOMI de ${fromType} #${fromId} a ${resolvedToType} #${resolvedToId}`
      });

      await conn.commit();

      // Sincronizar en Redis
      await domiRedis.decrementBalance(fromType, fromId, amountDomis);
      await domiRedis.incrementBalance(resolvedToType, resolvedToId, amountDomis);

      // Registrar auditoria de transferencia exitosa
      await logSecurityEvent(userContext.id, 'DOMI_TRANSFER_SUCCESS', 'MEDIUM', req, {
        fromType,
        fromId,
        toType: resolvedToType,
        toId: resolvedToId,
        amountDomis,
        txHash
      });

      return {
        success: true,
        txHash,
        amountDomis,
        fromBalance: parseFloat((balance - amountDomis).toFixed(4))
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new TransferDomis();
