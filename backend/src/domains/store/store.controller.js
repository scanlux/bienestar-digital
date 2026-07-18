const storeService = require('./store.service');
const storeQuotaService = require('./store.quota.service');
const { handleControllerError } = require('../../utils/errors');

class StoreController {
  async getMyStores(req, res) {
    try {
      const result = await storeService.getMyStores(req.user);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getStoresByCommerceId(req, res) {
    try {
      const { commerceId } = req.params;
      const result = await storeService.getStoresByCommerceId(req.user, commerceId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getStoreById(req, res) {
    try {
      const { id } = req.params;
      const result = await storeService.getStoreById(req.user, id, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getPaymentPlatforms(req, res) {
    try {
      const result = await storeService.getPaymentPlatforms();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async saveStore(req, res) {
    try {
      const storeId = await storeService.saveStore(req.user, req.body, req);
      res.json({ id: storeId, message: req.body.id ? 'Sede actualizada con éxito' : 'Sede creada con éxito' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateOrderAcceptance(req, res) {
    try {
      const { storeId } = req.params;
      const { acceptanceMode } = req.body;
      await storeService.updateOrderAcceptance(req.user, storeId, acceptanceMode, req);
      res.json({ success: true, message: 'Modo de aceptación de pedidos actualizado.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async saveVideo(req, res) {
    try {
      const videoId = await storeService.saveVideo(req.user, req.body, req);
      res.json({ id: videoId, message: 'Video registrado con éxito' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async toggleVideo(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      await storeService.toggleVideo(req.user, id, is_active, req);
      res.json({ success: true, message: 'Estado del video actualizado.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deleteVideo(req, res) {
    try {
      const { id } = req.params;
      await storeService.deleteVideo(req.user, id, req);
      res.json({ success: true, message: 'Video eliminado con éxito.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getStoreFinancialSummary(req, res) {
    try {
      const { id } = req.params;
      const { filterType, selectedMonth } = req.query;
      const result = await storeService.getStoreFinancialSummary(req.user, { id, filterType, selectedMonth }, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getStoreQuotaStatus(req, res) {
    try {
      const isSystem = req.user.actorType === 'system_user';
      const commerceId = isSystem && req.query.commerceId ? Number(req.query.commerceId) : req.user.commerceId;
      
      const quota = await storeQuotaService.calculateStoreLimitForCommerce(commerceId);
      
      // Obtener los IDs demotados actuales para el frontend (sedes no_disponibles en exceso)
      // O simplemente retornamos la lista de operativeStores ordenadas
      const operativeStores = await storeRepository.findOperativeStoresByCommerceId(commerceId);
      // Las que quedarían demotadas si forzamos el cumplimiento
      const demotedStoreIds = [];
      if (quota.delta > 0) {
        for (let i = 0; i < quota.delta; i++) {
          if (operativeStores[i]) demotedStoreIds.push(operativeStores[i].id);
        }
      }

      res.json({
        maxStores: quota.maxStores,
        activeStores: quota.activeStores,
        delta: quota.delta,
        isExceeded: quota.isExceeded,
        demotedStoreIds
      });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateStoreStatus(req, res) {
    try {
      const { storeId } = req.params;
      const { estado, fecha_regreso } = req.body;
      await storeService.updateStoreStatus(req.user, Number(storeId), estado, fecha_regreso, req);
      res.json({ success: true, message: 'Estado de la sede actualizado con éxito.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async enforceStoreQuota(req, res) {
    try {
      const isSystem = req.user.actorType === 'system_user';
      const commerceId = isSystem && req.params.commerceId ? Number(req.params.commerceId) : req.user.commerceId;
      
      const result = await storeQuotaService.enforceStoreQuota(commerceId, db, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new StoreController();
