const db = require('../../../config/db');
const storeRepository = require('../store.repository');
const upgradesRepository = require('../../upgrades/upgrades.repository');
const storeQuotaService = require('../store.quota.service');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const { assertWalletAccess } = require('../../domi/guards/WalletAccessGuard');
const { isStoreCurrentlyOpen } = require('../../../utils/timeUtils');
const bcrypt = require('bcryptjs');
const appLogger = require('../../../utils/appLogger');

class StoreManagementService {
  constructor(storeService) {
    this.storeService = storeService;
  }

  async getStores(userContext, commerceId, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetCommerceId = commerceId ? Number(commerceId) : userContext.commerceId;

    if (!isSystem && targetCommerceId !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { commerceId: targetCommerceId, action: 'list_commerce_stores' },
        'commerce',
        targetCommerceId
      );
      throw new ForbiddenError('No autorizado para ver las sedes de este comercio.');
    }

    if (targetCommerceId) {
      await storeQuotaService.enforceStoreQuota(targetCommerceId, db, req);
    }

    const stores = targetCommerceId 
      ? await storeRepository.findByCommerceId(targetCommerceId)
      : await storeRepository.findMyStores(userContext.commerceId);

    await Promise.all(stores.map(async (store) => {
      const schedule = await storeRepository.findStoreHours(store.id);
      store.schedule = schedule;
      store.is_currently_open = isStoreCurrentlyOpen(store.estado, schedule);
    }));

