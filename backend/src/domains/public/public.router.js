const express = require('express');
const router = express.Router();

const publicController = require('./public.controller');
const { auth, verifyInternalKey } = require('../../middleware/auth');

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

// POST /api/public/internal/requests (internal endpoint for Bogotá forwarder)
router.post('/internal/requests', verifyInternalKey, publicController.createRequest);

// GET /api/public/maintenance-status
router.get('/maintenance-status', publicController.getMaintenanceStatus);

// GET /api/public/maintenance-bypass-rules
router.get('/maintenance-bypass-rules', publicController.getMaintenanceBypassRules);

// GET /api/public/app-version
router.get('/app-version', (req, res) => {
  res.json({
    minimum_version: process.env.APP_MINIMUM_VERSION || '1.0.0',
    latest_version: process.env.APP_LATEST_VERSION || '1.0.0',
    force_update: process.env.APP_FORCE_UPDATE === 'true',
    update_message: 'Hay una actualización de seguridad obligatoria disponible.',
    store_url: process.env.APP_STORE_URL || 'https://trendy.sytes.net/upgrades'
  });
});

// GET /api/public/requests/verify-token
router.get('/requests/verify-token', publicController.verifyRequestToken);

// PUT /api/public/requests/update
router.put('/requests/update', publicController.updateRequestWithCorrections);

module.exports = router;
