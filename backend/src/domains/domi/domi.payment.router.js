const express = require('express');
const router = express.Router();
const domiController = require('./domi.controller');

// @route   POST /api/payments/wopi-webhook
router.post('/wopi-webhook', domiController.wopiWebhook);

module.exports = router;
