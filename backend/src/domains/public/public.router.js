const express = require('express');
const router = express.Router();

const publicController = require('./public.controller');
const { auth } = require('../../middleware/auth');

// GET /api/public/commerces
router.get('/commerces', publicController.getCommerces);

// GET /api/public/sync
router.get('/sync', publicController.syncDelta);

// GET /api/public/store/:id
router.get('/store/:id', publicController.getStoreDetail);

// GET /api/public/videos/feed
router.get('/videos/feed', publicController.getVideosFeed);

// POST /api/public/videos/:id/like
router.post('/videos/:id/like', auth, publicController.toggleVideoLike);

// GET /api/public/videos/:id/comments
router.get('/videos/:id/comments', publicController.getVideoComments);

// POST /api/public/videos/:id/comments
router.post('/videos/:id/comments', auth, publicController.addVideoComment);

// POST /api/public/requests
router.post('/requests', publicController.createRequest);

// GET /api/public/maintenance-status
router.get('/maintenance-status', publicController.getMaintenanceStatus);

module.exports = router;
