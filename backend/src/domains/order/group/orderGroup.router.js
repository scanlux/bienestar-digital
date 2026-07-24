const express = require('express');
const router = express.Router();
const orderGroupController = require('./orderGroup.controller');
const { hasPermission } = require('../../../middleware/auth');

router.post('/', hasPermission('spend_domis'), orderGroupController.createGroup);
router.post('/:groupOrderId/cancel', hasPermission('spend_domis'), orderGroupController.cancelGroup);

module.exports = router;
