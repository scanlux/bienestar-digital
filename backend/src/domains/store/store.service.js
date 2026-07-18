const db = require('../../config/db');
const redisClient = require('../../config/redis');
const storeRepository = require('./store.repository');
const upgradesRepository = require('../upgrades/upgrades.repository');
const upgradesHelper = require('../upgrades/upgrades.helper');
const storeQuotaService = require('./store.quota.service');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { isStoreCurrentlyOpen } = require('../../utils/timeUtils');

class StoreService {
  async getMyStores(userContext) {
    // Autocorrección en caliente si la cuota fue excedida pasivamente
    if (userContext.commerceId) {
      await storeQuotaService.enforceStoreQuota(userContext.commerceId);
    }
    const stores = await storeRepository.findMyStores(userContext.commerceId);
    
    // Hidratar con horario y estado abierto/cerrado
    await Promise.all(stores.map(async (store) => {
      const schedule = await storeRepository.findStoreHours(store.id);
      store.schedule = schedule;
      store.is_currently_open = isStoreCurrentlyOpen(store.estado, schedule);
    }));

    return stores;
  }

  async getStoresByCommerceId(userContext, commerceId, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetCommerceId = Number(commerceId);

    // BOLA Check: si no es de sistema, solo puede listar las sedes de su comercio
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

    const stores = await storeRepository.findByCommerceId(targetCommerceId);

    // Hidratar con horario y estado abierto/cerrado
    await Promise.all(stores.map(async (store) => {
      const schedule = await storeRepository.findStoreHours(store.id);
      store.schedule = schedule;
      store.is_currently_open = isStoreCurrentlyOpen(store.estado, schedule);
    }));

    return stores;
  }

