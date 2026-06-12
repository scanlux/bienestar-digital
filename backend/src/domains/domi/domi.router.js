const express = require('express');
const router = express.Router();

const domiController = require('./domi.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { 
  calculateOrderCostSchema, 
  mintDomisSchema, 
  topupStoreSchema 
} = require('./domi.validation');

// Public endpoints
router.get('/token', domiController.getTokenRegistry);
router.get('/rules', domiController.getProtocolRules);
router.post('/calculate', validateBody(calculateOrderCostSchema), domiController.calculateOrderCost);

// Authenticated endpoints
router.get('/wallet/system', auth, hasPermission('view_ledger'), domiController.getSystemWallet);
router.get('/wallet/:ownerType/:ownerId', auth, domiController.getWallet);
router.post('/mint', auth, hasPermission('purchase_domis'), validateBody(mintDomisSchema), domiController.mintDomis);
router.get('/packages/:storeId', auth, domiController.getPackages);
router.get('/ledger', auth, hasPermission('view_ledger'), domiController.getLedger);
router.post('/wallet/store/:storeId/topup', auth, hasPermission('purchase_domis'), validateBody(topupStoreSchema), domiController.topupStore);

module.exports = router;

