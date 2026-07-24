const catalogRepository = require('../catalog.repository');
const storeRepository = require('../../store/store.repository');
const db = require('../../../config/db');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const appLogger = require('../../../utils/appLogger');

class CatalogMenuService {
  constructor(catalogService) {
    this.catalogService = catalogService;
  }

  async getMenus(userContext, storeId, commerceId) {
    const targetStoreId = storeId ? Number(storeId) : null;
    const targetCommerceId = commerceId ? Number(commerceId) : (userContext.commerceId ? Number(userContext.commerceId) : null);
    const isSystem = userContext.actorType === 'system_user';

    // BOLA Check: si se pasa storeId y no es sistema, verificar propiedad de la sede
    if (targetStoreId && !isSystem) {
      const store = await storeRepository.findById(targetStoreId);
      if (!store || store.commerce_id !== userContext.commerceId) {
        throw new ForbiddenError('No autorizado para ver los menús de esta sede.');
      }
    }
    
    return await catalogRepository.findMenus(targetStoreId, targetCommerceId, isSystem);
  }

  async getMenusByCommerce(userContext, commerceId) {
    const targetCommerceId = Number(commerceId);
    const isSystem = userContext.actorType === 'system_user';

    // BOLA Check
    if (!isSystem && userContext.commerceId !== targetCommerceId) {
      throw new ForbiddenError('No autorizado para ver los menús de este comercio.');
    }

    return await catalogRepository.findMenusByCommerce(targetCommerceId);
  }

  async saveMenu(userContext, data, req) {
    const { id, store_id, commerce_id, nombre, descripcion, orden, disponible } = data;
    const isSystem = userContext.actorType === 'system_user';
    let targetStoreId = store_id ? Number(store_id) : null;

    if (!targetStoreId && !id && commerce_id) {
      const [firstStore] = await db.query('SELECT id FROM stores WHERE commerce_id = ? LIMIT 1', [commerce_id]);
      if (firstStore && firstStore[0]) {
        targetStoreId = firstStore[0].id;
      }
    }

    if (!targetStoreId && !id) {
      throw new BusinessError('Falta store_id para esta operación.');
    }

    let finalStoreId = targetStoreId;
    if (id) {
      const existing = await catalogRepository.findMenuById(id);
      if (!existing) throw new NotFoundError('Menú no encontrado.');
      finalStoreId = existing.store_id;
    }

    const store = await storeRepository.findById(finalStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    // BOLA Check
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { storeId: finalStoreId, action: id ? 'modify_menu' : 'create_menu' },
        'store',
        finalStoreId
      );
      throw new ForbiddenError('No autorizado para realizar esta acción.');
    }

