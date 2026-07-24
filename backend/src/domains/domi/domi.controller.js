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
      const { totalCop, distanceKm, distance_km } = req.body;
      const result = await domiService.calculateOrderCost(totalCop, distanceKm || distance_km);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getSystemWallet(req, res) {
    try {
      const result = await domiService.getSystemWallet(req.user, req);
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
      const result = await domiService.getLedger(req.user, req.query, req);
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

  async createCheckoutSession(req, res) {
    try {
      const result = await domiService.createCheckoutSession(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async wompiWebhook(req, res) {
    try {
      const result = await domiService.wompiWebhook(req.body, req);
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async transferDomis(req, res) {
    try {
      const result = await domiService.transferDomis(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getWalletHistory(req, res) {
    try {
      const { ownerType, ownerId } = req.params;
      const result = await domiService.getWalletHistory(req.user, ownerType, ownerId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async mintManual(req, res) {
    try {
      const result = await domiService.mintManual(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async burnManual(req, res) {
    try {
      const result = await domiService.burnManual(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  // --- CONTROLADORES DE ALIAS DE WALLET ("BRE-B") ---
  async getWalletAliases(req, res) {
    try {
      const { ownerType, ownerId } = req.params;
      const result = await domiService.getWalletAliases(req.user, ownerType, ownerId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createWalletAlias(req, res) {
    try {
      const { ownerType, ownerId } = req.params;
      const { alias } = req.body;
      const result = await domiService.createWalletAlias(req.user, ownerType, ownerId, alias, req);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deleteWalletAlias(req, res) {
    try {
      const { ownerType, ownerId, aliasId } = req.params;
      const result = await domiService.deleteWalletAlias(req.user, ownerType, ownerId, parseInt(aliasId, 10), req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async checkAliasAvailability(req, res) {
    try {
      const { alias } = req.query;
      const result = await domiService.checkAliasAvailability(alias);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async suggestWalletAlias(req, res) {
    try {
      const { ownerType, ownerId } = req.params;
      const result = await domiService.suggestWalletAlias(req.user, ownerType, ownerId);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  // ====================================================================
  // NUEVOS CONTROLADORES ADMINISTRATIVOS: PRECIOS, RETIROS Y PARAMETROS
  // ====================================================================

  async getPricingStatus(req, res) {
    try {
      const result = await domiService.getPricingStatus();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getPricingHistory(req, res) {
    try {
      const result = await domiService.getPricingHistory(req.user, req);
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

  async getTierRules(req, res) {
    try {
      const result = await domiService.getTierRules();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateTierRules(req, res) {
    try {
      const { tier } = req.params;
      const result = await domiService.updateTierRules(req.user, tier, req.body);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async verifyLedgerChain(req, res) {
    try {
      const { walletId } = req.params;
      const result = await domiService.verifyLedgerChain(parseInt(walletId, 10));
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async approveExcessPurchase(req, res) {
    try {
      const result = await domiService.approveExcessPurchase(req.user, req.body);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getWithdrawalAccounts(req, res) {
    try {
      const result = await domiService.getWithdrawalAccounts(req.user, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createWithdrawalAccount(req, res) {
    try {
      const result = await domiService.createWithdrawalAccount(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deleteWithdrawalAccount(req, res) {
    try {
      const { id } = req.params;
      const result = await domiService.deleteWithdrawalAccount(req.user, id, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async setDefaultWithdrawalAccount(req, res) {
    try {
      const { id } = req.params;
      const result = await domiService.setDefaultWithdrawalAccount(req.user, id, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getDebts(req, res) {
    try {
      const result = await domiService.getUserDebts(req.user, req.user.id, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async payDebt(req, res) {
    try {
      const { debtId } = req.params;
      const result = await domiService.payDebt(req.user.id, parseInt(debtId, 10), req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async payStoreDebt(req, res) {
    try {
      const { debtId } = req.params;
      const result = await domiService.payStoreDebt(req.user, parseInt(debtId, 10), req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new DomiController();
