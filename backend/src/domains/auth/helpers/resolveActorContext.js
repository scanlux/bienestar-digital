const authRepository = require('../auth.repository');

/**
 * Resuelve el contexto de actor (adminType, commerceId, storeIds, deliveryCompanyId)
 * para un usuario con rol 'admin' de forma unificada.
 */
async function resolveActorContext(user, connection) {
  let commerceId = null;
  let storeIds = [];
  let deliveryCompanyId = null;
  let adminType = null;

  if (user && user.rol === 'admin') {
    if (user.commerce_id) {
      adminType = 'commerce';
      commerceId = user.commerce_id;
      storeIds = await authRepository.findStoresByCommerceId(commerceId, connection);
    } else if (user.store_id) {
      adminType = 'store';
      commerceId = user.store_commerce_id;
      storeIds = [user.store_id];
    } else if (user.delivery_company_id) {
      adminType = 'delivery_company';
      deliveryCompanyId = user.delivery_company_id;
    }
  }

  return {
    adminType,
    commerceId,
    storeIds,
    deliveryCompanyId
  };
}

module.exports = resolveActorContext;
