const express = require('express');
const router = express.Router();

const storeController = require('./store.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { saveStoreSchema, updateOrderAcceptanceSchema, saveVideoSchema } = require('./store.validation');

// Rutas protegidas por autenticación
router.use(auth);

// Listar sedes del comercio del usuario
router.get('/my-stores', hasPermission('view_stores'), storeController.getMyStores);

// Listar plataformas de pago autorizadas
router.get('/payment-platforms', hasPermission('view_stores'), storeController.getPaymentPlatforms);

// Obtener todas las sedes de un comercio por ID de comercio (sistema o admin comercial)
router.get('/stores/:commerceId', hasPermission('view_stores'), storeController.getStoresByCommerceId);

// Obtener detalle de una sede específica (sistema o admin comercial - BOLA)
router.get('/store/:id', hasPermission('view_stores'), storeController.getStoreById);

// Crear o actualizar una sede (las validaciones granulares de create_store/edit_store se delegan al servicio)
router.post('/stores', validateBody(saveStoreSchema), storeController.saveStore);

// Modificar modo de aceptación de pedidos de la sede
router.patch('/stores/:storeId/order-acceptance', hasPermission('manage_order_acceptance'), validateBody(updateOrderAcceptanceSchema), storeController.updateOrderAcceptance);

// Cambiar estado de la sede física
router.patch('/stores/:storeId/status', hasPermission('edit_store_basic'), validateBody({ estado: { type: 'string', required: true }, fecha_regreso: { type: 'string', required: false } }), storeController.updateStoreStatus);

// Subir video promocional de la sede
router.post('/videos', hasPermission('upload_videos'), validateBody(saveVideoSchema), storeController.saveVideo);

// Activar/desactivar video promocional
router.patch('/videos/:id/active', hasPermission('upload_videos'), storeController.toggleVideo);

// Eliminar video de la sede
router.delete('/videos/:id', hasPermission('delete_videos'), storeController.deleteVideo);

// Obtener resumen financiero de una sede específica (BOLA protegido)
router.get('/store/:id/financial-summary', hasPermission('view_store_financial_summary'), storeController.getStoreFinancialSummary);

// Obtener estado de cuota de sedes del comercio
router.get('/stores-quota/status', hasPermission('view_stores'), storeController.getStoreQuotaStatus);

// Forzar cumplimiento de la cuota de sedes (enforce-quota)
const { hasAnyPermission } = require('../../middleware/auth');
router.post('/stores/:commerceId/enforce-quota', hasAnyPermission(['edit_stores_advanced', 'manage_commerce', 'view_stores']), storeController.enforceStoreQuota);

module.exports = router;

