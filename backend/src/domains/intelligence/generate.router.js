const express = require('express');
const router = express.Router();
const intelligenceController = require('./intelligence.controller');
const { auth, hasPermission } = require('../../middleware/auth');

// POST /api/generate
router.post('/', auth, hasPermission('use_ai_generation'), intelligenceController.generateContent);

module.exports = router;