    if (id) {
      await catalogRepository.updateMenu(id, { ...data, store_id: finalStoreId });
      await logSecurityEvent(
        userContext.id,
        'WRITE_CATALOG',
        'LOW',
        req,
        { menuId: Number(id), action: 'update_menu', nombre },
        'store',
        finalStoreId
      );
      return id;
    } else {
      const newId = await catalogRepository.createMenu({ ...data, store_id: finalStoreId });
      await logSecurityEvent(
        userContext.id,
        'WRITE_CATALOG',
        'LOW',
        req,
        { menuId: newId, action: 'create_menu', nombre },
        'store',
        finalStoreId
      );
      return newId;
    }
  }

  async deleteMenu(userContext, id, req) {
    const targetId = Number(id);
    const isSystem = userContext.actorType === 'system_user';

    const menu = await catalogRepository.findMenuById(targetId);
    if (!menu) throw new NotFoundError('Menú no encontrado.');

    if (!isSystem) {
      const isOwner = await catalogRepository.checkMenuOwnership(targetId, userContext.commerceId);
      if (!isOwner) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { menuId: targetId, action: 'delete_menu' },
          'commerce',
          userContext.commerceId
        );
        throw new ForbiddenError('No autorizado para eliminar este menú.');
      }
    }

    const [prodImages] = await db.query(`
      SELECT p.image_url FROM products p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE c.menu_id = ? AND p.image_url IS NOT NULL AND p.deleted_at IS NULL
    `, [targetId]);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await catalogRepository.softDeleteMenu(targetId, conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    for (const p of prodImages) {
      if (p.image_url) {
        this.catalogService.cleanupProductImage(p.image_url).catch(() => {});
      }
    }

    await logSecurityEvent(
      userContext.id,
      'DELETE_CATALOG',
      'LOW',
      req,
      { menuId: targetId, action: 'soft_delete_menu', cascade: true },
      'commerce',
      userContext.commerceId
    );
    return true;
  }

  async getStoreMenus(userContext, storeId, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(storeId);

    if (!isSystem) {
      const store = await storeRepository.findById(targetStoreId);
      if (!store || store.commerce_id !== userContext.commerceId) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: targetStoreId, action: 'view_store_menus' },
          'store',
          targetStoreId
        );
        throw new ForbiddenError('Acceso no autorizado.');
      }
    }

    return await catalogRepository.findStoreMenusAvailability(targetStoreId);
  }

  async toggleStoreMenu(userContext, data, req) {
    const { store_id, menu_id, disponible } = data;
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(store_id);
    const targetMenuId = Number(menu_id);

    if (!isSystem) {
      const store = await storeRepository.findById(targetStoreId);
      if (!store || store.commerce_id !== userContext.commerceId) {
        throw new ForbiddenError('Acceso no autorizado.');
      }
      
      const isMenuOwner = await catalogRepository.checkMenuOwnership(targetMenuId, userContext.commerceId);
      if (!isMenuOwner) {
        throw new ForbiddenError('No autorizado para modificar este menú.');
      }
    }

    await catalogRepository.toggleStoreMenu(targetStoreId, targetMenuId, disponible ? 1 : 0);

    await logSecurityEvent(
      userContext.id,
      'TOGGLE_STORE_MENU',
      'MEDIUM',
      req,
      { storeId: targetStoreId, menuId: targetMenuId, disponible },
      'store',
      targetStoreId
    );

    return true;
  }

  async getCategories(userContext, menuId, req) {
    const targetMenuId = Number(menuId);
    const isSystem = userContext.actorType === 'system_user';

    if (!isSystem) {
      const isOwner = await catalogRepository.checkMenuOwnership(targetMenuId, userContext.commerceId);
      if (!isOwner) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { menuId: targetMenuId, action: 'view_categories' },
          'commerce',
          userContext.commerceId
        );
        throw new ForbiddenError('No autorizado para ver las categorías de este menú.');
      }
    }

    const [menuRows] = await db.query(
      'SELECT s.commerce_id FROM menus m JOIN stores s ON m.store_id = s.id WHERE m.id = ?',
      [targetMenuId]
    );
    const commerceId = menuRows[0] ? menuRows[0].commerce_id : null;

    const categories = await catalogRepository.findCategories(targetMenuId);
    return await this.catalogService.applyCategoryLimits(commerceId, categories);
  }

  async saveCategory(userContext, data, req) {
    const { id, menu_id, nombre, disponible } = data;
    const isSystem = userContext.actorType === 'system_user';
    const targetMenuId = Number(menu_id);

    let finalMenuId = targetMenuId;
    if (id) {
      const existing = await catalogRepository.findCategoryById(id);
      if (!existing) throw new NotFoundError('Categoría no encontrada.');
      finalMenuId = existing.menu_id;
    }

    // BOLA Check
    if (!isSystem) {
      const isOwner = await catalogRepository.checkMenuOwnership(finalMenuId, userContext.commerceId);
      if (!isOwner) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { menuId: finalMenuId, action: id ? 'modify_category' : 'create_category' },
          'commerce',
          userContext.commerceId
        );
        throw new ForbiddenError('No autorizado para realizar esta acción.');
      }
    }

    if (id) {
      await catalogRepository.updateCategory(id, data);
      await logSecurityEvent(
        userContext.id,
        'WRITE_CATALOG',
        'LOW',
        req,
        { categoriaId: Number(id), action: 'update_category', nombre },
        'commerce',
        userContext.commerceId
      );
      return id;
    } else {
      const newId = await catalogRepository.createCategory(data);
      await logSecurityEvent(
        userContext.id,
        'WRITE_CATALOG',
        'LOW',
        req,
        { categoriaId: newId, action: 'create_category', nombre },
        'commerce',
        userContext.commerceId
      );
      return newId;
    }
  }

  async deleteCategory(userContext, id, req) {
    const targetId = Number(id);
    const isSystem = userContext.actorType === 'system_user';

    const category = await catalogRepository.findCategoryById(targetId);
    if (!category) throw new NotFoundError('Categoría no encontrada.');

    if (!isSystem) {
      const isOwner = await catalogRepository.checkCategoryOwnership(targetId, userContext.commerceId);
      if (!isOwner) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { categoriaId: targetId, action: 'delete_category' },
          'commerce',
          userContext.commerceId
        );
        throw new ForbiddenError('No autorizado para eliminar esta categoría.');
      }
    }

    const [prodImages] = await db.query(
      'SELECT image_url FROM products WHERE categoria_id = ? AND image_url IS NOT NULL AND deleted_at IS NULL',
      [targetId]
    );

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await catalogRepository.softDeleteCategory(targetId, conn);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    for (const p of prodImages) {
      if (p.image_url) {
        this.catalogService.cleanupProductImage(p.image_url).catch(() => {});
      }
    }

    await logSecurityEvent(
      userContext.id,
      'DELETE_CATALOG',
      'LOW',
      req,
      { categoriaId: targetId, action: 'soft_delete_category', cascade: true },
      'commerce',
      userContext.commerceId
    );
    return true;
  }

  async getMenuDeletePreview(userContext, id, req) {
    const targetId = Number(id);
    const isSystem = userContext.actorType === 'system_user';

    const menu = await catalogRepository.findMenuById(targetId);
    if (!menu) throw new NotFoundError('Menú no encontrado.');

    if (!isSystem) {
      const isOwner = await catalogRepository.checkMenuOwnership(targetId, userContext.commerceId);
      if (!isOwner) throw new ForbiddenError('No autorizado.');
    }

    const preview = await catalogRepository.getMenuDeletePreview(targetId);
    return { menus: 1, ...preview };
  }

  async getCategoryDeletePreview(userContext, id, req) {
    const targetId = Number(id);
    const isSystem = userContext.actorType === 'system_user';

    const category = await catalogRepository.findCategoryById(targetId);
    if (!category) throw new NotFoundError('Categoría no encontrada.');

    if (!isSystem) {
      const isOwner = await catalogRepository.checkCategoryOwnership(targetId, userContext.commerceId);
      if (!isOwner) throw new ForbiddenError('No autorizado.');
    }

    const preview = await catalogRepository.getCategoryDeletePreview(targetId);
    return { categorias: 1, ...preview };
  }

  async getStoreCategories(userContext, storeId, menuId, req) {
    const targetStoreId = Number(storeId);
    const targetMenuId = Number(menuId);
    const isSystem = userContext.actorType === 'system_user';

    const store = await storeRepository.findById(targetStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    if (!isSystem) {
      if (store.commerce_id !== userContext.commerceId) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: targetStoreId, action: 'view_store_categories' },
          'store',
          targetStoreId
        );
        throw new ForbiddenError('Acceso no autorizado.');
      }
    }

    const categories = await catalogRepository.findStoreCategoriesWithAvailability(targetStoreId, targetMenuId);
    return await this.catalogService.applyCategoryLimits(store.commerce_id, categories);
  }

  async toggleStoreCategory(userContext, data, req) {
    const { store_id, categoria_id, disponible } = data;
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(store_id);
    const targetCategoryId = Number(categoria_id);

    const store = await storeRepository.findById(targetStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    if (!isSystem) {
      if (store.commerce_id !== userContext.commerceId) {
        throw new ForbiddenError('Acceso no autorizado.');
      }

      const isCategoryOwner = await catalogRepository.checkCategoryOwnership(targetCategoryId, userContext.commerceId);
      if (!isCategoryOwner) {
        throw new ForbiddenError('No autorizado para modificar esta categoría.');
      }
    }

    if (disponible) {
      const [rows] = await db.query('SELECT menu_id FROM categorias WHERE id = ?', [targetCategoryId]);
      const menuId = rows[0] ? rows[0].menu_id : null;
      if (menuId) {
        const categories = await catalogRepository.findStoreCategoriesWithAvailability(targetStoreId, menuId);
        const limitedCategories = await this.catalogService.applyCategoryLimits(store.commerce_id, categories);
        const target = limitedCategories.find(c => Number(c.id) === targetCategoryId);
        if (target && target.locked) {
          await logSecurityEvent(
            userContext.id,
            'LIMIT_BYPASS_ATTEMPT',
            'HIGH',
            req,
            { storeId: targetStoreId, categoryId: targetCategoryId, type: 'category' },
            'store',
            targetStoreId
          );
          throw new ForbiddenError('Límite del plan excedido. No es posible activar esta categoría.');
        }
      }
    }

    await catalogRepository.toggleStoreCategory(targetStoreId, targetCategoryId, disponible ? 1 : 0);

    await logSecurityEvent(
      userContext.id,
      'TOGGLE_STORE_CATEGORY',
      'MEDIUM',
      req,
      { storeId: targetStoreId, categoriaId: targetCategoryId, disponible },
      'store',
      targetStoreId
    );

    return true;
  }
}

module.exports = CatalogMenuService;
