const express = require('express');
const router = express.Router();
const cashController = require('./cash.controller');
const { auth, hasPermission, validateFinancialPin, conditionalFinancialPin } = require('../../middleware/auth');

// Rutas protegidas globalmente por token JWT
router.use(auth);

// Resumen de caja física y depósitos en tránsito
router.get('/summary', hasPermission('view_cash_vault'), cashController.getSummary);

// Transacciones de caja física (Ingresos, Egresos, Ajustes)
router.get('/transactions', hasPermission('view_cash_vault'), cashController.getCashTransactions);
router.post('/transaction', hasPermission('manage_cash_vault'), cashController.createCashTransaction);

// Recepción de efectivo e Instamint de DOMIs
router.post('/income', hasPermission('receive_cash_payment'), conditionalFinancialPin, cashController.receivePhysicalPayment);

// Búsqueda de wallets para operadores de caja
router.get('/wallets/search', hasPermission('view_cash_vault'), cashController.searchWallets);

// Registro de consignaciones bancarias (Bancolombia)
router.get('/bank/deposits', hasPermission('view_cash_vault'), cashController.getBankDeposits);
router.post('/bank/deposit', hasPermission('register_bank_deposit'), cashController.createBankDeposit);

// Historial/Resumen de operación del operador (para cuadre diario/mensual)
router.get('/operator/history', hasPermission('view_cash_vault'), cashController.getOperatorHistory);

// Conciliación bancaria (Acuñación / Minting) - Requiere PIN Financiero de seguridad (2FA)
router.post('/bank/deposit/:id/reconcile', hasPermission('reconcile_bank_deposit'), validateFinancialPin, cashController.reconcileBankDeposit);

module.exports = router;
