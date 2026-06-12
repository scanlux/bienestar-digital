const db = require('../../config/db');
const storeRepository = require('./store.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class StoreService {
  async getMyStores(userContext) {
    return await storeRepository.findMyStores(userContext.commerceId);
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

    return await storeRepository.findByCommerceId(targetCommerceId);
  }

  async getStoreById(userContext, id, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetId = Number(id);

    const store = await storeRepository.findById(targetId);
    if (!store) {
      throw new NotFoundError('Sede no encontrada.');
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

    // Limpiar archivo físico local y remoto
    const getFileName = (url) => {
      if (!url) return '';
      const parts = url.split('/');
      return parts[parts.length - 1];
    };
    const fileName = getFileName(video.url);

    if (fileName) {
      try {
        const localPath = path.join(__dirname, '../../uploads/videos', fileName);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }

        if (process.env.NODE_ENV === 'production') {
          const mediaServerUrl = process.env.MEDIA_SERVER_URL || 'https://trendy-telemetry.sytes.net';
          await fetch(`${mediaServerUrl}/api/media/delete/video/${fileName}`, {
            method: 'DELETE',
            headers: {
              'Authorization': req.header('Authorization') || ''
            }
          }).catch(err => console.error('[VIDEO_CLEANUP_ERROR]', err.message));
        }
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
        const localPath = path.join(__dirname, '../../uploads/stores', oldFileName);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }

        if (process.env.NODE_ENV === 'production') {
          const mediaServerUrl = process.env.MEDIA_SERVER_URL || 'https://trendy-telemetry.sytes.net';
          await fetch(`${mediaServerUrl}/api/media/delete/store/${oldFileName}`, {
            method: 'DELETE',
            headers: {
              'Authorization': req.header('Authorization') || ''
            }
          }).catch(err => console.error('[IMAGE_CLEANUP_ERROR]', err.message));
        }
      }
    } catch (err) {
      console.error('[IMAGE_CLEANUP_FAILED]', err.message);
    }
  }

  async cloneCatalog(sourceStoreId, targetStoreId, connection) {
    // 1. Clonar asociaciones de menus
    const [menus] = await connection.query(
      'SELECT menu_id, disponible FROM store_menus WHERE store_id = ?', 
      [sourceStoreId]
    );
    for (const menu of menus) {
      await connection.query(
        'INSERT INTO store_menus (store_id, menu_id, disponible) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE disponible = VALUES(disponible)',
        [targetStoreId, menu.menu_id, menu.disponible]
      );
    }

    // 2. Clonar asociaciones de categorias
    const [categories] = await connection.query(
      'SELECT categoria_id, disponible FROM store_categories WHERE store_id = ?',
      [sourceStoreId]
    );
    for (const cat of categories) {
      await connection.query(
        'INSERT INTO store_categories (store_id, categoria_id, disponible) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE disponible = VALUES(disponible)',
        [targetStoreId, cat.categoria_id, cat.disponible]
      );
    }

    // 3. Clonar asociaciones de productos (incluyendo sobreescrituras locales)
    const [products] = await connection.query(
      'SELECT product_id, precio_local, tiempo_prep_local, disponible FROM store_products WHERE store_id = ?',
      [sourceStoreId]
    );
    for (const prod of products) {
      await connection.query(
        `INSERT INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
           precio_local = VALUES(precio_local), 
           tiempo_prep_local = VALUES(tiempo_prep_local), 
           disponible = VALUES(disponible)`,
        [targetStoreId, prod.product_id, prod.precio_local, prod.tiempo_prep_local, prod.disponible]
      );
    }
  }

  async subscribePlan(userContext, data, req) {
    const { storeId, commerceId: bodyCommerceId } = data;
    const isSystem = userContext.actorType === 'system_user';
    const commerceId = isSystem ? bodyCommerceId : userContext.commerceId;

    if (!storeId || !commerceId) {
      throw new BusinessError('storeId y commerceId son requeridos.');
    }

    const store = await storeRepository.findById(storeId);
    if (!store || store.commerce_id !== Number(commerceId)) {
      throw new ForbiddenError('La sede especificada no pertenece al comercio autorizado.');
    }

    const domiEngine = require('../../services/domiEngine');
    try {
      await domiEngine.chargeStoreSubscription(commerceId, storeId, 50.00);
    } catch (engineErr) {
      if (engineErr.message.includes('Saldo insuficiente')) {
        throw new BusinessError(engineErr.message, 402);
      }
      throw engineErr;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);

    const [planResult] = await db.query(`
      INSERT INTO commerce_plans (commerce_id, plan_type, status, price_paid_domis, start_date, end_date, payment_ref)
      VALUES (?, 'Empresarial', 'active', 50.00, ?, ?, ?)
    `, [commerceId, startDate, endDate, `DOMI-SUB-${storeId}-${Date.now()}`]);

    await db.query('UPDATE commerces SET type = "Empresarial" WHERE id = ?', [commerceId]);

    await logSecurityEvent(
      userContext.id,
      'SUBSCRIBE_PLAN',
      'HIGH',
      req,
      { storeId, commerceId, planId: planResult.insertId },
      'store',
      parseInt(storeId)
    );

    return {
      success: true,
      message: 'Suscripcion mensual al plan Empresarial activada con exito.',
      planId: planResult.insertId,
      startDate,
      endDate
    };
  }
}

module.exports = new StoreService();
