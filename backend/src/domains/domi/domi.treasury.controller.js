const domiService = require('./domi.service');
const { handleControllerError } = require('../../utils/errors');

class DomiTreasuryController {
  async getTreasuryStatus(req, res) {
    try {
      const result = await domiService.getPricingStatus();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getPricingHistory(req, res) {
    try {
      const result = await domiService.getPricingHistory();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getRevenueBreakdown(req, res) {
    try {
      const { from, to } = req.query;
      const result = await domiService.getRevenueBreakdown(req.user, from, to);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getDailyBurnStats(req, res) {
    try {
      const { days } = req.query;
      const result = await domiService.getDailyBurnStats(req.user, days);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getWithdrawalRequests(req, res) {
    try {
      const result = await domiService.getWithdrawalRequests(req.user, req.query);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async processWithdrawalRequest(req, res) {
    try {
      const { id } = req.params;
      const result = await domiService.processWithdrawalRequest(req.user, parseInt(id, 10), req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async declareReserve(req, res) {
    try {
      const result = await domiService.declareReserve(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async mintCash(req, res) {
    try {
      const result = await domiService.mintCash(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async confirmCashMint(req, res) {
    try {
      const { packageId } = req.params;
      const result = await domiService.confirmCashMint(req.user, parseInt(packageId, 10), req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async proposeYieldAdjustment(req, res) {
    try {
      const result = await domiService.proposeYieldAdjustment(req.user, req.body);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async applyYieldAdjustment(req, res) {
    try {
      const result = await domiService.applyYieldAdjustment(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async applyNewPeg(req, res) {
    try {
      const result = await domiService.applyNewPeg(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new DomiTreasuryController();
