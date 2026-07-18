const express = require('express');
const router = express.Router();

const domiController = require('./domi.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { 
  calculateOrderCostSchema, 
  mintDomisSchema, 
  topupStoreSchema,
  transferSchema,
  mintManualSchema,
  burnManualSchema,
  checkoutSessionSchema,
  createAliasSchema
} = require('./domi.validation');

// Public endpoints
router.get('/token', domiController.getTokenRegistry);
router.get('/rules', domiController.getProtocolRules);
router.post('/calculate', validateBody(calculateOrderCostSchema), domiController.calculateOrderCost);

// Authenticated endpoints
router.get('/wallet/system', auth, hasPermission('view_ledger'), domiController.getSystemWallet);

// Wallet alias availability check (must be declared before parameterized routes)
router.get('/wallet/aliases/check-availability', auth, domiController.checkAliasAvailability);

router.get('/wallet/:ownerType/:ownerId', auth, domiController.getWallet);
router.post('/mint', auth, hasPermission('purchase_domis'), validateBody(mintDomisSchema), domiController.mintDomis);
router.get('/packages/:storeId', auth, domiController.getPackages);
router.get('/ledger', auth, hasPermission('view_ledger'), domiController.getLedger);
router.post('/wallet/store/:storeId/topup', auth, hasPermission('purchase_domis'), validateBody(topupStoreSchema), domiController.topupStore);

// Wallet bank operations endpoints
router.post('/transfer', auth, hasPermission('transfer_domis'), validateBody(transferSchema), domiController.transferDomis);
router.get('/wallet/:ownerType/:ownerId/history', auth, domiController.getWalletHistory);
router.post('/mint/manual', auth, hasPermission('mint_manual_domis'), validateBody(mintManualSchema), domiController.mintManual);
router.post('/burn/manual', auth, hasPermission('burn_manual_domis'), validateBody(burnManualSchema), domiController.burnManual);
router.post('/payment/checkout-session', auth, hasPermission('checkout_domis'), validateBody(checkoutSessionSchema), domiController.createCheckoutSession);

// Wallet alias administration routes
router.get('/wallet/:ownerType/:ownerId/aliases', auth, domiController.getWalletAliases);
router.post('/wallet/:ownerType/:ownerId/aliases', auth, validateBody(createAliasSchema), domiController.createWalletAlias);
router.delete('/wallet/:ownerType/:ownerId/aliases/:aliasId', auth, domiController.deleteWalletAlias);
router.get('/wallet/:ownerType/:ownerId/aliases/suggest', auth, domiController.suggestWalletAlias);

// Reglas de Tiers de Billetera
router.get('/tiers/rules', auth, hasPermission('manage_domi_peg'), domiController.getTierRules);
router.put('/tiers/rules/:tier', auth, hasPermission('manage_domi_peg'), domiController.updateTierRules);

// Aprobacion Excepcional de Compra (Bypass Anti-Ballenas)
router.post('/wallet/approve-excess-purchase', auth, hasPermission('manage_domi_peg'), domiController.approveExcessPurchase);

// Cuentas de retiro de monedero (withdrawal_accounts)
router.get('/withdrawal-accounts', auth, domiController.getWithdrawalAccounts);
router.post('/withdrawal-accounts', auth, domiController.createWithdrawalAccount);
router.delete('/withdrawal-accounts/:id', auth, domiController.deleteWithdrawalAccount);
router.patch('/withdrawal-accounts/:id/default', auth, domiController.setDefaultWithdrawalAccount);

// Deudas y cargos por incumplimiento del cliente
router.get('/debts', auth, domiController.getDebts);
router.post('/debts/:debtId/pay', auth, domiController.payDebt);
router.post('/debts/store/:debtId/pay', auth, domiController.payStoreDebt);

module.exports = router;

