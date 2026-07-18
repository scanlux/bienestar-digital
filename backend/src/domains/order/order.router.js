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

// Obtener los productos de un pedido
router.get('/orders/:orderId/items', hasPermission('view_orders'), orderController.getOrderItems);

// Notificar productos agotados
router.post('/orders/:orderId/notify-unavailable', hasPermission('manage_orders'), orderController.notifyUnavailableItems);

// Actualizar el estado de un pedido
router.patch('/orders/:orderId/status', hasPermission('manage_orders'), validateBody(updateOrderStatusSchema), orderController.updateOrderStatus);

// Aceptar un pedido (repartidores)
router.post('/orders/:orderId/accept', orderController.acceptOrder);

module.exports = router;

