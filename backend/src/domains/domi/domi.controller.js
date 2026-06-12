const domiService = require('./domi.service');
const { handleControllerError } = require('../../utils/errors');

class DomiController {
  async getTokenRegistry(req, res) {
    try {
      const result = await domiService.getTokenRegistry();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getProtocolRules(req, res) {
    try {
      const result = await domiService.getProtocolRules();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async calculateOrderCost(req, res) {
    try {
      const { totalCop } = req.body;
      const result = await domiService.calculateOrderCost(totalCop);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getSystemWallet(req, res) {
    try {
      const result = await domiService.getSystemWallet();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getWallet(req, res) {
    try {
      const { ownerType, ownerId } = req.params;
      const result = await domiService.getWallet(req.user, ownerType, ownerId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async mintDomis(req, res) {
    try {
      const result = await domiService.mintDomis(req.user, req.body);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getPackages(req, res) {
    try {
      const { storeId } = req.params;
      const result = await domiService.getPackages(req.user, storeId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getLedger(req, res) {
    try {
      const result = await domiService.getLedger(req.query);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async topupStore(req, res) {
    try {
      const { storeId } = req.params;
      const result = await domiService.topupStore(req.user, storeId, req.body);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async wopiWebhook(req, res) {
    try {
      const result = await domiService.wopiWebhook(req.body, req.headers, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new DomiController();
