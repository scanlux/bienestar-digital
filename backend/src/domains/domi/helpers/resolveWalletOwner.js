const { BusinessError } = require('../../../utils/errors');

/**
 * Resuelve de forma segura el tipo (ownerType) e ID (ownerId) del propietario de la billetera
 * según la sesión del actor, previniendo accesos forzados de parámetros.
 */
function resolveWalletOwner(userContext) {
  const actorType = userContext.actorType;
  const adminType = userContext.adminType;
  
  if (actorType === 'system_user') {
    return { ownerType: 'system', ownerId: 0 };
  }
  
  if (actorType === 'operator') {
    if (!userContext.storeId) {
      throw new BusinessError('El operador no tiene una sede asociada.', 400);
    }
    return { ownerType: 'store', ownerId: userContext.storeId };
  }
  
  if (actorType === 'user') {
    if (userContext.rol === 'admin') {
      if (adminType === 'commerce') {
        if (!userContext.commerceId) throw new BusinessError('El administrador no tiene un comercio asociado.', 400);
        return { ownerType: 'commerce', ownerId: userContext.commerceId };
      } else if (adminType === 'store') {
        const storeId = userContext.storeIds && userContext.storeIds.length > 0 ? userContext.storeIds[0] : null;
        if (!storeId) throw new BusinessError('El administrador no tiene una sede asociada.', 400);
        return { ownerType: 'store', ownerId: storeId };
      } else if (adminType === 'delivery_company') {
        if (!userContext.deliveryCompanyId) throw new BusinessError('El administrador no tiene una empresa de reparto asociada.', 400);
        return { ownerType: 'delivery_company', ownerId: userContext.deliveryCompanyId };
      }
    }
    
    // Cliente o repartidor
    return { ownerType: 'user', ownerId: userContext.id };
  }
  
  throw new BusinessError('No se pudo resolver el propietario de la billetera.', 400);
}

module.exports = resolveWalletOwner;
