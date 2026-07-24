const db = require('../../config/db');
const appLogger = require('../../utils/appLogger');
const CatalogMenuService = require('./services/catalog-menu.service');
const CatalogProductService = require('./services/catalog-product.service');

class CatalogService {
  constructor() {
    this.menuService = new CatalogMenuService(this);
    this.productService = new CatalogProductService(this);
  }

  // --- Helpers compartidos/utilitarios ---
  async applyCategoryLimits(commerceId, categories) {
    if (!commerceId) return categories;
    const [upgrades] = await db.query(
      'SELECT COUNT(*) as activeCount FROM commerce_upgrades WHERE commerce_id = ? AND upgrade_type = "estado_empresarial" AND expires_at > NOW()',
      [commerceId]
    );
    const hasBusinessStatus = Number(upgrades[0].activeCount) > 0;

    let maxCategories = 3;
    try {
      const [paramRows] = await db.query(
        'SELECT `value` FROM system_parameters WHERE `key` = "free_tier_categories_limit"'
      );
      if (paramRows[0]) {
        maxCategories = parseInt(paramRows[0].value, 10);
      }
    } catch (err) {
      appLogger.error('[applyCategoryLimits] Error fetching limit:', err);
    }

    return categories.map((cat, index) => ({
      ...cat,
      disponible: hasBusinessStatus || index < maxCategories ? cat.disponible : 0,
      habilitada: hasBusinessStatus || index < maxCategories ? cat.habilitada : 0,
      locked: !hasBusinessStatus && index >= maxCategories
    }));
  }

  async applyProductLimits(commerceId, products) {
    if (!commerceId) return products;
    const [upgrades] = await db.query(
      'SELECT COUNT(*) as activeCount FROM commerce_upgrades WHERE commerce_id = ? AND upgrade_type = "estado_empresarial" AND expires_at > NOW()',
      [commerceId]
    );
    const hasBusinessStatus = Number(upgrades[0].activeCount) > 0;

    let maxProducts = 5;
    try {
      const [paramRows] = await db.query(
        'SELECT `value` FROM system_parameters WHERE `key` = "free_tier_products_limit"'
      );
      if (paramRows[0]) {
        maxProducts = parseInt(paramRows[0].value, 10);
      }
    } catch (err) {
      appLogger.error('[applyProductLimits] Error fetching limit:', err);
    }

    return products.map((prod, index) => ({
      ...prod,
      disponible: hasBusinessStatus || index < maxProducts ? prod.disponible : 0,
      habilitado: hasBusinessStatus || index < maxProducts ? prod.habilitado : 0,
      locked: !hasBusinessStatus && index >= maxProducts
    }));
  }

  async cleanupProductImage(imageUrl) {
    try {
      if (!imageUrl || !imageUrl.includes('/uploads/products/')) return;
      const parts = imageUrl.split('/');
      const fileName = parts[parts.length - 1];
      const mediaServerUrl = process.env.MEDIA_SERVER_URL || 'http://localhost:4001';
      
      const response = await fetch(`${mediaServerUrl}/api/media/delete/product/${fileName}`, {
        method: 'DELETE',
        headers: {
          'x-internal-key': process.env.INTERNAL_API_KEY || ''
        }
      });
      if (!response.ok) {
        appLogger.error(`[PRODUCT_IMAGE_CLEANUP_FAILED] Status: ${response.status}`);
      }
    } catch (err) {
      appLogger.error('[PRODUCT_IMAGE_CLEANUP_ERROR]', err);
    }
  }

  // --- MENU DELEGATIONS ---
  async getMenus(userContext, storeId, commerceId) {
    return await this.menuService.getMenus(userContext, storeId, commerceId);
  }

  async getMenusByCommerce(userContext, commerceId) {
    return await this.menuService.getMenusByCommerce(userContext, commerceId);
  }

  async saveMenu(userContext, data, req) {
    return await this.menuService.saveMenu(userContext, data, req);
  }

  async deleteMenu(userContext, id, req) {
    return await this.menuService.deleteMenu(userContext, id, req);
  }

  async getStoreMenus(userContext, storeId, req) {
    return await this.menuService.getStoreMenus(userContext, storeId, req);
  }

  async toggleStoreMenu(userContext, data, req) {
    return await this.menuService.toggleStoreMenu(userContext, data, req);
  }

  async getCategories(userContext, menuId, req) {
    return await this.menuService.getCategories(userContext, menuId, req);
  }

  async saveCategory(userContext, data, req) {
    return await this.menuService.saveCategory(userContext, data, req);
  }

  async deleteCategory(userContext, id, req) {
    return await this.menuService.deleteCategory(userContext, id, req);
  }

  async getMenuDeletePreview(userContext, id, req) {
    return await this.menuService.getMenuDeletePreview(userContext, id, req);
  }

  async getCategoryDeletePreview(userContext, id, req) {
    return await this.menuService.getCategoryDeletePreview(userContext, id, req);
  }

  async getStoreCategories(userContext, storeId, menuId, req) {
    return await this.menuService.getStoreCategories(userContext, storeId, menuId, req);
  }

  async toggleStoreCategory(userContext, data, req) {
    return await this.menuService.toggleStoreCategory(userContext, data, req);
  }

  // --- PRODUCT DELEGATIONS ---
  async getProducts(userContext, queryParams, req) {
    return await this.productService.getProducts(userContext, queryParams, req);
  }

  async saveProduct(userContext, data, req) {
    return await this.productService.saveProduct(userContext, data, req);
  }

  async deleteProduct(userContext, id, req) {
    return await this.productService.deleteProduct(userContext, id, req);
  }

  async getStoreProducts(userContext, storeId, categoriaId, req) {
    return await this.productService.getStoreProducts(userContext, storeId, categoriaId, req);
  }

  async toggleStoreProduct(userContext, data, req) {
    return await this.productService.toggleStoreProduct(userContext, data, req);
  }

  async getIngredients() {
    return await this.productService.getIngredients();
  }

  async saveIngredient(userContext, data, req) {
    return await this.productService.saveIngredient(userContext, data, req);
  }
}

module.exports = new CatalogService();
