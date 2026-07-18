const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { updateOrderStatusSchema } = require('./order.validation');

router.use(auth);

// POST /api/public/orders
router.post('/', hasPermission('spend_domis'), orderController.createOrder);

// GET /api/public/orders/user/:userId
router.get('/user/:userId', orderController.getUserOrders);

// PATCH /api/public/orders/:orderId/status (Para cancelaciones de cliente)
router.patch('/:orderId/status', hasPermission('spend_domis'), validateBody(updateOrderStatusSchema), orderController.updateOrderStatus);

// GET /api/public/orders/:orderId (Detalle de un pedido)
router.get('/:orderId', hasPermission('spend_domis'), orderController.getOrderDetail);

// PUT /api/public/orders/:orderId/items
router.put('/:orderId/items', hasPermission('spend_domis'), orderController.updateOrderItems);

// GET /api/public/orders/my-messages (Lista de chats de pedidos)
router.get('/my-messages', hasPermission('spend_domis'), orderController.getCustomerMessagesList);

// GET /api/public/orders/unread-count (Contador de no leídos)
router.get('/unread-count', hasPermission('spend_domis'), orderController.getCustomerUnreadCount);

// PATCH /api/public/orders/:orderId/messages/mark-read (Marcar chat de pedido como leído)
router.patch('/:orderId/messages/mark-read', hasPermission('spend_domis'), orderController.markCustomerMessagesRead);

// GET /api/public/orders/:orderId/messages (Obtener mensajes de un pedido)
router.get('/:orderId/messages', hasPermission('spend_domis'), orderController.getOrderMessages);

module.exports = router;

