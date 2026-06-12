const catalogService = require('./catalog.service');
const { handleControllerError } = require('../../utils/errors');

class CatalogController {
  // --- MENUS ---
  async getMenus(req, res) {
    try {
      const { storeId } = req.query;
      const result = await catalogService.getMenus(req.user, storeId);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getMenusByCommerceId(req, res) {
    try {
      const { commerceId } = req.params;
      const result = await catalogService.getMenusByCommerce(req.user, commerceId);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async saveMenu(req, res) {
    try {
      const id = await catalogService.saveMenu(req.user, req.body, req);
      res.json({ id, message: req.body.id ? 'Menú actualizado con éxito' : 'Menú creado con éxito' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deleteMenu(req, res) {
    try {
      const { id } = req.params;
      await catalogService.deleteMenu(req.user, id, req);
      res.json({ success: true, message: 'Menú eliminado con éxito.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getStoreMenus(req, res) {
    try {
      const { storeId } = req.params;
      const result = await catalogService.getStoreMenus(req.user, storeId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async toggleStoreMenu(req, res) {
    try {
      await catalogService.toggleStoreMenu(req.user, req.body, req);
      res.json({ success: true, message: 'Disponibilidad del menú en sede actualizada.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  // --- CATEGORIAS ---
  async getCategories(req, res) {
    try {
      const { menuId } = req.params;
      const result = await catalogService.getCategories(req.user, menuId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async saveCategory(req, res) {
    try {
      const id = await catalogService.saveCategory(req.user, req.body, req);
      res.json({ id, message: req.body.id ? 'Categoría actualizada con éxito' : 'Categoría creada con éxito' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      await catalogService.deleteCategory(req.user, id, req);
      res.json({ success: true, message: 'Categoría eliminada con éxito.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getStoreCategories(req, res) {
    try {
      const { storeId, menuId } = req.params;
      const result = await catalogService.getStoreCategories(req.user, storeId, menuId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async toggleStoreCategory(req, res) {
    try {
      await catalogService.toggleStoreCategory(req.user, req.body, req);
      res.json({ success: true, message: 'Disponibilidad de la categoría en sede actualizada.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  // --- PRODUCTOS ---
  async getProducts(req, res) {
    try {
      const { categoriaId, commerceId } = req.query;
      const result = await catalogService.getProducts(req.user, { categoriaId, commerceId }, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async saveProduct(req, res) {
    try {
      const id = await catalogService.saveProduct(req.user, req.body, req);
      res.json({ id, message: req.body.id ? 'Producto actualizado con éxito' : 'Producto creado con éxito' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      await catalogService.deleteProduct(req.user, id, req);
      res.json({ success: true, message: 'Producto eliminado con éxito.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getStoreProducts(req, res) {
    try {
      const { storeId, categoriaId } = req.params;
      const result = await catalogService.getStoreProducts(req.user, storeId, categoriaId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async toggleStoreProduct(req, res) {
    try {
      await catalogService.toggleStoreProduct(req.user, req.body, req);
      res.json({ success: true, message: 'Estado y/o precio del producto en sede actualizado.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  // --- INGREDIENTES ---
  async getIngredients(req, res) {
    try {
      const result = await catalogService.getIngredients();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async saveIngredient(req, res) {
    try {
      const id = await catalogService.saveIngredient(req.user, req.body, req);
      res.json({ id, message: req.body.id ? 'Ingrediente actualizado con éxito' : 'Ingrediente creado con éxito' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new CatalogController();
