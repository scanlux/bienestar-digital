const db = require('../../config/db');
const domiEngine = require('../../services/domiEngine');
const crypto = require('crypto');
const upgradesRepository = require('./upgrades.repository');
const domiRedis = require('../../services/domiRedis');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const redisClient = require('../../config/redis');
const upgradesHelper = require('./upgrades.helper');
const storeQuotaService = require('../store/store.quota.service');

class UpgradesService {
  async getActiveUpgrades(userContext, req) {
    const isSystem = userContext && userContext.actorType === 'system_user';
    let targetCommerceId = null;
    let entityType = 'commerce';
    let entityId = null;

    if (!isSystem) {
      const userRoles = userContext.roles || [];
      if (userRoles.includes('store_admin') || userContext.rol === 'store_admin') {
        const [[store]] = await db.query('SELECT id, commerce_id FROM stores WHERE usuario_id = ?', [userContext.id]);
        if (store) {
          entityType = 'store';
          entityId = store.id;
          targetCommerceId = store.commerce_id;
        }
      } else if (userRoles.includes('commerce_manager') || userContext.rol === 'commerce_manager') {
        const [[commerce]] = await db.query('SELECT id FROM commerces WHERE usuario_id = ?', [userContext.id]);
        if (commerce) {
          entityType = 'commerce';
          entityId = commerce.id;
          targetCommerceId = commerce.id;
        }
      } else if (userRoles.includes('delivery_company_admin') || userContext.rol === 'delivery_company_admin') {
        const [[company]] = await db.query('SELECT id FROM delivery_companies WHERE usuario_id = ?', [userContext.id]);
        if (company) {
          entityType = 'delivery_company';
          entityId = company.id;
        }
      } else if (userRoles.includes('customer_driver') || userRoles.includes('customer') || userContext.rol === 'customer_driver' || userContext.rol === 'customer') {
        entityType = 'user';
        entityId = userContext.id;
      }
    } else {
      targetCommerceId = Number(req.query.commerceId);
      entityId = targetCommerceId;
    }

    if (!isSystem && !targetCommerceId && entityType === 'commerce') {
      throw new BusinessError('Debe especificar commerceId en la consulta si actúa como administrador matriz.');
    }

    const activeUpgrades = await upgradesRepository.findActiveByEntity(entityType, entityId, targetCommerceId);
    
    // Contar buffs por tipo
    const hasBusinessStatus = activeUpgrades.some(up => up.upgrade_type === 'estado_empresarial');
    const hasInfluencerStatus = activeUpgrades.some(up => up.upgrade_type === 'estatus_influencer');
    const additionalStoresCount = activeUpgrades.filter(up => up.upgrade_type === 'adicionar_sede').length;

    const freeStoresLimit = await upgradesHelper.fetchSystemParam('free_tier_stores_limit', 1);
    const bonusStoresLimit = await upgradesHelper.fetchSystemParam('business_status_bonus_stores', 1);
    const freeCategoriesLimit = await upgradesHelper.fetchSystemParam('free_tier_categories_limit', 3);
    const freeProductsLimit = await upgradesHelper.fetchSystemParam('free_tier_products_limit', 5);
    const influencerReelsLimit = await upgradesHelper.fetchSystemParam('influencer_reels_limit', 3);

    // Calcular límites dinámicos
    const systemParams = {
      free_tier_stores_limit: freeStoresLimit,
      business_status_bonus_stores: bonusStoresLimit
    };
    const storesLimit = upgradesHelper.calculateStoresLimit(systemParams, activeUpgrades);
    
    const hasUnlimitedCatalogUpgrade = activeUpgrades.some(up => up.upgrade_type === 'catalogo_ilimitado');
    const categoriesLimit = (hasBusinessStatus || hasUnlimitedCatalogUpgrade) ? null : freeCategoriesLimit;
    const productsLimit = (hasBusinessStatus || hasUnlimitedCatalogUpgrade) ? null : (freeCategoriesLimit * freeProductsLimit);
    const reelsLimit = hasInfluencerStatus ? influencerReelsLimit : 0;

    // Obtener uso real actual
    const storeIdFilter = entityType === 'store' ? entityId : null;
    const usage = await upgradesRepository.getUsageCounts(targetCommerceId, storeIdFilter);
    const activeReels = await upgradesRepository.countActiveReels(targetCommerceId);

    // Separar mejoras en buffs activos para el panel superior
    const buffs = {
      estado_empresarial: activeUpgrades.filter(up => up.upgrade_type === 'estado_empresarial'),
      estatus_influencer: activeUpgrades.filter(up => up.upgrade_type === 'estatus_influencer'),
      adicionar_sede: activeUpgrades.filter(up => up.upgrade_type === 'adicionar_sede'),
      catalogo_ilimitado: activeUpgrades.filter(up => up.upgrade_type === 'catalogo_ilimitado')
    };

    // Obtener catálogo disponible filtrado por roles del usuario
    const userRoles = userContext.roles || (userContext.rol ? [userContext.rol] : ['commerce_manager']);
    const catalog = await upgradesRepository.findCatalogByRoles(userRoles);

    return {
      upgrades: activeUpgrades,
      limits: {
        stores: { used: usage.totalStores, max: storesLimit },
        categories: { used: usage.activeCategories, max: categoriesLimit },
        products: { used: usage.activeProducts, max: productsLimit },
        reels: { used: activeReels, max: reelsLimit }
      },
      buffs,
      catalog
    };
  }

