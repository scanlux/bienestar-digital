const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const { auth, hasPermission } = require('../../middleware/auth');

router.use(auth);

// POST /api/public/orders
router.post('/', hasPermission('spend_domis'), orderController.createOrder);

// GET /api/public/orders/user/:userId
router.get('/user/:userId', orderController.getUserOrders);

module.exports = router;