    return stores;
  }

  async getStoreDetail(userContext, id, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetId = Number(id);

    let store = await storeRepository.findById(targetId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    if (store.commerce_id) {
      await storeQuotaService.enforceStoreQuota(store.commerce_id, db, req);
      store = await storeRepository.findById(targetId);
      if (!store) throw new NotFoundError('Sede no encontrada.');
    }

    await assertWalletAccess(userContext, 'store', targetId, 'ver detalle de sede', req);

    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id, 'BOLA_ATTEMPT', 'HIGH', req,
        { storeId: targetId, action: 'view_store_details' },
        'store', targetId
      );
      throw new ForbiddenError('No autorizado para ver el detalle de esta sede.');
    }

    store.schedule = await storeRepository.findStoreHours(targetId);
    store.accounts = await storeRepository.findStoreAccounts(targetId);
    store.is_currently_open = isStoreCurrentlyOpen(store.estado, store.schedule);

    const activeUpgrades = await upgradesRepository.findActiveByEntity('store', targetId, store.commerce_id);
    store.has_business_status = activeUpgrades.some(up => up.upgrade_type === 'estado_empresarial');
    let hasUnlimitedCatalogUpgrade = activeUpgrades.some(up => up.upgrade_type === 'catalogo_ilimitado');

    let freeTierMenus = 1, freeTierCategories = 3, freeTierProducts = 3;
    try {
      const [paramRows] = await db.query('SELECT `key`, `value` FROM system_parameters WHERE `key` IN ("free_tier_categories_limit", "free_tier_products_limit")');
      paramRows.forEach(row => {
        if (row.key === 'free_tier_categories_limit') freeTierCategories = parseInt(row.value, 10);
        if (row.key === 'free_tier_products_limit') freeTierProducts = parseInt(row.value, 10);
      });
    } catch (err) {
      appLogger.error('[getStoreDetail] Error fetching system limits:', err);
    }

    store.limits = {
      menus: store.has_business_status ? null : freeTierMenus,
      categories: (store.has_business_status || hasUnlimitedCatalogUpgrade) ? null : freeTierCategories,
      products: (store.has_business_status || hasUnlimitedCatalogUpgrade) ? null : freeTierProducts
    };

    return store;
  }

  async createStore(userContext, data, req) {
    const {
      commerce_id, nombre_sucursal, contacto_directo, telefono, telefono_domicilio,
      direccion, latitud, longitud, estado, image_url, fecha_regreso, usuario_id,
      matricula, admin_nombres, admin_apellidos, admin_email, admin_password, cloneSourceStoreId
    } = data;

    const isSystem = userContext.actorType === 'system_user';
    const parsedCommerceId = Number(commerce_id);

    if (!isSystem && !userContext.permissions?.includes('create_store')) {
      throw new ForbiddenError('No tienes permisos para crear una sede.');
    }
    if (!isSystem && parsedCommerceId !== userContext.commerceId) {
      throw new ForbiddenError('No tienes permisos para crear una sede en otro comercio (BOLA).');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (estado === 'operativo') {
        await storeQuotaService.validateCanActivate(parsedCommerceId, null, connection);
      }

      let finalUserId = usuario_id;
      if (!admin_email || !admin_password) {
        throw new BusinessError('Para crear una sede, debes definir su correo y contraseña de administrador único.');
      }

      const emailExists = await storeRepository.checkUserExistsByEmail(admin_email, connection);
      if (emailExists) {
        throw new BusinessError('El correo electrónico del administrador ya está registrado.');
      }

      const passwordHash = await bcrypt.hash(admin_password, 10);
      finalUserId = await storeRepository.createUser(admin_email, passwordHash, connection);
      await storeRepository.createProfile(finalUserId, admin_nombres, admin_apellidos, telefono, connection);

      if (matricula) {
        const matriculaExists = await storeRepository.checkMatriculaRegistered(matricula, null);
        if (matriculaExists) throw new BusinessError('La matrícula mercantil provista ya está registrada.');
      }

      const finalContactoDirecto = `${admin_nombres || ''} ${admin_apellidos || ''}`.trim() || contacto_directo;
      const cleanFecha = fecha_regreso ? fecha_regreso.split('T')[0] : null;
      const finalFechaRegreso = (estado === 'operativo' || !cleanFecha) ? null : cleanFecha;

      const storePayload = {
        nombre_sucursal, contacto_directo: finalContactoDirecto, telefono, telefono_domicilio,
        direccion, latitud, longitud, estado, finalFechaRegreso, image_url, finalUserId,
        matricula, admin_nombres, admin_apellidos
      };

      const storeId = await storeRepository.createStore(parsedCommerceId, storePayload, connection);
      await storeRepository.insertUserStore(finalUserId, storeId, connection);

      if (cloneSourceStoreId) {
        await this.storeService.cloneCatalog(cloneSourceStoreId, storeId, connection);
      }

      await logSecurityEvent(
        userContext.id, 'CREATE_STORE', 'HIGH', req,
        { storeId, commerceId: parsedCommerceId, nombre_sucursal },
        'store', storeId
      );

      await connection.commit();
      return storeId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateStore(userContext, data, req) {
    const { id, ...updateData } = data;
    const isSystem = userContext.actorType === 'system_user';
    const storeId = Number(id);

    const store = await storeRepository.findById(storeId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(userContext.id, 'BOLA_ATTEMPT', 'HIGH', req, { storeId, action: 'edit_store' }, 'store', storeId);
      throw new ForbiddenError('Acceso no autorizado sobre la sede especificada.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (updateData.estado === 'operativo') {
        await storeQuotaService.validateCanActivate(store.commerce_id, storeId, connection);
      }

      const cleanFecha = updateData.fecha_regreso ? updateData.fecha_regreso.split('T')[0] : null;
      const finalFechaRegreso = (updateData.estado === 'operativo' || !cleanFecha) ? null : cleanFecha;
      
      const payload = {
        ...updateData,
        finalFechaRegreso,
      };

      await storeRepository.updateStore(storeId, payload, connection);
      
      if (payload.usuario_id) {
        await storeRepository.updateProfile(payload.usuario_id, payload.admin_nombres, payload.admin_apellidos, payload.telefono, connection);
      }

      await logSecurityEvent(userContext.id, 'EDIT_STORE', 'MEDIUM', req, { storeId, nombre_sucursal: payload.nombre_sucursal }, 'store', storeId);
      
      await connection.commit();
      return storeId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteStore(userContext, id, req) {
    throw new BusinessError('Not Implemented: deleteStore functionality pending integration.');
  }
}

module.exports = StoreManagementService;
