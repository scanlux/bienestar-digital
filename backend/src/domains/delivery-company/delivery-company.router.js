const express = require('express');
const router = express.Router();

const deliveryCompanyController = require('./delivery-company.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { affiliateDriverSchema } = require('./delivery-company.validation');

router.use(auth);

// GET /api/delivery-company/drivers
router.get('/drivers', hasPermission('manage_drivers'), deliveryCompanyController.getDrivers);

// POST /api/delivery-company/drivers
router.post('/drivers', hasPermission('manage_drivers'), validateBody(affiliateDriverSchema), deliveryCompanyController.affiliateDriver);

// DELETE /api/delivery-company/drivers/:userId
router.delete('/drivers/:userId', hasPermission('manage_drivers'), deliveryCompanyController.deaffiliateDriver);

module.exports = router;

