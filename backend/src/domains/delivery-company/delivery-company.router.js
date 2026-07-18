const express = require('express');
const router = express.Router();

const deliveryCompanyController = require('./delivery-company.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { affiliateDriverSchema } = require('./delivery-company.validation');

router.use(auth);

// Drivers Management
router.get('/drivers', hasPermission('manage_drivers'), deliveryCompanyController.getDrivers);
router.post('/drivers', hasPermission('manage_drivers'), validateBody(affiliateDriverSchema), deliveryCompanyController.affiliateDriver);
router.delete('/drivers/:userId', hasPermission('manage_drivers'), deliveryCompanyController.deaffiliateDriver);

// Dashboard & Stats
router.get('/dashboard/stats', hasPermission('accept_delivery_orders'), deliveryCompanyController.getDashboardStats);
router.get('/drivers/available', hasPermission('manage_drivers'), deliveryCompanyController.getAvailableDrivers);

// Order Operations
router.get('/orders/available', hasPermission('accept_delivery_orders'), deliveryCompanyController.getAvailableOrders);
router.get('/orders/history', hasPermission('accept_delivery_orders'), deliveryCompanyController.getOrderHistory);
router.post('/orders/:orderId/accept', hasPermission('accept_delivery_orders'), deliveryCompanyController.acceptOrder);
router.post('/orders/:orderId/assign-driver', hasPermission('accept_delivery_orders'), deliveryCompanyController.assignDriver);

// Financial Summary
router.get('/financial-summary', hasPermission('view_delivery_financial_summary'), deliveryCompanyController.getFinancialSummary);

module.exports = router;
