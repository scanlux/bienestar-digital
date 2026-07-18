const express = require('express');
const router = express.Router();

const upgradesController = require('./upgrades.controller');
const { auth, hasPermission } = require('../../middleware/auth');

// Todos los endpoints de upgrades requieren login
router.use(auth);

// Obtener estado de las mejoras activas e indicadores de uso de límites
router.get('/active', hasPermission('view_upgrades_market'), upgradesController.getActiveUpgrades);

// Adquirir/comprar una mejora
router.post('/purchase', hasPermission('purchase_upgrades'), upgradesController.purchaseUpgrade);

// Catalogo de mejoras (Admin)
router.get('/catalog', hasPermission('manage_upgrades_catalog'), upgradesController.getCatalog);
router.post('/catalog', hasPermission('manage_upgrades_catalog'), upgradesController.createCatalogEntry);
router.patch('/catalog/:key', hasPermission('manage_upgrades_catalog'), upgradesController.updateCatalogEntry);

// Administración de mejoras (Admin)
router.get('/admin/all', hasPermission('manage_upgrades_catalog'), upgradesController.getAllUpgradesAdmin);
router.post('/admin/grant', hasPermission('manage_upgrades_catalog'), upgradesController.grantUpgradeManual);
router.patch('/admin/:id/revoke', hasPermission('manage_upgrades_catalog'), upgradesController.revokeUpgrade);

module.exports = router;
