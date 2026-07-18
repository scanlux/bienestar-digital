const express = require('express');
const router = express.Router();

const domiTreasuryController = require('./domi.treasury.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const {
  declareReserveSchema,
  mintCashSchema,
  proposeYieldAdjustmentSchema,
  applyYieldAdjustmentSchema,
  applyNewPegSchema,
  processWithdrawalSchema
} = require('./domi.validation');

// Treasury routes (all require authentication and relevant permissions)
router.get('/status', auth, hasPermission('view_domi_pricing'), domiTreasuryController.getTreasuryStatus);
router.get('/revenue', auth, hasPermission('view_ledger'), domiTreasuryController.getRevenueBreakdown);
router.get('/burns', auth, hasPermission('view_ledger'), domiTreasuryController.getDailyBurnStats);
router.get('/peg/history', auth, hasPermission('view_domi_pricing'), domiTreasuryController.getPricingHistory);

// Withdrawal management
router.get('/withdrawals', auth, hasPermission('approve_withdrawals'), domiTreasuryController.getWithdrawalRequests);
router.post('/withdrawals/:id/process', auth, hasPermission('approve_withdrawals'), validateBody(processWithdrawalSchema), domiTreasuryController.processWithdrawalRequest);

// Reserve declaration and cash minting
router.post('/reserve/declare', auth, hasPermission('declare_domi_reserve'), validateBody(declareReserveSchema), domiTreasuryController.declareReserve);
router.post('/mint/cash', auth, hasPermission('mint_domi_cash'), validateBody(mintCashSchema), domiTreasuryController.mintCash);
router.post('/mint/confirm/:packageId', auth, hasPermission('confirm_domi_reserve'), domiTreasuryController.confirmCashMint);

// Peg and Yield adjustments
router.post('/yield/propose', auth, hasPermission('manage_domi_peg'), validateBody(proposeYieldAdjustmentSchema), domiTreasuryController.proposeYieldAdjustment);
router.post('/yield/apply', auth, hasPermission('manage_domi_peg'), validateBody(applyYieldAdjustmentSchema), domiTreasuryController.applyYieldAdjustment);
router.post('/peg/apply', auth, hasPermission('manage_domi_peg'), validateBody(applyNewPegSchema), domiTreasuryController.applyNewPeg);

module.exports = router;
