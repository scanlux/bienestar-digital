const cashService = require('./cash.service');
const { handleControllerError } = require('../../utils/errors');

class CashController {
  async getSummary(req, res) {
    try {
      const result = await cashService.getCashAndBankSummary(req.user);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createCashTransaction(req, res) {
    try {
      const result = await cashService.createCashTransaction(req.user, req.body, req);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createBankDeposit(req, res) {
    try {
      const result = await cashService.createBankDeposit(req.user, req.body, req);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getBankDeposits(req, res) {
    try {
      const { status } = req.query;
      const result = await cashService.getBankDeposits(req.user, status);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getCashTransactions(req, res) {
    try {
      const { limit } = req.query;
      const result = await cashService.getCashTransactions(req.user, limit || 50);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getOperatorHistory(req, res) {
    try {
      const { timeframe } = req.query; // timeframe: 'day' | 'month'
      const result = await cashService.getOperatorHistory(req.user, timeframe || 'day');
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async reconcileBankDeposit(req, res) {
    try {
      const { id } = req.params;
      const result = await cashService.reconcileBankDeposit(req.user, id, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async receivePhysicalPayment(req, res) {
    try {
      const result = await cashService.receivePhysicalPayment(req.user, req.body);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async searchWallets(req, res) {
    try {
      const { q } = req.query;
      const result = await cashService.searchWallets(req.user, q);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new CashController();
