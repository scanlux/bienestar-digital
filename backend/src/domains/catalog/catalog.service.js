const catalogRepository = require('./catalog.repository');
const storeRepository = require('../store/store.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');

class CatalogService {
  // --- MENUS ---
  async getMenus(userContext, storeId) {
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = storeId ? Number(storeId) : null;
    
    // BOLA Check: si se pasa storeId y no es sistema, verificar propiedad de la sede
    if (targetStoreId && !isSystem) {
      const store = await storeRepository.findById(targetStoreId);
      if (!store || store.commerce_id !== userContext.commerceId) {
        throw new ForbiddenError('No autorizado para ver los menús de esta sede.');
      }
    }
    
    return await catalogRepository.findMenus(targetStoreId, userContext.commerceId, isSystem);
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
    const { id, commerce_id, nombre, descripcion, orden, disponible } = data;
    const isSystem = userContext.actorType === 'system_user';
    const targetCommerceId = commerce_id ? Number(commerce_id) : null;

    if (!targetCommerceId && !id) {
      throw new BusinessError('Falta commerce_id para esta operación.');
    }

    let finalCommerceId = targetCommerceId;
    if (id) {
      const existing = await catalogRepository.findMenuById(id);
      if (!existing) throw new NotFoundError('Menú no encontrado.');
      finalCommerceId = existing.commerce_id;
    }

    // BOLA Check
    if (!isSystem && finalCommerceId !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { commerceId: finalCommerceId, action: id ? 'modify_menu' : 'create_menu' },
        'commerce',
        finalCommerceId
      );
      throw new ForbiddenError('No autorizado para realizar esta acción.');
    }

    if (id) {
      await catalogRepository.updateMenu(id, data);
      await logSecurityEvent(
        userContext.id,
        'WRITE_CATALOG',
        'LOW',
        req,
        { menuId: Number(id), action: 'update_menu', nombre },
        'commerce',
        finalCommerceId
      );
      return id;
    } else {
      const newId = await catalogRepository.createMenu(data);
      await logSecurityEvent(
        userContext.id,
        'WRITE_CATALOG',
        'LOW',
        req,
        { menuId: newId, action: 'create_menu', nombre },
        'commerce',
        finalCommerceId
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

    await catalogRepository.deleteMenu(targetId);
    await logSecurityEvent(
      userContext.id,
      'DELETE_CATALOG',
      'LOW',
      req,
      { menuId: targetId, action: 'delete_menu' },
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

    // Nota: store_menus mapea disponibilidad en sede
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

    // Inyección de auditoría de seguridad
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

  // --- CATEGORIAS ---
  async getCategories(userContext, menuId, req) {
    const targetMenuId = Number(menuId);
    const isSystem = userContext.actorType === 'system_user';

    // BOLA Check
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

    return await catalogRepository.findCategories(targetMenuId);
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

    await catalogRepository.deleteCategory(targetId);
    await logSecurityEvent(
      userContext.id,
      'DELETE_CATALOG',
      'LOW',
      req,
      { categoriaId: targetId, action: 'delete_category' },
      'commerce',
      userContext.commerceId
    );
    return true;
  }

  async getStoreCategories(userContext, storeId, menuId, req) {
    const targetStoreId = Number(storeId);
    const targetMenuId = Number(menuId);
    const isSystem = userContext.actorType === 'system_user';

    if (!isSystem) {
      const store = await storeRepository.findById(targetStoreId);
      if (!store || store.commerce_id !== userContext.commerceId) {
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

    // Nota: devuelve categorías de un menú específico con alias disponible as habilitada
    return await catalogRepository.findStoreCategoriesWithAvailability(targetStoreId, targetMenuId);
  }

  async toggleStoreCategory(userContext, data, req) {
    const { store_id, categoria_id, disponible } = data;
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(store_id);
    const targetCategoryId = Number(categoria_id);

    if (!isSystem) {
      const store = await storeRepository.findById(targetStoreId);
      if (!store || store.commerce_id !== userContext.commerceId) {
        throw new ForbiddenError('Acceso no autorizado.');
      }

      const isCategoryOwner = await catalogRepository.checkCategoryOwnership(targetCategoryId, userContext.commerceId);
      if (!isCategoryOwner) {
        throw new ForbiddenError('No autorizado para modificar esta categoría.');
      }
    }

    await catalogRepository.toggleStoreCategory(targetStoreId, targetCategoryId, disponible ? 1 : 0);

    // Inyección de auditoría de seguridad
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

  // --- PRODUCTOS ---
  async getProducts(userContext, queryParams, req) {
    const { categoriaId, commerceId } = queryParams || {};
    const isSystem = userContext.actorType === 'system_user';

    if (commerceId) {
      const targetCommerceId = Number(commerceId);
      // BOLA Check
      if (!isSystem && userContext.commerceId !== targetCommerceId) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { commerceId: targetCommerceId, action: 'view_commerce_products' },
          'commerce',
          targetCommerceId
        );
        throw new ForbiddenError('No autorizado para ver los productos de este comercio.');
      }
      return await catalogRepository.findProductsByCommerce(targetCommerceId);
    }

    const targetCategoryId = Number(categoriaId);
    if (isNaN(targetCategoryId)) {
      throw new BusinessError('Falta especificar categoriaId o commerceId para la consulta.');
    }

    // BOLA Check
    if (!isSystem) {
      const isOwner = await catalogRepository.checkCategoryOwnership(targetCategoryId, userContext.commerceId);
      if (!isOwner) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { categoriaId: targetCategoryId, action: 'view_products' },
          'commerce',
          userContext.commerceId
        );
        throw new ForbiddenError('No autorizado para ver los productos de esta categoría.');
      }
    }

    return await catalogRepository.findProducts(targetCategoryId);
  }

  async saveProduct(userContext, data, req) {
    const { id, store_id, categoria_id, nombre, disponible } = data;
    const isSystem = userContext.actorType === 'system_user';
    
    let finalStoreId = Number(store_id);
    let finalCategoryId = Number(categoria_id);

    if (id) {
      const existing = await catalogRepository.findProductById(id);
      if (!existing) throw new NotFoundError('Producto no encontrado.');
      finalStoreId = existing.store_id;
      finalCategoryId = existing.categoria_id;
    }

    // BOLA Check: verificar sede del producto
    const store = await storeRepository.findById(finalStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { storeId: finalStoreId, action: id ? 'modify_product' : 'create_product' },
        'store',
        finalStoreId
      );
      throw new ForbiddenError('No autorizado para realizar esta acción.');
    }

    if (id) {
      await catalogRepository.updateProduct(id, data);
      await logSecurityEvent(
        userContext.id,
        'WRITE_CATALOG',
        'LOW',
        req,
        { productId: Number(id), action: 'update_product', nombre },
        'store',
        finalStoreId
      );
      return id;
    } else {
      const newId = await catalogRepository.createProduct(data);
      await logSecurityEvent(
        userContext.id,
        'WRITE_CATALOG',
        'LOW',
        req,
        { productId: newId, action: 'create_product', nombre },
        'store',
        finalStoreId
      );
      return newId;
    }
  }

  async deleteProduct(userContext, id, req) {
    const targetId = Number(id);
    const isSystem = userContext.actorType === 'system_user';

    const product = await catalogRepository.findProductById(targetId);
    if (!product) throw new NotFoundError('Producto no encontrado.');

    if (!isSystem) {
      const isOwner = await catalogRepository.checkProductOwnership(targetId, userContext.commerceId);
      if (!isOwner) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { productId: targetId, action: 'delete_product' },
          'commerce',
          userContext.commerceId
        );
        throw new ForbiddenError('No autorizado para eliminar este producto.');
      }
    }

