const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const { auth } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { 
  loginSchema, 
  tokenSyncSchema, 
  operatorLoginSchema, 
  systemLoginSchema, 
  mobileRegisterSchema, 
  mobileRegisterFullSchema,
  activateDriverSchema,
  driverStatusSchema
} = require('./auth.validation');

// @route   POST /api/auth/login
router.post('/login', validateBody(loginSchema), authController.login);

// @route   POST /api/auth/mobile/token-sync
router.post('/mobile/token-sync', validateBody(tokenSyncSchema), authController.tokenSync);

// @route   POST /api/auth/operator-login
router.post('/operator-login', validateBody(operatorLoginSchema), authController.operatorLogin);

// @route   POST /api/auth/system-login
router.post('/system-login', validateBody(systemLoginSchema), authController.systemLogin);

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

module.exports = router;
