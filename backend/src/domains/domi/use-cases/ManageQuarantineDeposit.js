const db = require('../../../config/db');
const domiRepository = require('../domi.repository');
const { resolveWallet } = require('../../../services/domi-kernel/wallet-resolver');
const ledger = require('../../../services/domi-kernel/ledger');
const domiRedis = require('../../../services/domiRedis');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class ManageQuarantineDeposit {
  /**
   * Lista todos los paquetes de transacciones que se encuentran actualmente en la billetera de cuarentena.
   */
  async list(userContext) {
    if (userContext.actorType !== 'system_user' || userContext.rol !== 'root') {
      throw new ForbiddenError('Acceso denegado: Privilegios de tesorería insuficientes.');
    }

    // 1. Obtener la wallet de cuarentena
    const [qWallets] = await db.query('SELECT id FROM wallets WHERE is_quarantine = 1 LIMIT 1');
    if (qWallets.length === 0) {
      return [];
    }
    const quarantineWalletId = qWallets[0].id;

    // 2. Listar paquetes asociados
    const [packages] = await db.query(
      `SELECT p.*, w.alias as original_wallet_alias
       FROM domi_packages p
       LEFT JOIN wallets w ON p.wallet_id = w.id
       WHERE p.wallet_id = ? AND p.status = 'confirmado'
       ORDER BY p.created_at DESC`,
      [quarantineWalletId]
    );

    return packages;
  }

  /**
   * Reasigna de forma manual y auditada un depósito en cuarentena hacia la billetera real del dueño.
   */
  async resolve(userContext, packageId, data, req) {
    if (userContext.actorType !== 'system_user' || userContext.rol !== 'root') {
      throw new ForbiddenError('Acceso denegado: Solo el usuario root puede resolver depósitos en cuarentena.');
    }

    const { targetOwnerType, targetOwnerId } = data;
    if (!targetOwnerType || !targetOwnerId) {
      throw new BusinessError('targetOwnerType y targetOwnerId son requeridos para la reasignación.');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Obtener la wallet de cuarentena
      const [qWallets] = await conn.query('SELECT * FROM wallets WHERE is_quarantine = 1 LIMIT 1');
      if (qWallets.length === 0) {
        throw new BusinessError('Billetera de cuarentena no encontrada.');
      }
      const quarantineWallet = qWallets[0];

      // 2. Obtener el paquete de transaccion y verificar que este en cuarentena
      const [packages] = await conn.query(
        'SELECT * FROM domi_packages WHERE id = ? LIMIT 1',
        [packageId]
      );
      if (packages.length === 0) {
        throw new NotFoundError('Paquete de transacción no encontrado.');
      }
      const pkg = packages[0];

      if (pkg.wallet_id !== quarantineWallet.id) {
        throw new BusinessError('El paquete indicado no se encuentra en la billetera de cuarentena.');
      }

      // 3. Resolver la wallet destino del propietario indicado
      const targetWallet = await resolveWallet(conn, targetOwnerType, targetOwnerId);

      // 4. Calcular el monto en DOMIs de la transaccion
      const domis = parseFloat(pkg.domis_purchased);

      // Validar saldo suficiente en la wallet de cuarentena
      if (parseFloat(quarantineWallet.balance_custody) < domis) {
        throw new BusinessError('Saldo insuficiente en la billetera de cuarentena para realizar la reasignación.');
      }

      // 5. Restar de la cuarentena y sumar a la wallet destino
      await conn.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [domis, quarantineWallet.id]);
      await conn.query('UPDATE wallets SET balance_custody = balance_custody + ? WHERE id = ?', [domis, targetWallet.id]);

      // 6. Actualizar el paquete para reflejar el destino correcto
      await conn.query(
        `UPDATE domi_packages SET 
          wallet_id = ?, 
          owner_entity_type = ?, 
          owner_entity_id = ?,
          store_id = ?
         WHERE id = ?`,
        [
          targetWallet.id,
          targetOwnerType,
          targetOwnerId,
          targetOwnerType === 'store' ? targetOwnerId : null,
          packageId
        ]
      );

      // 7. Registrar la transferencia forense en el Ledger
      const [tokenRows] = await conn.query('SELECT * FROM token_registry LIMIT 1');
      const [ruleRows] = await conn.query('SELECT * FROM protocol_rules LIMIT 1');

      await ledger.appendLedger(conn, {
        txType: 'transfer', 
        fromWalletId: quarantineWallet.id, 
        toWalletId: targetWallet.id,
        amountDomis: domis, 
        amountFiatCop: parseFloat(pkg.fiat_paid_cop),
        referenceType: 'package', 
        referenceId: packageId,
        protocolSnapshot: { token: tokenRows[0], rules: ruleRows[0] },
        notes: `Resolución manual de Cuarentena (Ref: ${pkg.payment_ref}) para ${targetOwnerType} #${targetOwnerId}`
      });

      // 8. Registrar auditoria del evento
      await logSecurityEvent(userContext.id, 'DOMI_QUARANTINE_RESOLVED', 'HIGH', req, {
        operatorId: userContext.id,
        packageId,
        paymentRef: pkg.payment_ref,
        targetOwnerType,
        targetOwnerId,
        walletIdDestino: targetWallet.id,
        domis
      });

      await conn.commit();

      // Sincronizar cache de Redis para el nuevo balance del dueño
      await domiRedis.incrementBalance(targetOwnerType, targetOwnerId, domis);

      return {
        success: true,
        message: `Depósito reasignado exitosamente. Se acreditaron ${domis} DOMIs a la billetera del propietario.`,
        walletId: targetWallet.id
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new ManageQuarantineDeposit();
