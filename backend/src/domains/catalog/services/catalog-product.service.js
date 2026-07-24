const catalogRepository = require('../catalog.repository');
const storeRepository = require('../../store/store.repository');
const db = require('../../../config/db');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const appLogger = require('../../../utils/appLogger');

class CatalogProductService {
  constructor(catalogService) {
    this.catalogService = catalogService;
  }

  async getProducts(userContext, queryParams, req) {
    const { categoriaId, commerceId } = queryParams || {};
    const isSystem = userContext.actorType === 'system_user';

    if (commerceId) {
      const targetCommerceId = Number(commerceId);
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

    const [categoryRows] = await db.query(
      'SELECT s.commerce_id FROM categorias c JOIN menus m ON c.menu_id = m.id JOIN stores s ON m.store_id = s.id WHERE c.id = ?',
      [targetCategoryId]
    );
    const targetCommerceIdFromCategory = categoryRows[0] ? categoryRows[0].commerce_id : null;

    const products = await catalogRepository.findProducts(targetCategoryId);
    return await this.catalogService.applyProductLimits(targetCommerceIdFromCategory, products);
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

    if (product.image_url) {
      this.catalogService.cleanupProductImage(product.image_url).catch(() => {});
    }

    await catalogRepository.softDeleteProduct(targetId);
    await logSecurityEvent(
      userContext.id,
      'DELETE_CATALOG',
      'LOW',
      req,
      { productId: targetId, action: 'soft_delete_product' },
      'commerce',
      userContext.commerceId
    );
    return true;
  }

  async getStoreProducts(userContext, storeId, categoriaId, req) {
    const targetStoreId = Number(storeId);
    const targetCategoryId = Number(categoriaId);
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
          { storeId: targetStoreId, action: 'view_store_products' },
          'store',
          targetStoreId
        );
        throw new ForbiddenError('Acceso no autorizado.');
      }
    }

    const products = await catalogRepository.findStoreProducts(targetStoreId, targetCategoryId);
    return await this.catalogService.applyProductLimits(store.commerce_id, products);
  }

  async toggleStoreProduct(userContext, data, req) {
    const { store_id, product_id, disponible, precio_local, tiempo_prep_local } = data;
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(store_id);
    const targetProductId = Number(product_id);

    const store = await storeRepository.findById(targetStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    if (!isSystem) {
      if (store.commerce_id !== userContext.commerceId) {
        throw new ForbiddenError('Acceso no autorizado.');
      }

      const isProductOwner = await catalogRepository.checkProductOwnership(targetProductId, userContext.commerceId);
      if (!isProductOwner) {
        throw new ForbiddenError('No autorizado para modificar este producto.');
      }
    }

    if (disponible) {
      const [rows] = await db.query('SELECT categoria_id FROM products WHERE id = ?', [targetProductId]);
      const categoryId = rows[0] ? rows[0].categoria_id : null;
      if (categoryId) {
        const products = await catalogRepository.findStoreProducts(targetStoreId, categoryId);
        const limitedProducts = await this.catalogService.applyProductLimits(store.commerce_id, products);
        const target = limitedProducts.find(p => Number(p.id) === targetProductId);
        if (target && target.locked) {
          await logSecurityEvent(
            userContext.id,
            'LIMIT_BYPASS_ATTEMPT',
            'HIGH',
            req,
            { storeId: targetStoreId, productId: targetProductId, type: 'product' },
            'store',
            targetStoreId
          );
          throw new ForbiddenError('Límite del plan excedido. No es posible activar este producto.');
        }
      }
    }

    await catalogRepository.toggleStoreProduct(
      targetStoreId,
      targetProductId,
      disponible ? 1 : 0,
      precio_local,
      tiempo_prep_local
    );

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

module.exports = CatalogProductService;