    await catalogRepository.deleteProduct(targetId);
    await logSecurityEvent(
      userContext.id,
      'DELETE_CATALOG',
      'LOW',
      req,
      { productId: targetId, action: 'delete_product' },
      'commerce',
      userContext.commerceId
    );
    return true;
  }

  async getStoreProducts(userContext, storeId, categoriaId, req) {
    const targetStoreId = Number(storeId);
    const targetCategoryId = Number(categoriaId);
    const isSystem = userContext.actorType === 'system_user';

    if (!isSystem) {
      const store = await storeRepository.findById(targetStoreId);
      if (!store || store.commerce_id !== userContext.commerceId) {
        await logSecurityEvent(
          userContext.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: targetStoreId, action: 'view_store_products' },
          'store',
          targetStoreId
        );
        throw new ForbiddenError('Acceso no autorizado.');
      }
    }

    return await catalogRepository.findStoreProducts(targetStoreId, targetCategoryId);
  }

  async toggleStoreProduct(userContext, data, req) {
    const { store_id, product_id, disponible, precio_local, tiempo_prep_local } = data;
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(store_id);
    const targetProductId = Number(product_id);

    if (!isSystem) {
      const store = await storeRepository.findById(targetStoreId);
      if (!store || store.commerce_id !== userContext.commerceId) {
        throw new ForbiddenError('Acceso no autorizado.');
      }

      const isProductOwner = await catalogRepository.checkProductOwnership(targetProductId, userContext.commerceId);
      if (!isProductOwner) {
        throw new ForbiddenError('No autorizado para modificar este producto.');
      }
    }

    await catalogRepository.toggleStoreProduct(
      targetStoreId,
      targetProductId,
      disponible ? 1 : 0,
      precio_local,
      tiempo_prep_local
    );

    // Inyección de auditoría de seguridad
    await logSecurityEvent(
      userContext.id,
      'TOGGLE_STORE_PRODUCT',
      'MEDIUM',
      req,
      { storeId: targetStoreId, productId: targetProductId, disponible, precio_local, tiempo_prep_local },
      'store',
      targetStoreId
    );

    return true;
  }

  // --- INGREDIENTES ---
  async getIngredients() {
    return await catalogRepository.findIngredients();
  }

  async saveIngredient(userContext, data, req) {
    const { id, nombre, es_alergeno } = data;
    const isSystem = userContext.actorType === 'system_user';

    if (id) {
      await catalogRepository.updateIngredient(id, nombre, es_alergeno ? 1 : 0);
      await logSecurityEvent(
        userContext.id,
        'EDIT_INGREDIENT',
        'MEDIUM',
        req,
        { ingredientId: Number(id), nombre, es_alergeno },
        'catalog',
        Number(id)
      );
      return id;
    } else {
      const newId = await catalogRepository.createIngredient(nombre, es_alergeno ? 1 : 0);
      await logSecurityEvent(
        userContext.id,
        'CREATE_INGREDIENT',
        'MEDIUM',
        req,
        { ingredientId: newId, nombre, es_alergeno },
        'catalog',
        newId
      );
      return newId;
    }
  }
}

module.exports = new CatalogService();
