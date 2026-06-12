const express = require('express');
const router = express.Router();
const publicController = require('./public.controller');

// GET /api/home
router.get('/home', publicController.getHomeData);

module.exports = router;
