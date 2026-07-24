const storeRepository = require('../store.repository');
const { ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class StoreMediaService {
  constructor(storeService) {
    this.storeService = storeService;
  }

  async uploadStoreLogo(userContext, storeId, imageUrl, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(storeId);

    const store = await storeRepository.findById(targetStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, { storeId: targetStoreId, action: 'upload_logo' }, 'store', targetStoreId);
      throw new ForbiddenError('No autorizado para modificar medios de esta sede.');
    }

    if (store.image_url && store.image_url !== imageUrl) {
       await this.storeService.cleanupOldImage(store.image_url, req);
    }

    await storeRepository.updateStore(targetStoreId, { image_url: imageUrl });
    return true;
  }

  async uploadStoreBanner(userContext, storeId, bannerUrl, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(storeId);

    const store = await storeRepository.findById(targetStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      throw new ForbiddenError('No autorizado para modificar medios de esta sede.');
    }

    await storeRepository.updateStore(targetStoreId, { banner_url: bannerUrl });
    return true;
  }
}

module.exports = StoreMediaService;
