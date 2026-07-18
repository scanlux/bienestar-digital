const db = require('../../../config/db');
const domiEngine = require('../../../services/domiEngine');
const domiRedis = require('../../../services/domiRedis');
const { BusinessError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class BurnDomisManual {
  async execute(userContext, data, req) {
    const { ownerType, ownerId, amountDomis } = data;

    if (!ownerType || !ownerId || !amountDomis || amountDomis <= 0) {
      throw new BusinessError('ownerType, ownerId y amountDomis son requeridos y deben ser positivos.');
    }

    if (!['store', 'user', 'commerce'].includes(ownerType)) {
      throw new BusinessError('ownerType debe ser store, user o commerce.');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const wallet = ownerType === 'store'
        ? await domiEngine.getStoreWallet(conn, ownerId)
        : ownerType === 'commerce'
          ? await domiEngine.getCommerceWallet(conn, ownerId)
          : await domiEngine.getUserWallet(conn, ownerId);

      const result = await domiEngine.burnDomis(conn, wallet.id, parseFloat(amountDomis), userContext.id);

      await conn.commit();

      // Sincronizar en Redis
      await domiRedis.decrementBalance(ownerType, ownerId, result.totalDomisDebited);

      await logSecurityEvent(userContext.id, 'MANUAL_BURN', 'HIGH', req, {
        operatorId: userContext.id,
        targetOwnerType: ownerType,
        targetOwnerId: ownerId,
        amountDomis,
        txHash: result.txHash
      });

      return {
        success: true,
        message: `Quemado manual de ${amountDomis} DOMIs exitoso de ${ownerType} #${ownerId}`,
        txHash: result.txHash,
        newBalance: result.newBalance
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new BurnDomisManual();
