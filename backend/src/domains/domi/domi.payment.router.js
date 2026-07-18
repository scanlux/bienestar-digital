const express = require('express');
const router = express.Router();
const domiController = require('./domi.controller');

// @route   POST /api/payments/wompi-webhook
router.post('/wompi-webhook', domiController.wompiWebhook);

module.exports = router;
