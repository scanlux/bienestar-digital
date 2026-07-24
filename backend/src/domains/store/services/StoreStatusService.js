const db = require('../../../config/db');
const storeRepository = require('../store.repository');
const storeQuotaService = require('../store.quota.service');
const { ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const { assertWalletAccess } = require('../../domi/guards/WalletAccessGuard');

class StoreStatusService {
  constructor(storeService) {
    this.storeService = storeService;
  }

  async getStoreSchedule(storeId) {
    const targetStoreId = Number(storeId);
    return await storeRepository.findStoreHours(targetStoreId);
  }

  async updateStoreSchedule(userContext, storeId, schedule, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(storeId);

    const store = await storeRepository.findById(targetStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    await assertWalletAccess(userContext, 'store', targetStoreId, 'modificar horario de sede', req);

    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      throw new ForbiddenError('No autorizado para modificar el horario de esta sede.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (schedule && Array.isArray(schedule)) {
        for (const day of schedule) {
          await storeRepository.upsertStoreHours(targetStoreId, day, connection);
        }
      }
      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async toggleStoreOpenStatus(userContext, storeId, estado, fechaRegreso, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(storeId);

    const store = await storeRepository.findById(targetStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    await assertWalletAccess(userContext, 'store', targetStoreId, 'modificar estado de sede', req);

    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id, 'BOLA_ATTEMPT', 'HIGH', req,
        { storeId: targetStoreId, action: 'update_store_status' },
        'store', targetStoreId
      );
      throw new ForbiddenError('No autorizado para modificar el estado de esta sede.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (estado === 'operativo') {
        await storeQuotaService.validateCanActivate(store.commerce_id, targetStoreId, connection);
      }

      const cleanFecha = fechaRegreso ? fechaRegreso.split('T')[0] : null;
      const finalFechaRegreso = (estado === 'operativo' || !cleanFecha) ? null : cleanFecha;

      await connection.query(
        'UPDATE stores SET estado = ?, fecha_regreso = ? WHERE id = ?',
        [estado, finalFechaRegreso, targetStoreId]
      );

      await logSecurityEvent(
        userContext.id, 'STORE_STATUS_UPDATED', 'MEDIUM', req,
        { storeId: targetStoreId, oldStatus: store.estado, newStatus: estado, fechaRegreso: finalFechaRegreso },
        'store', targetStoreId
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = StoreStatusService;
