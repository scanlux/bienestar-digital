const upgradesService = require('./upgrades.service');
const { handleControllerError } = require('../../utils/errors');

class UpgradesController {
  async getActiveUpgrades(req, res) {
    try {
      const result = await upgradesService.getActiveUpgrades(req.user, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async purchaseUpgrade(req, res) {
    try {
      const { upgrade_type } = req.body;
      const result = await upgradesService.purchaseUpgrade(req.user, upgrade_type, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
  async getCatalog(req, res) {
    try {
      const result = await upgradesService.getCatalog(req.user);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createCatalogEntry(req, res) {
    try {
      const result = await upgradesService.createCatalogEntry(req.user, req.body, req);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateCatalogEntry(req, res) {
    try {
      const { key } = req.params;
      const result = await upgradesService.updateCatalogEntry(req.user, key, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getAllUpgradesAdmin(req, res) {
    try {
      const result = await upgradesService.getAllUpgradesAdmin(req.user, req.query, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async grantUpgradeManual(req, res) {
    try {
      const result = await upgradesService.grantUpgradeManual(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async revokeUpgrade(req, res) {
    try {
      const { id } = req.params;
      const result = await upgradesService.revokeUpgrade(req.user, id, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new UpgradesController();