  async getStoreById(userContext, id, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetId = Number(id);

    let store = await storeRepository.findById(targetId);
    if (!store) {
      throw new NotFoundError('Sede no encontrada.');
    }

    if (store.commerce_id) {
      await storeQuotaService.enforceStoreQuota(store.commerce_id, db, req);
      store = await storeRepository.findById(targetId);
      if (!store) {
        throw new NotFoundError('Sede no encontrada.');
      }
    }

    // BOLA Check: si no es de sistema, solo puede ver la sede si pertenece a su comercio
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { storeId: targetId, action: 'view_store_details' },
        'store',
        targetId
      );
      throw new ForbiddenError('No autorizado para ver el detalle de esta sede.');
    }

    // Tarea 1.1: Hidratación del Detalle de la Sede
    store.schedule = await storeRepository.findStoreHours(targetId);
    store.accounts = await storeRepository.findStoreAccounts(targetId);
    store.is_currently_open = isStoreCurrentlyOpen(store.estado, store.schedule);

    // Consultar estado de plan/mejora del comercio y de la sede
    const activeUpgrades = await upgradesRepository.findActiveByEntity('store', targetId, store.commerce_id);
    store.has_business_status = activeUpgrades.some(up => up.upgrade_type === 'estado_empresarial');
    let hasUnlimitedCatalogUpgrade = activeUpgrades.some(up => up.upgrade_type === 'catalogo_ilimitado');

    let freeTierMenus = 1;
    let freeTierCategories = 3;
    let freeTierProducts = 3;
    try {
      const [paramRows] = await db.query(
        'SELECT `key`, `value` FROM system_parameters WHERE `key` IN ("free_tier_categories_limit", "free_tier_products_limit")'
      );
      paramRows.forEach(row => {
        if (row.key === 'free_tier_categories_limit') freeTierCategories = parseInt(row.value, 10);
        if (row.key === 'free_tier_products_limit') freeTierProducts = parseInt(row.value, 10);
      });
    } catch (err) {
      console.error('[getStoreById] Error fetching system limits:', err);
    }

    store.limits = {
      menus: store.has_business_status ? null : freeTierMenus,
      categories: (store.has_business_status || hasUnlimitedCatalogUpgrade) ? null : freeTierCategories,
      products: (store.has_business_status || hasUnlimitedCatalogUpgrade) ? null : freeTierProducts
    };

    return store;
  }

  async getPaymentPlatforms() {
    return await storeRepository.findPaymentPlatforms();
  }

  async saveStore(userContext, data, req) {
    const {
      id, commerce_id, nombre_sucursal, contacto_directo, telefono, telefono_domicilio,
      direccion, latitud, longitud, estado, image_url, schedule, accounts,
      fecha_regreso, usuario_id, matricula, admin_nombres, admin_apellidos,
      admin_email, admin_password, cloneSourceStoreId
    } = data;

    const isSystem = userContext.actorType === 'system_user';
    const parsedCommerceId = Number(commerce_id);

    // 1. Validaciones BOLA de Creación y Edición
    if (!id) {
      if (!isSystem && !userContext.permissions?.includes('create_store')) {
        throw new ForbiddenError('No tienes permisos para crear una sede.');
      }
      if (!isSystem && parsedCommerceId !== userContext.commerceId) {
        throw new ForbiddenError('No tienes permisos para crear una sede en otro comercio (BOLA).');
      }
    }

    // Limpieza de fecha de regreso si el estado es operativo
    const cleanFecha = fecha_regreso ? fecha_regreso.split('T')[0] : null;
    const finalFechaRegreso = (estado === 'operativo' || !cleanFecha) ? null : cleanFecha;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Validar límite de sedes operativas si el estado es operativo
      if (estado === 'operativo') {
        await storeQuotaService.validateCanActivate(parsedCommerceId, id, connection);
      }

      let finalUserId = usuario_id;

      // A. Crear administrador único si es sede nueva
      if (!id) {
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
      } else {
        // B. Si es actualización, validaciones de pertenencia y permisos atómicos
        const store = await storeRepository.findById(id);
        if (!store) {
          throw new NotFoundError('Sede no encontrada.');
        }

        // BOLA Check
        if (!isSystem && store.commerce_id !== userContext.commerceId) {
          await logSecurityEvent(
            userContext.id,
            'BOLA_ATTEMPT',
            'HIGH',
            req,
            { storeId: Number(id), action: 'edit_store' },
            'store',
            Number(id)
          );
          throw new ForbiddenError('Acceso no autorizado sobre la sede especificada.');
        }

        // Limpiar imagen antigua si cambió
        const getFileName = (url) => {
          if (!url) return '';
          const parts = url.split('/');
          return parts[parts.length - 1];
        };

        if (store.image_url && image_url && getFileName(store.image_url) !== getFileName(image_url)) {
          this.cleanupOldImage(store.image_url, req);
        }

        // Detectar si hay cambios en campos protegidos/avanzados
        let hasAdvancedChanges = false;
        if (nombre_sucursal !== undefined && nombre_sucursal !== store.nombre_sucursal) hasAdvancedChanges = true;
        if (direccion !== undefined && direccion !== store.direccion) hasAdvancedChanges = true;
        if (latitud !== undefined && String(latitud) !== String(store.latitud)) hasAdvancedChanges = true;
        if (longitud !== undefined && String(longitud) !== String(store.longitud)) hasAdvancedChanges = true;
        if (matricula !== undefined && matricula !== store.matricula) hasAdvancedChanges = true;
        if (usuario_id !== undefined && usuario_id !== store.usuario_id) hasAdvancedChanges = true;
        if (admin_nombres !== undefined && admin_nombres !== store.admin_nombres) hasAdvancedChanges = true;
        if (admin_apellidos !== undefined && admin_apellidos !== store.admin_apellidos) hasAdvancedChanges = true;

        if (accounts && Array.isArray(accounts)) {
          const existingAccounts = await storeRepository.findStoreAccounts(id);
          const normalize = acc => ({
            platform_id: Number(acc.platform_id),
            numero_cuenta: String(acc.numero_cuenta),
            titular_nombre: String(acc.titular_nombre || ''),
            es_principal: acc.es_principal ? 1 : 0
          });
          const normExisting = existingAccounts.map(normalize);
          const normIncoming = accounts.map(normalize);

          if (normExisting.length !== normIncoming.length) {
            hasAdvancedChanges = true;
          } else {
            const sortedExisting = [...normExisting].sort((a, b) => a.numero_cuenta.localeCompare(b.numero_cuenta));
            const sortedIncoming = [...normIncoming].sort((a, b) => a.numero_cuenta.localeCompare(b.numero_cuenta));
            for (let i = 0; i < sortedExisting.length; i++) {
              if (JSON.stringify(sortedExisting[i]) !== JSON.stringify(sortedIncoming[i])) {
                hasAdvancedChanges = true;
                break;
              }
            }
          }
        }

        // Validar permisos atómicos del operador
        if (!isSystem) {
          if (hasAdvancedChanges) {
            if (!userContext.permissions?.includes('edit_store_advanced')) {
              await logSecurityEvent(
                userContext.id,
                'UNAUTHORIZED_FIELD_MODIFICATION',
                'HIGH',
                req,
                { storeId: Number(id), reason: 'Falta permiso edit_store_advanced' },
                'store',
                Number(id)
              );
              throw new ForbiddenError('No tienes permisos avanzados para modificar estos campos de la sede.');
            }
          } else {
            if (!userContext.permissions?.includes('edit_store_basic') && !userContext.permissions?.includes('edit_store_advanced')) {
              await logSecurityEvent(
                userContext.id,
                'UNAUTHORIZED_FIELD_MODIFICATION',
                'HIGH',
                req,
                { storeId: Number(id), reason: 'Falta permiso edit_store_basic' },
                'store',
                Number(id)
              );
              throw new ForbiddenError('No tienes permisos para modificar los datos básicos de la sede.');
            }
          }
        }

        // Validar reasignación de gerente ocupado
        if (finalUserId) {
          const userAssigned = await storeRepository.checkUserAssignedStore(finalUserId, id);
          if (userAssigned) {
            throw new BusinessError('Este usuario ya está asignado como gerente de otra sede.');
          }
        }
      }

      // 2. Validar matrícula mercantil única
      if (matricula) {
        const matriculaExists = await storeRepository.checkMatriculaRegistered(matricula, id);
        if (matriculaExists) {
          throw new BusinessError('La matrícula mercantil provista ya está registrada en otra sede.');
        }
      }

      let storeId = id;
      const finalContactoDirecto = `${admin_nombres || ''} ${admin_apellidos || ''}`.trim() || contacto_directo;

      const storePayload = {
        nombre_sucursal,
        contacto_directo: finalContactoDirecto,
        telefono,
        telefono_domicilio,
        direccion,
        latitud,
        longitud,
        estado,
        finalFechaRegreso,
        image_url,
        finalUserId,
        matricula,
        admin_nombres,
        admin_apellidos
      };

      if (id) {
        await storeRepository.updateStore(id, storePayload, connection);
        if (finalUserId) {
          await storeRepository.updateProfile(finalUserId, admin_nombres, admin_apellidos, telefono, connection);
        }
      } else {
        storeId = await storeRepository.createStore(parsedCommerceId, storePayload, connection);
        await storeRepository.insertUserStore(finalUserId, storeId, connection);

        // Clonado de catálogo opcional al crear
        if (cloneSourceStoreId) {
          const sourceStore = await storeRepository.findById(cloneSourceStoreId);
          if (!sourceStore) {
            throw new BusinessError('La sede origen seleccionada para copiar el catálogo no existe.');
          }
          if (sourceStore.commerce_id !== parsedCommerceId) {
            throw new ForbiddenError('No estás autorizado para clonar el catálogo de esta sede (BOLA).');
          }
          if (!isSystem && !userContext.permissions?.includes('clone_store_catalog')) {
            throw new ForbiddenError('No tienes permisos para clonar el catálogo de esta sede.');
          }

          await this.cloneCatalog(cloneSourceStoreId, storeId, connection);
        }
      }

      // 3. Procesar horario semanal
      if (schedule && Array.isArray(schedule)) {
        for (const day of schedule) {
          await storeRepository.upsertStoreHours(storeId, day, connection);
        }
      }

      // 4. Procesar cuentas bancarias
      if (accounts && Array.isArray(accounts)) {
        await storeRepository.deleteStoreAccounts(storeId, connection);
        if (accounts.length > 0) {
          const values = accounts.map(acc => [
            storeId,
            acc.platform_id,
            acc.tipo_cuenta || 'Ahorros',
            acc.numero_cuenta,
            acc.llave || null,
            acc.titular_nombre || null,
            acc.titular_documento || null,
            acc.detalle || null,
            acc.vencimiento_tarjeta || null,
            acc.es_principal === true || acc.es_principal === 1 || acc.es_principal === 'true' ? 1 : 0
          ]);
          await storeRepository.insertStoreAccounts(values, connection);
        }
      }

      // 5. Auditoría
      if (id) {
        await logSecurityEvent(
          userContext.id,
          'EDIT_STORE',
          'MEDIUM',
          req,
          { storeId: id, nombre_sucursal },
          'store',
          Number(id)
        );
      } else {
        await logSecurityEvent(
          userContext.id,
          'CREATE_STORE',
          'HIGH',
          req,
          { storeId, commerceId: parsedCommerceId, nombre_sucursal },
          'store',
          storeId
        );
      }

      await connection.commit();
      connection.release();
      return storeId;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async updateStoreStatus(userContext, storeId, estado, fechaRegreso, req) {
    const isSystem = userContext.actorType === 'system_user';
    const store = await storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundError('Sede no encontrada.');
    }

    // BOLA Check
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { storeId, action: 'update_store_status' },
        'store',
        storeId
      );
      throw new ForbiddenError('No autorizado para modificar el estado de esta sede.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (estado === 'operativo') {
        await storeQuotaService.validateCanActivate(store.commerce_id, storeId, connection);
      }

      const cleanFecha = fechaRegreso ? fechaRegreso.split('T')[0] : null;
      const finalFechaRegreso = (estado === 'operativo' || !cleanFecha) ? null : cleanFecha;

      await connection.query(
        'UPDATE stores SET estado = ?, fecha_regreso = ? WHERE id = ?',
        [estado, finalFechaRegreso, storeId]
      );

      await logSecurityEvent(
        userContext.id,
        'STORE_STATUS_UPDATED',
        'MEDIUM',
        req,
        { storeId, oldStatus: store.estado, newStatus: estado, fechaRegreso: finalFechaRegreso },
        'store',
        storeId
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async updateOrderAcceptance(userContext, storeId, mode, req) {
    const targetStoreId = Number(storeId);
    const store = await storeRepository.findById(targetStoreId);
    if (!store) {
      throw new NotFoundError('Sede no encontrada.');
    }

    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { storeId: targetStoreId, action: 'change_order_acceptance' },
        'store',
        targetStoreId
      );
      throw new ForbiddenError('No autorizado para modificar los ajustes de esta sede.');
    }

    await storeRepository.updateOrderAcceptance(targetStoreId, mode);

    await logSecurityEvent(
      userContext.id,
      'CHANGE_ORDER_ACCEPTANCE',
      'LOW',
      req,
      { storeId: targetStoreId, mode },
      'store',
      targetStoreId
    );

    return true;
  }

  async saveVideo(userContext, data, req) {
    const { storeId, url, descripcion } = data;
    const targetStoreId = Number(storeId);

    const store = await storeRepository.findById(targetStoreId);
    if (!store) {
      throw new NotFoundError('Sede no encontrada.');
    }

    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { storeId: targetStoreId, action: 'create_video' },
        'store',
        targetStoreId
      );
      throw new ForbiddenError('No autorizado para subir videos a esta sede.');
    }

    const videoId = await storeRepository.createVideo(targetStoreId, url, descripcion);

    await logSecurityEvent(
      userContext.id,
      'CREATE_VIDEO',
      'MEDIUM',
      req,
      { videoId, storeId: targetStoreId },
      'store',
      targetStoreId
    );

    return videoId;
  }

  async toggleVideo(userContext, videoId, isActive, req) {
    const targetVideoId = Number(videoId);
    const video = await storeRepository.findVideoById(targetVideoId);
    if (!video) {
      throw new NotFoundError('Video no encontrado.');
    }

    const store = await storeRepository.findById(video.store_id);
    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { videoId: targetVideoId, action: 'toggle_video' },
        'store',
        video.store_id
      );
      throw new ForbiddenError('No autorizado para modificar este video.');
    }

    await storeRepository.updateVideoStatus(targetVideoId, video.store_id, isActive ? 1 : 0);

    return true;
  }

  async deleteVideo(userContext, videoId, req) {
    const targetVideoId = Number(videoId);
    const video = await storeRepository.findVideoById(targetVideoId);
    if (!video) {
      throw new NotFoundError('Video no encontrado.');
    }

    const store = await storeRepository.findById(video.store_id);
    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { videoId: targetVideoId, action: 'delete_video' },
        'store',
        video.store_id
      );
      throw new ForbiddenError('No autorizado para eliminar este video.');
    }

    // Limpiar archivo remoto
    const getFileName = (url) => {
      if (!url) return '';
      const parts = url.split('/');
      return parts[parts.length - 1];
    };
    const fileName = getFileName(video.url);

    if (fileName) {
      try {
        const mediaServerUrl = process.env.MEDIA_SERVER_URL || 'http://localhost:4001';
        await fetch(`${mediaServerUrl}/api/media/delete/video/${fileName}`, {
          method: 'DELETE',
          headers: {
            'x-internal-key': process.env.INTERNAL_API_KEY || ''
          }
        }).catch(err => console.error('[VIDEO_CLEANUP_ERROR]', err.message));
      } catch (err) {
        console.error('[VIDEO_CLEANUP_FAILED]', err.message);
      }
    }

    await storeRepository.deleteVideo(targetVideoId, video.store_id);

    await logSecurityEvent(
      userContext.id,
      'DELETE_VIDEO',
      'MEDIUM',
      req,
      { videoId: targetVideoId, url: video.url },
      'store',
      video.store_id
    );

    return true;
  }

  // --- HELPERS ---

  async cleanupOldImage(oldUrl, req) {
    try {
      const getFileName = (url) => {
        if (!url) return '';
        const parts = url.split('/');
        return parts[parts.length - 1];
      };
      const oldFileName = getFileName(oldUrl);

      if (oldUrl.includes('/uploads/stores/')) {
        const mediaServerUrl = process.env.MEDIA_SERVER_URL || 'http://localhost:4001';
        await fetch(`${mediaServerUrl}/api/media/delete/store/${oldFileName}`, {
          method: 'DELETE',
          headers: {
            'x-internal-key': process.env.INTERNAL_API_KEY || ''
          }
        }).catch(err => console.error('[IMAGE_CLEANUP_ERROR]', err.message));
      }
    } catch (err) {
      console.error('[IMAGE_CLEANUP_FAILED]', err.message);
    }
  }

  async cloneCatalog(sourceStoreId, targetStoreId, connection) {
    // 1. Obtener menús de la sede origen
    const [menus] = await connection.query(
      'SELECT id, nombre, descripcion, orden, disponible FROM menus WHERE store_id = ? AND deleted_at IS NULL',
      [sourceStoreId]
    );

    for (const menu of menus) {
      // Insertar copia del menú para la sede destino
      const [menuResult] = await connection.query(
        'INSERT INTO menus (store_id, nombre, descripcion, orden, disponible) VALUES (?, ?, ?, ?, ?)',
        [targetStoreId, menu.nombre, menu.descripcion, menu.orden, menu.disponible]
      );
      const newMenuId = menuResult.insertId;

      // 2. Obtener categorías vinculadas al menú original
      const [categories] = await connection.query(
        'SELECT id, nombre, descripcion, orden_visual, disponible FROM categorias WHERE menu_id = ? AND deleted_at IS NULL',
        [menu.id]
      );

      for (const cat of categories) {
        // Insertar copia de la categoría vinculada al nuevo menú
        const [catResult] = await connection.query(
          'INSERT INTO categorias (menu_id, nombre, descripcion, orden_visual, disponible) VALUES (?, ?, ?, ?, ?)',
          [newMenuId, cat.nombre, cat.descripcion, cat.orden_visual, cat.disponible]
        );
        const newCategoryId = catResult.insertId;

        // 3. Obtener productos de la sede origen en esta categoría
        const [products] = await connection.query(
          `SELECT nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano, image_url, tags 
           FROM products 
           WHERE store_id = ? AND categoria_id = ? AND deleted_at IS NULL`,
          [sourceStoreId, cat.id]
        );

        for (const prod of products) {
          // Insertar copia del producto para la sede destino vinculada a la nueva categoría y menú
          await connection.query(
            `INSERT INTO products 
             (store_id, categoria_id, menu_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano, image_url, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              targetStoreId, newCategoryId, newMenuId, prod.nombre, prod.descripcion_larga,
              prod.precio_base, prod.tiempo_prep_estimado, prod.disponible,
              prod.es_vegetariano, prod.image_url, prod.tags
            ]
          );
        }
      }
    }
  }

  async getStoreFinancialSummary(userContext, params, req) {
    const { filterType, selectedMonth, id } = params;
    const isSystem = userContext.actorType === 'system_user';
    
    let targetStoreId = Number(id);
    if (!isSystem) {
      // BOLA Protection: si no es system_user, forzar a su propio storeId asignado
      if (!userContext.storeId && (!userContext.storeIds || userContext.storeIds.length === 0)) {
        throw new ForbiddenError('El usuario no tiene una sede asociada.');
      }
      targetStoreId = userContext.storeId || userContext.storeIds[0];
    }

    if (!targetStoreId) {
      throw new BusinessError('Debe especificar una sede válida.');
    }

    // 1. Obtener rangos de fecha localizados
    const { start, end } = getQueryDateBoundsLocal(filterType, selectedMonth);

    // 2. Obtener estadísticas de la sede
    const stats = await storeRepository.getStoreFinancialSummaryData(targetStoreId, start, end);
    if (!stats) {
      throw new NotFoundError('Sede no encontrada o sin datos disponibles.');
    }

    // 3. Obtener meses con datos
    const monthsWithData = await storeRepository.getMonthsWithData(targetStoreId);
    const colNow = new Date(new Date().getTime() - (5 * 3600000));
    const currentMonthStr = `${colNow.getUTCFullYear()}-${String(colNow.getUTCMonth() + 1).padStart(2, '0')}`;
    
    let monthOptions = [...monthsWithData];
    if (!monthOptions.includes(currentMonthStr)) {
      monthOptions.unshift(currentMonthStr);
    }

    // 4. Obtener paridad del token DOMI peg
    const [tokenRows] = await db.query('SELECT fiat_peg_cop FROM token_registry WHERE id = 1');
    const fiatPeg = tokenRows.length > 0 ? parseFloat(tokenRows[0].fiat_peg_cop) : 400.0;

    // 5. Obtener deudas contingentes (reembolsos pendientes)
    const [debtRows] = await db.query(
      `SELECT SUM(amount_domis) as total_debts 
       FROM domi_order_debts 
       WHERE beneficiary_type = 'store' 
         AND beneficiary_id = ? 
         AND status = 'pending'`,
      [targetStoreId]
    );
    const contingentDomi = parseFloat(debtRows[0].total_debts || 0.0);

    const completed = parseInt(stats.completed_orders, 10);
    const rejected = parseInt(stats.rejected_orders, 10);
    const cancelled = parseInt(stats.cancelled_orders, 10);
    const sales = parseFloat(stats.total_sales);
    const commissions = parseFloat(stats.commissions_paid);
    const balance = parseFloat(stats.balance_custody);

    // Registrar auditoría de seguridad
    await logSecurityEvent(
      userContext.id,
      'VIEW_FINANCIAL_SUMMARY',
      'INFO',
      req,
      { storeId: targetStoreId, filterType },
      'store',
      targetStoreId
    );

    return {
      consolidated: {
        totalSalesCop: sales,
        totalCommissionsPaidDomi: commissions,
        totalCompletedOrders: completed,
        totalRejectedOrders: rejected,
        totalCancelledOrders: cancelled,
        totalContingentRefundsDomi: contingentDomi,
        walletBalanceDomi: balance,
        walletBalanceCop: balance * fiatPeg,
        fiatPeg
      },
      store: {
        storeId: stats.store_id,
        nombreSucursal: stats.nombre_sucursal,
        estado: stats.estado,
        balanceCustodyDomi: balance,
        balanceCustodyCop: balance * fiatPeg,
        contingentRefundsDomi: contingentDomi,
        contingentRefundsCop: contingentDomi * fiatPeg,
        stats: {
          completedOrdersCount: completed,
          rejectedOrdersCount: rejected,
          cancelledOrdersCount: cancelled,
          totalSalesCop: sales,
          commissionsPaidDomi: commissions
        }
      },
      fiatPeg,
      monthOptions
    };
  }
}

function getQueryDateBoundsLocal(filterType, selectedMonth) {
  const now = new Date();
  const col = new Date(now.getTime() - (5 * 3600000));
  const y = col.getUTCFullYear();
  const m = col.getUTCMonth();
  const d = col.getUTCDate();

  let start, end;

  if (filterType === 'day') {
    start = new Date(Date.UTC(y, m, d, 5, 0, 0, 0));
    end = new Date(Date.UTC(y, m, d, 28, 59, 59, 999));
  } else if (filterType === 'week') {
    const dayOfWeek = col.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start = new Date(Date.UTC(y, m, d + diffToMonday, 5, 0, 0, 0));
    end = new Date(Date.UTC(y, m, d + diffToMonday + 6, 28, 59, 59, 999));
  } else if (filterType === 'month') {
    let year = y;
    let monthZeroIndexed = m;

    if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      const [yStr, mStr] = selectedMonth.split('-');
      year = parseInt(yStr, 10);
      monthZeroIndexed = parseInt(mStr, 10) - 1;
    }

    start = new Date(Date.UTC(year, monthZeroIndexed, 1, 5, 0, 0, 0));
    const lastDayObj = new Date(Date.UTC(year, monthZeroIndexed + 1, 0));
    const lastDay = lastDayObj.getUTCDate();
    end = new Date(Date.UTC(year, monthZeroIndexed, lastDay, 28, 59, 59, 999));
  } else {
    start = new Date(Date.UTC(y, m, d, 5, 0, 0, 0));
    end = new Date(Date.UTC(y, m, d, 28, 59, 59, 999));
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

module.exports = new StoreService();