  async purchaseUpgrade(userContext, upgradeType, req) {
    const isSystem = userContext.actorType === 'system_user';
    
    let commerceId = null;
    let storeId = null;
    let deliveryCompanyId = null;
    let userId = null;

    if (!isSystem) {
      const userRoles = userContext.roles || [];
      if (userRoles.includes('store_admin') || userContext.rol === 'store_admin') {
        const [[store]] = await db.query('SELECT id, commerce_id FROM stores WHERE usuario_id = ?', [userContext.id]);
        if (store) {
          storeId = store.id;
          commerceId = store.commerce_id;
        }
      } else if (userRoles.includes('commerce_manager') || userContext.rol === 'commerce_manager') {
        const [[commerce]] = await db.query('SELECT id FROM commerces WHERE usuario_id = ?', [userContext.id]);
        if (commerce) {
          commerceId = commerce.id;
          if (req.body && req.body.storeId) {
            storeId = Number(req.body.storeId);
          }
        }
      } else if (userRoles.includes('delivery_company_admin') || userContext.rol === 'delivery_company_admin') {
        const [[company]] = await db.query('SELECT id FROM delivery_companies WHERE usuario_id = ?', [userContext.id]);
        if (company) {
          deliveryCompanyId = company.id;
        }
      } else if (userRoles.includes('customer_driver') || userRoles.includes('customer') || userContext.rol === 'customer_driver' || userContext.rol === 'customer') {
        userId = userContext.id;
      }
    }

    const targetCommerceId = isSystem ? Number(req.body.commerceId) : commerceId;
    if (!targetCommerceId) {
      throw new BusinessError('Falta especificar commerceId para procesar la compra.');
    }

    const catalogEntry = await upgradesRepository.findCatalogEntry(upgradeType);
    if (!catalogEntry || catalogEntry.is_active !== 1) {
      throw new BusinessError('El tipo de mejora no existe o ha sido desactivado del catálogo.');
    }

    const price = parseFloat(catalogEntry.price_domis);
    const durationDays = catalogEntry.duration_days;
    const benefitScope = catalogEntry.benefit_scope;

    let walletOwnerType = 'commerce';
    let walletOwnerId = targetCommerceId;

    if (!isSystem) {
      const userRoles = userContext.roles || [];
      if (userRoles.includes('store_admin') || userContext.rol === 'store_admin') {
        walletOwnerType = 'store';
        walletOwnerId = storeId;
      } else if (userRoles.includes('delivery_company_admin') || userContext.rol === 'delivery_company_admin') {
        walletOwnerType = 'delivery_company';
        walletOwnerId = deliveryCompanyId;
      } else if (userRoles.includes('customer_driver') || userRoles.includes('customer') || userContext.rol === 'customer_driver' || userContext.rol === 'customer') {
        walletOwnerType = 'user';
        walletOwnerId = userId;
      } else if (userRoles.includes('commerce_manager') || userContext.rol === 'commerce_manager') {
        walletOwnerType = 'commerce';
        walletOwnerId = targetCommerceId;
      } else {
        throw new ForbiddenError('Su rol no cuenta con permisos para adquirir mejoras.');
      }
    } else {
      // System user
      if (req.body.storeId) {
        storeId = Number(req.body.storeId);
        walletOwnerType = 'store';
        walletOwnerId = storeId;
      } else if (req.body.deliveryCompanyId) {
        deliveryCompanyId = Number(req.body.deliveryCompanyId);
        walletOwnerType = 'delivery_company';
        walletOwnerId = deliveryCompanyId;
      } else if (req.body.userId) {
        userId = Number(req.body.userId);
        walletOwnerType = 'user';
        walletOwnerId = userId;
      }
    }

    // Si la mejora es global del comercio, anulamos la asignación a la sub-entidad beneficiaria
    // pero la billetera de pago sigue siendo la de la sub-entidad
    if (benefitScope === 'global') {
      storeId = null;
      deliveryCompanyId = null;
      userId = null;
    }

    // Validar límite max_per_commerce (a nivel global del comercio)
    if (catalogEntry.max_per_commerce !== null) {
      const activeCount = await upgradesRepository.countActiveUpgradesByType({
        commerceId: targetCommerceId,
        upgradeType
      });
      if (activeCount >= catalogEntry.max_per_commerce) {
        throw new BusinessError(`El comercio ya tiene el máximo permitido de esta mejora (${catalogEntry.max_per_commerce} activa/s).`);
      }
    }

    // Validar límite max_per_entity (a nivel de entidad específica)
    if (catalogEntry.max_per_entity !== null) {
      const entityActiveCount = await upgradesRepository.countActiveUpgradesByType({
        commerceId: targetCommerceId,
        upgradeType,
        storeId,
        deliveryCompanyId,
        userId
      });
      if (entityActiveCount >= catalogEntry.max_per_entity) {
        throw new BusinessError(`Esta entidad ya tiene el máximo permitido de esta mejora (${catalogEntry.max_per_entity} activa/s).`);
      }
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Establecer el usuario de la sesión para los triggers de seguridad de la base de datos
      await connection.query('SET @domi_session_user_id = ?', [userContext.id]);

      // 1. Obtener la billetera pagadora con bloqueo de fila (Double Spending Protection)
      let targetUserId = null;
      let isSystem = false;

      if (walletOwnerType === 'user') {
        targetUserId = walletOwnerId;
      } else if (walletOwnerType === 'store') {
        const [rows] = await connection.query('SELECT usuario_id FROM stores WHERE id = ?', [walletOwnerId]);
        targetUserId = rows[0]?.usuario_id || null;
      } else if (walletOwnerType === 'commerce') {
        const [rows] = await connection.query('SELECT usuario_id FROM commerces WHERE id = ?', [walletOwnerId]);
        targetUserId = rows[0]?.usuario_id || null;
      } else if (walletOwnerType === 'delivery_company') {
        const [rows] = await connection.query('SELECT usuario_id FROM delivery_companies WHERE id = ?', [walletOwnerId]);
        targetUserId = rows[0]?.usuario_id || null;
      } else if (walletOwnerType === 'system') {
        isSystem = true;
      }

      let wallets = [];
      if (isSystem) {
        [wallets] = await connection.query(
          `SELECT id, balance_custody FROM wallets WHERE is_system = 1 FOR UPDATE`
        );
      } else if (targetUserId) {
        [wallets] = await connection.query(
          `SELECT id, balance_custody FROM wallets WHERE user_id = ? FOR UPDATE`,
          [targetUserId]
        );
      }
      const wallet = wallets[0];

      if (!wallet) {
        throw new BusinessError('No se encontró una billetera con fondos asociada para procesar este pago.');
      }

      const balance = parseFloat(wallet.balance_custody);
      if (balance < price) {
        throw new BusinessError(`Saldo insuficiente en DOMIs. Disponible: ${balance.toFixed(2)}, Requerido: ${price.toFixed(2)}`);
      }

      // 2. Obtener billetera de utilidad del sistema
      const [[systemWallet]] = await connection.query('SELECT id FROM wallets WHERE is_system = 1 LIMIT 1');
      if (!systemWallet) {
        throw new Error('La billetera del sistema no está inicializada.');
      }

      // 3. Descontar saldo y depositar en sistema
      await connection.query('UPDATE wallets SET balance_custody = balance_custody - ? WHERE id = ?', [price, wallet.id]);
      await connection.query('UPDATE wallets SET balance_utility = balance_utility + ? WHERE id = ?', [price, systemWallet.id]);

      // 4. Registrar transacción en el ledger central
      const [tokenRows] = await connection.query('SELECT * FROM token_registry LIMIT 1');
      const [ruleRows] = await connection.query('SELECT * FROM protocol_rules LIMIT 1');

      const fiatPeg = parseFloat(tokenRows[0].fiat_peg_cop || 400.0000);
      const amountFiatCop = price * fiatPeg;

      const [[commerceInfo]] = await connection.query(
        'SELECT nombre FROM commerces WHERE id = ?',
        [targetCommerceId]
      );
      const commerceName = commerceInfo ? commerceInfo.nombre : `Comercio #${targetCommerceId}`;

      const notes = `Compra de mejora [${upgradeType}] financiada por [${walletOwnerType} #${walletOwnerId}] para el comercio ${commerceName}`;
      const txHash = await domiEngine.appendLedger(connection, {
        txType: 'service_charge',
        fromWalletId: wallet.id,
        toWalletId: systemWallet.id,
        amountDomis: price,
        amountFiatCop,
        referenceType: 'manual',
        referenceId: targetCommerceId,
        protocolSnapshot: { token: tokenRows[0], rules: ruleRows[0] },
        notes
      });

      // 5. Calcular fecha de expiración
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // 6. Insertar mejora activa con llaves explícitas
      const upgradeId = await upgradesRepository.createUpgrade(connection, {
        commerceId: targetCommerceId,
        upgradeType,
        priceDomis: price,
        expiresAt,
        storeId,
        deliveryCompanyId,
        userId
      });

      await logSecurityEvent(
        userContext.id,
        'UPGRADE_PURCHASED',
        'MEDIUM',
        req,
        { upgradeId, upgradeType, priceDomis: price, commerceId: targetCommerceId, storeId, deliveryCompanyId, userId },
        'commerce',
        targetCommerceId
      );

      if (upgradeType === 'adicionar_sede' || upgradeType === 'estado_empresarial') {
        await storeQuotaService.enforceStoreQuota(targetCommerceId, connection, req);
      }

      await connection.commit();

      // Sincronizar en caché de Redis
      try {
        await domiRedis.decrementBalance('user', targetUserId, price);
      } catch (redisErr) {
        await logSecurityEvent(
          userContext.id,
          'REDIS_CACHE_SYNC_FAILURE',
          'MEDIUM',
          req,
          { error: redisErr.message, upgradeType, userId: targetUserId, price },
          'commerce',
          targetCommerceId
        );
      }

      return {
        success: true,
        upgradeId,
        upgradeType,
        price,
        expiresAt,
        message: `Mejora '${upgradeType}' adquirida con éxito.`
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
  async getCatalog(userContext) {
    return await upgradesRepository.findAllCatalog();
  }

  async createCatalogEntry(userContext, body, req) {
    const { upgrade_key, label, description, icon, price_domis, duration_days, is_subscription, max_per_commerce, target_role, is_active } = body;

    if (!upgrade_key || !/^[a-z0-9_]+$/.test(upgrade_key)) {
      throw new BusinessError('La clave técnica de la mejora debe contener únicamente letras minúsculas, números y guiones bajos.');
    }
    if (!label || label.trim().length < 3) {
      throw new BusinessError('El nombre legible de la mejora debe tener al menos 3 caracteres.');
    }
    if (!description || description.trim().length === 0) {
      throw new BusinessError('La descripción del beneficio no puede estar vacía.');
    }

    const price = price_domis !== undefined ? parseFloat(price_domis) : 0;
    const duration = duration_days !== undefined ? parseInt(duration_days, 10) : 30;
    const isSub = is_subscription ? 1 : 0;
    const maxPerComm = max_per_commerce === null || max_per_commerce === '' ? null : parseInt(max_per_commerce, 10);
    const targetRol = target_role || 'commerce_manager';
    const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    if (isNaN(price) || price < 0) {
      throw new BusinessError('El precio en DOMIs debe ser un número mayor o igual a cero.');
    }
    if (isNaN(duration) || duration < 1) {
      throw new BusinessError('La duración estándar en días debe ser un número mayor o igual a 1.');
    }

    // Verificar si ya existe esa clave técnica
    const existingEntry = await upgradesRepository.findCatalogEntry(upgrade_key);
    if (existingEntry) {
      throw new BusinessError(`Ya existe una mejora registrada con la clave técnica '${upgrade_key}'.`);
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query('SET @domi_is_root = 1');
      await connection.query('SET @domi_bypass_security = 1');

      const insertId = await upgradesRepository.createCatalogEntry(connection, {
        upgrade_key,
        label,
        description,
        icon: icon || 'star',
        price_domis: price,
        duration_days: duration,
        is_subscription: isSub,
        max_per_commerce: maxPerComm,
        target_role: targetRol,
        is_active: active
      });

      // Auditoria
      await logSecurityEvent(
        userContext.id,
        'UPGRADE_CATALOG_CREATED',
        'HIGH',
        req,
        {
          upgrade_key,
          label,
          price_domis: price,
          duration_days: duration,
          is_subscription: isSub,
          target_role: targetRol,
          is_active: active
        },
        'upgrade_catalog',
        insertId
      );

      await connection.commit();
      return { success: true, insertId, message: 'Mejora creada exitosamente en el catálogo.' };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      try {
        await connection.query('SET @domi_is_root = NULL, @domi_bypass_security = NULL');
      } catch (e) {
        // Ignorar
      }
      connection.release();
    }
  }

  async updateCatalogEntry(userContext, upgradeKey, body, req) {
    const oldEntry = await upgradesRepository.findCatalogEntry(upgradeKey);
    if (!oldEntry) {
      throw new NotFoundError('No se encontró la mejora en el catálogo.');
    }

    const priceDomis = body.price_domis !== undefined ? parseFloat(body.price_domis) : parseFloat(oldEntry.price_domis);
    const durationDays = body.duration_days !== undefined ? parseInt(body.duration_days, 10) : oldEntry.duration_days;
    const description = body.description || oldEntry.description;
    const maxPerCommerce = body.max_per_commerce !== undefined ? (body.max_per_commerce === null || body.max_per_commerce === '' ? null : parseInt(body.max_per_commerce, 10)) : oldEntry.max_per_commerce;
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : oldEntry.is_active;
    const isSubscription = body.is_subscription !== undefined ? (body.is_subscription ? 1 : 0) : oldEntry.is_subscription;
    const targetRole = body.target_role || oldEntry.target_role;

    if (isNaN(priceDomis) || priceDomis < 0) {
      throw new BusinessError('El precio en DOMIs debe ser un número mayor o igual a cero.');
    }
    if (isNaN(durationDays) || durationDays < 1) {
      throw new BusinessError('La duración en días debe ser un número entero mayor o igual a 1.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query('SET @domi_is_root = 1');
      await connection.query('SET @domi_bypass_security = 1');

      await upgradesRepository.updateCatalogEntry(connection, upgradeKey, {
        price_domis: priceDomis,
        duration_days: durationDays,
        description,
        max_per_commerce: maxPerCommerce,
        is_active: isActive,
        is_subscription: isSubscription,
        target_role: targetRole
      });

      // Auditoria
      await logSecurityEvent(
        userContext.id,
        'UPGRADE_CATALOG_UPDATED',
        'HIGH',
        req,
        {
          upgradeKey,
          before: {
            price_domis: oldEntry.price_domis,
            duration_days: oldEntry.duration_days,
            description: oldEntry.description,
            max_per_commerce: oldEntry.max_per_commerce,
            is_active: oldEntry.is_active,
            is_subscription: oldEntry.is_subscription,
            target_role: oldEntry.target_role
          },
          after: {
            price_domis: priceDomis,
            duration_days: durationDays,
            description,
            max_per_commerce: maxPerCommerce,
            is_active: isActive,
            is_subscription: isSubscription,
            target_role: targetRole
          }
        },
        'upgrade_catalog',
        oldEntry.id
      );

      await connection.commit();
      return { success: true, message: 'Entrada del catálogo actualizada exitosamente.' };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      try {
        await connection.query('SET @domi_is_root = NULL, @domi_bypass_security = NULL');
      } catch (e) {
        // Ignorar
      }
      connection.release();
    }
  }

  async getAllUpgradesAdmin(userContext, filters, req) {
    return await upgradesRepository.findAllUpgradesAdmin(filters);
  }

  async grantUpgradeManual(userContext, body, req) {
    const { commerceId, upgradeKey, durationDays, reason, storeId = null, deliveryCompanyId = null, userId = null } = body;

    if (!commerceId) {
      throw new BusinessError('Falta especificar el comercio.');
    }
    if (!upgradeKey) {
      throw new BusinessError('Falta especificar el tipo de mejora.');
    }
    if (!reason || reason.trim().length < 10) {
      throw new BusinessError('Debe especificar una razón válida (mínimo 10 caracteres).');
    }

    // Verificar si el comercio existe
    const [commerces] = await db.query('SELECT id, razon_social FROM commerces WHERE id = ?', [commerceId]);
    if (commerces.length === 0) {
      throw new NotFoundError('El comercio especificado no existe.');
    }

    // Verificar catálogo
    const catalogEntry = await upgradesRepository.findCatalogEntry(upgradeKey);
    if (!catalogEntry) {
      throw new NotFoundError('La mejora especificada no existe en el catálogo.');
    }

    // Validar concordancia de sub-entidad si existe
    if (storeId !== null) {
      const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
      if (stores.length === 0) throw new BusinessError('La sede no pertenece al comercio especificado o no existe.');
    }

    if (deliveryCompanyId !== null) {
      const [companies] = await db.query('SELECT id FROM delivery_companies WHERE id = ?', [deliveryCompanyId]);
      if (companies.length === 0) throw new BusinessError('La empresa repartidora no existe.');
    }

    if (userId !== null) {
      const [users] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
      if (users.length === 0) throw new BusinessError('El usuario especificado no existe.');
    }

    const days = durationDays !== undefined ? parseInt(durationDays, 10) : catalogEntry.duration_days;
    if (isNaN(days) || days < 1) {
      throw new BusinessError('La duración en días debe ser un número entero mayor o igual a 1.');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Buscar billetera del comercio para registrar en el ledger (preferir "commerce" o fallback "user")
      const [commerceWallets] = await connection.query(
        'SELECT id FROM wallets WHERE commerce_id = ? LIMIT 1',
        [commerceId]
      );
      let walletId = commerceWallets[0]?.id || null;

      if (!walletId) {
        const [userWallets] = await connection.query(
          'SELECT id FROM wallets WHERE user_id = (SELECT usuario_id FROM commerces WHERE id = ?) LIMIT 1',
          [commerceId]
        );
        walletId = userWallets[0]?.id || null;
      }

      await connection.query('SET @domi_bypass_security = 1');

      // Crear la mejora
      const upgradeId = await upgradesRepository.grantUpgradeManual(connection, {
        commerceId,
        upgradeKey,
        priceDomis: 0.0000,
        expiresAt,
        storeId,
        deliveryCompanyId,
        userId
      });

      // Escribir en domi_ledger para auditoria
      const [tokenRows] = await connection.query('SELECT * FROM token_registry LIMIT 1');
      const [ruleRows] = await connection.query('SELECT * FROM protocol_rules LIMIT 1');

      const notes = `Otorgamiento manual administrativo sin cobro. Razón: ${reason}`;
      
      await domiEngine.appendLedger(connection, {
        txType: 'admin_grant',
        fromWalletId: walletId,
        toWalletId: null,
        amountDomis: 0.0000,
        amountFiatCop: 0.0000,
        referenceType: 'manual',
        referenceId: commerceId,
        protocolSnapshot: { token: tokenRows[0], rules: ruleRows[0] },
        notes
      });

      // Auditoria en security_audit_logs
      await logSecurityEvent(
        userContext.id,
        'UPGRADE_MANUAL_GRANT',
        'HIGH',
        req,
        { commerceId, upgradeKey, durationDays: days, reason, upgradeId },
        'commerce',
        commerceId
      );

      await connection.commit();

      return {
        success: true,
        upgradeId,
        upgradeType: upgradeKey,
        expiresAt,
        message: `Mejora '${upgradeKey}' otorgada manualmente con éxito por ${days} días.`
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      try {
        await connection.query('SET @domi_is_root = NULL, @domi_bypass_security = NULL');
      } catch (e) {
        // Ignorar
      }
      connection.release();
    }
  }

  async revokeUpgrade(userContext, upgradeId, req) {
    const upgrade = await upgradesRepository.findUpgradeById(upgradeId);
    if (!upgrade) {
      throw new NotFoundError('No se encontró la mejora.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query('SET @domi_bypass_security = 1');
      await upgradesRepository.revokeUpgrade(connection, upgradeId);

      // Auditoria
      await logSecurityEvent(
        userContext.id,
        'UPGRADE_REVOKED',
        'HIGH',
        req,
        { upgradeId, commerceId: upgrade.commerce_id, upgradeType: upgrade.upgrade_type },
        'commerce',
        upgrade.commerce_id
      );

      if (upgrade.upgrade_type === 'adicionar_sede' || upgrade.upgrade_type === 'estado_empresarial') {
        await storeQuotaService.enforceStoreQuota(upgrade.commerce_id, connection, req);
        await logSecurityEvent(
          userContext.id,
          'UPGRADE_REVOKED_ENFORCEMENT_TRIGGERED',
          'HIGH',
          req,
          { upgradeId, commerceId: upgrade.commerce_id, upgradeType: upgrade.upgrade_type },
          'commerce',
          upgrade.commerce_id
        );
      }

      await connection.commit();
      return { success: true, message: 'Mejora revocada exitosamente.' };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      try {
        await connection.query('SET @domi_is_root = NULL, @domi_bypass_security = NULL');
      } catch (e) {
        // Ignorar
      }
      connection.release();
    }
  }
}

module.exports = new UpgradesService();
