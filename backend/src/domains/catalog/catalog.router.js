const express = require('express');
const router = express.Router();

const catalogController = require('./catalog.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const {
  saveMenuSchema,
  toggleStoreMenuSchema,
  saveCategorySchema,
  toggleStoreCategorySchema,
  saveProductSchema,
  toggleStoreProductSchema,
  saveIngredientSchema
} = require('./catalog.validation');

// Todos los endpoints de catálogo requieren autenticación básica
router.use(auth);

// --- MENUS ---
router.get('/menus', hasPermission('view_catalog'), catalogController.getMenus);
router.get('/menus/:commerceId', hasPermission('view_catalog'), catalogController.getMenusByCommerceId);
router.post('/menus', hasPermission('write_catalog'), validateBody(saveMenuSchema), catalogController.saveMenu);
router.delete('/menus/:id', hasPermission('delete_catalog'), catalogController.deleteMenu);
router.get('/store-menus/:storeId', hasPermission('view_catalog'), catalogController.getStoreMenus);
router.post('/store-menus', hasPermission('enable_store_catalog'), validateBody(toggleStoreMenuSchema), catalogController.toggleStoreMenu);

// --- CATEGORIAS ---
router.get('/categorias/:menuId', hasPermission('view_catalog'), catalogController.getCategories);
router.post('/categorias', hasPermission('write_catalog'), validateBody(saveCategorySchema), catalogController.saveCategory);
router.delete('/categorias/:id', hasPermission('delete_catalog'), catalogController.deleteCategory);
router.get('/store-categories/:storeId/:menuId', hasPermission('view_catalog'), catalogController.getStoreCategories);
router.post('/store-categories', hasPermission('enable_store_catalog'), validateBody(toggleStoreCategorySchema), catalogController.toggleStoreCategory);

// --- PRODUCTOS ---
router.get('/products', hasPermission('view_catalog'), catalogController.getProducts);
router.post('/products', hasPermission('write_catalog'), validateBody(saveProductSchema), catalogController.saveProduct);
router.delete('/products/:id', hasPermission('delete_catalog'), catalogController.deleteProduct);
router.get('/store-products/:storeId/:categoriaId', hasPermission('view_catalog'), catalogController.getStoreProducts);
router.post('/store-products', hasPermission('write_catalog'), validateBody(toggleStoreProductSchema), catalogController.toggleStoreProduct);

// --- INGREDIENTES ---
router.get('/ingredients', hasPermission('view_catalog'), catalogController.getIngredients);
router.post('/ingredients', hasPermission('write_catalog'), validateBody(saveIngredientSchema), catalogController.saveIngredient);

module.exports = router;
