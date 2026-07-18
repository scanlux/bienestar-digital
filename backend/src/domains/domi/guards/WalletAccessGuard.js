const domiRepository = require('../domi.repository');
const { ForbiddenError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

/**
 * Valida que el usuario autenticado tiene acceso a la wallet indicada.
 * Registra un evento BOLA_ATTEMPT en auditoria si el acceso es denegado.
 * @throws {ForbiddenError}
 */
async function assertWalletAccess(userContext, ownerType, ownerId, actionLabel, req) {
  const isSystem = userContext.actorType === 'system_user';

  if (!isSystem) {
    if (ownerType === 'user') {
      if (String(userContext.id) !== String(ownerId)) {
        await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, {
          reason: `Intento de ${actionLabel} en billetera ajena de tipo usuario`,
          targetOwnerType: ownerType,
          targetOwnerId: ownerId
        });
        throw new ForbiddenError('Acceso no autorizado. Sólo puedes realizar esta acción en tu propia billetera.');
      }
    } else if (ownerType === 'store') {
      const hasAccess = userContext.rol === 'admin' && userContext.storeIds && userContext.storeIds.includes(parseInt(ownerId));
      let isManager = false;
      if (userContext.rol === 'admin' && userContext.commerceId) {
        isManager = await domiRepository.checkStoreExists(ownerId, userContext.commerceId);
      }
      
      if (!hasAccess && !isManager) {
        await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, {
          reason: `Intento de ${actionLabel} en billetera de sede sin autorizacion`,
          targetOwnerType: ownerType,
          targetOwnerId: ownerId
        });
        throw new ForbiddenError('Acceso denegado a la billetera de esta sede.');
      }
    } else if (ownerType === 'commerce') {
      const userCommerceId = userContext.commerceId || userContext.commerce_id;
      const hasAccess = userCommerceId && String(userCommerceId) === String(ownerId);
      if (!hasAccess) {
        await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, {
          reason: `Intento de ${actionLabel} en billetera de comercio ajeno`,
          targetOwnerType: ownerType,
          targetOwnerId: ownerId
        });
        throw new ForbiddenError('Acceso denegado a la billetera de este comercio.');
      }
    } else if (ownerType === 'delivery_company') {
      const userCompanyId = userContext.deliveryCompanyId || userContext.delivery_company_id;
      const hasAccess = userCompanyId && String(userCompanyId) === String(ownerId);
      if (!hasAccess) {
        await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, {
          reason: `Intento de ${actionLabel} en billetera de empresa de reparto ajena`,
          targetOwnerType: ownerType,
          targetOwnerId: ownerId
        });
        throw new ForbiddenError('Acceso denegado a la billetera de esta empresa de reparto.');
      }
    } else {
      await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, {
        reason: `Intento de ${actionLabel} en billetera de sistema u otra invalida`,
        targetOwnerType: ownerType,
        targetOwnerId: ownerId
      });
      throw new ForbiddenError('Acceso denegado.');
    }
  }
}

module.exports = {
  assertWalletAccess
};
