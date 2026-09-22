const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const { auth } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { 
  loginSchema, 
  tokenSyncSchema, 
  mobileRegisterSchema, 
  mobileRegisterFullSchema,
  activateDriverSchema,
  driverStatusSchema,
  resetPasswordSchema,
  reportSecurityEventSchema,
  reportSecurityEventBatchSchema
} = require('./auth.validation');

// @route   POST /api/auth/login
router.post('/login', validateBody(loginSchema), authController.login);

// @route   POST /api/auth/mobile/token-sync
router.post('/mobile/token-sync', validateBody(tokenSyncSchema), authController.tokenSync);

// @route   POST /api/auth/mobile/register
router.post('/mobile/register', validateBody(mobileRegisterSchema), authController.mobileRegister);

// @route   GET /api/auth/mobile/check-user
router.get('/mobile/check-user', authController.checkUser);

// @route   POST /api/auth/mobile/register-full
router.post('/mobile/register-full', validateBody(mobileRegisterFullSchema), authController.mobileRegisterFull);

// @route   PATCH /api/auth/activate-driver
router.patch('/activate-driver', auth, validateBody(activateDriverSchema), authController.activateDriver);

// @route   PATCH /api/auth/driver-status
router.patch('/driver-status', auth, validateBody(driverStatusSchema), authController.driverStatus);

// @route   POST /api/auth/refresh-session
router.post('/refresh-session', auth, authController.refreshSession);

// @route   POST /api/auth/reset-password
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

// @route   POST /api/auth/push-token
router.post('/push-token', auth, authController.savePushToken);

// @route   GET /api/auth/my-nav
router.get('/my-nav', auth, authController.getMyNav);

// @route   POST /api/auth/report-security-event
router.post('/report-security-event', validateBody(reportSecurityEventSchema), authController.reportSecurityEvent);

// @route   POST /api/auth/report-security-event-batch
router.post('/report-security-event-batch', validateBody(reportSecurityEventBatchSchema), authController.reportSecurityEventBatch);

// Mount user addresses sub-router under /api/auth/addresses
const addressRouter = require('./addresses/address.router');
router.use('/addresses', addressRouter);

module.exports = router;
