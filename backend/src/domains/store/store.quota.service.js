const db = require('../../config/db');
const storeRepository = require('./store.repository');
const upgradesRepository = require('../upgrades/upgrades.repository');
const upgradesHelper = require('../upgrades/upgrades.helper');
const notificationService = require('../../services/notificationService');
const { logSecurityEvent } = require('../../utils/securityLogger');
const { BusinessError } = require('../../utils/errors');

class StoreQuotaService {
  async calculateStoreLimitForCommerce(commerceId, connection = db) {
    const activeUpgrades = await upgradesRepository.findActiveByEntity('commerce', commerceId, commerceId, connection);
    const systemParams = await upgradesHelper.fetchStoreSystemParams(connection);
    const maxStores = upgradesHelper.calculateStoresLimit(systemParams, activeUpgrades);

    const [activeStoresRows] = await connection.query(
      'SELECT COUNT(*) as activeCount FROM stores WHERE commerce_id = ? AND estado = "operativo"',
      [commerceId]
    );
    const activeStores = Number(activeStoresRows[0].activeCount);

    return {
      maxStores,
      activeStores,
      delta: activeStores - maxStores,
      isExceeded: activeStores > maxStores
    };
  }

  async validateCanActivate(commerceId, storeId, connection = db) {
    const quota = await this.calculateStoreLimitForCommerce(commerceId, connection);
    
    // Si ya estamos en el límite (o lo superamos), y la sede actual no estaba ya en 'operativo'
    if (quota.activeStores >= quota.maxStores) {
      if (storeId) {
        const [currentStore] = await connection.query('SELECT estado FROM stores WHERE id = ?', [storeId]);
        if (currentStore[0] && currentStore[0].estado === 'operativo') {
          // Si ya era operativo, permitimos la actualización sin sumarle al conteo
          return;
        }
      }
      throw new BusinessError(
        `Límite de sedes operativas alcanzado (${quota.activeStores}/${quota.maxStores}). ` +
        `Adquiere la mejora 'Añadir una Sede' o 'Estado Empresarial' en el Mercado de Mejoras para activar más.`
      );
    }
  }

  async enforceStoreQuota(commerceId, connection = db, req = null) {
    const quota = await this.calculateStoreLimitForCommerce(commerceId, connection);
    if (quota.delta <= 0) {
      return { demotedCount: 0, demotedStoreIds: [], maxStores: quota.maxStores, activeStores: quota.activeStores };
    }

    // Buscar sedes operativas ordenadas por pedidos completados ASC (menor volumen primero) y luego updated_at DESC
    const operativeStores = await storeRepository.findOperativeStoresByCommerceId(commerceId, connection);
    const demotedStoreIds = [];
    const demotedCount = quota.delta;

    // Tomar las primeras delta de la lista para demote
    for (let i = 0; i < demotedCount; i++) {
      if (operativeStores[i]) {
        demotedStoreIds.push(operativeStores[i].id);
      }
    }

    if (demotedStoreIds.length > 0) {
      await storeRepository.bulkSetStoreStatus(demotedStoreIds, 'no_disponible', connection);

      // Notificar al gerente de la sede / comercio
      // Busquemos el usuario_id del administrador del comercio para enviarle las notificaciones
      const [commerceUser] = await connection.query('SELECT usuario_id FROM commerces WHERE id = ?', [commerceId]);
      const targetUserId = commerceUser[0]?.usuario_id;

      if (targetUserId) {
        for (const storeId of demotedStoreIds) {
          const storeName = operativeStores.find(s => s.id === storeId)?.nombre_sucursal || `Sede #${storeId}`;
          await notificationService.createSystemNotification({
            userId: targetUserId,
            type: 'STORE_DEMOTED_BY_QUOTA',
            title: 'Sede Desactivada por Límite de Plan',
            message: `La sede "${storeName}" ha sido desactivada automáticamente porque has superado el límite de sedes de tu plan actual (${quota.maxStores} permitidas). Adquiere una mejora en el mercado para reactivarla.`,
            actionUrl: '/commerce/upgrades'
          }, connection);

          await logSecurityEvent(
            targetUserId,
            'STORE_DEMOTED_BY_QUOTA',
            'HIGH',
            req,
            { storeId, storeName, commerceId },
            'store',
            storeId
          );
        }
      }

      await logSecurityEvent(
        targetUserId || 0,
        'QUOTA_ENFORCEMENT',
        'HIGH',
        req,
        { commerceId, maxStores: quota.maxStores, previousActive: quota.activeStores, demotedStoreIds },
        'commerce',
        commerceId
      );
    }

    return {
      demotedCount: demotedStoreIds.length,
      demotedStoreIds,
      maxStores: quota.maxStores,
      activeStores: quota.activeStores - demotedStoreIds.length
    };
  }
}

module.exports = new StoreQuotaService();
