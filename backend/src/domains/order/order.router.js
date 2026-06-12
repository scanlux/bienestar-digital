const express = require('express');
const router = express.Router();

const orderController = require('./order.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { updateOrderStatusSchema } = require('./order.validation');

// Rutas protegidas por autenticación
router.use(auth);

// Obtener pedidos de las sedes de mi comercio
router.get('/orders', hasPermission('view_orders'), orderController.getOrders);

// Actualizar el estado de un pedido
router.patch('/orders/:orderId/status', hasPermission('manage_orders'), validateBody(updateOrderStatusSchema), orderController.updateOrderStatus);

module.exports = router;

