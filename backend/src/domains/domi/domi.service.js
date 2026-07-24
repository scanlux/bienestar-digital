const DomiWalletService = require('./services/domiWallet.service');
const DomiWithdrawalService = require('./services/domiWithdrawal.service');
const DomiDebtService = require('./services/domiDebt.service');
const DomiTreasuryService = require('./services/domiTreasury.service');

class DomiService {
  constructor() {
    this.walletService = new DomiWalletService(this);
    this.withdrawalService = new DomiWithdrawalService(this);
    this.debtService = new DomiDebtService(this);
    this.treasuryService = new DomiTreasuryService(this);
  }

  // --- WALLET METHODS ---
  async getWalletDirect(ownerType, ownerId) {
    return await this.walletService.getWalletDirect(ownerType, ownerId);
  }

  async getSystemWallet(userContext, req) {
    return await this.walletService.getSystemWallet(userContext, req);
  }

  async getWallet(userContext, ownerType, ownerId, req) {
    return await this.walletService.getWallet(userContext, ownerType, ownerId, req);
  }

  async mintDomis(userContext, data) {
    return await this.walletService.mintDomis(userContext, data);
  }

  async getPackages(userContext, storeId, req) {
    return await this.walletService.getPackages(userContext, storeId, req);
  }

  async getLedger(userContext, queryFilters, req) {
    return await this.walletService.getLedger(userContext, queryFilters, req);
  }

  async topupStore(userContext, storeId, bodyData, req) {
    return await this.walletService.topupStore(userContext, storeId, bodyData, req);
  }

  async createCheckoutSession(userContext, data, req) {
    return await this.walletService.createCheckoutSession(userContext, data, req);
  }

  async wompiWebhook(body, req) {
    return await this.walletService.wompiWebhook(body, req);
  }

  async transferDomis(userContext, data, req) {
    return await this.walletService.transferDomis(userContext, data, req);
  }

  async getWalletHistory(userContext, ownerType, ownerId, req) {
    return await this.walletService.getWalletHistory(userContext, ownerType, ownerId, req);
  }

  async mintManual(userContext, data, req) {
    return await this.walletService.mintManual(userContext, data, req);
  }

  async burnManual(userContext, data, req) {
    return await this.walletService.burnManual(userContext, data, req);
  }

  async getWalletAliases(userContext, ownerType, ownerId, req) {
    return await this.walletService.getWalletAliases(userContext, ownerType, ownerId, req);
  }

  async createWalletAlias(userContext, ownerType, ownerId, alias, req) {
    return await this.walletService.createWalletAlias(userContext, ownerType, ownerId, alias, req);
  }

  async deleteWalletAlias(userContext, ownerType, ownerId, aliasId, req) {
    return await this.walletService.deleteWalletAlias(userContext, ownerType, ownerId, aliasId, req);
  }

  async checkAliasAvailability(alias) {
    return await this.walletService.checkAliasAvailability(alias);
  }

  async suggestWalletAlias(userContext, ownerType, ownerId) {
    return await this.walletService.suggestWalletAlias(userContext, ownerType, ownerId);
  }

  async verifyLedgerChain(walletId) {
    return await this.walletService.verifyLedgerChain(walletId);
  }

  // --- WITHDRAWAL METHODS ---
  async getWithdrawalRequests(userContext, filters = {}) {
    return await this.withdrawalService.getWithdrawalRequests(userContext, filters);
  }

  async processWithdrawalRequest(userContext, requestId, data, req) {
    return await this.withdrawalService.processWithdrawalRequest(userContext, requestId, data, req);
  }

  async getWithdrawalAccounts(userContext, req) {
    return await this.withdrawalService.getWithdrawalAccounts(userContext, req);
  }

  async createWithdrawalAccount(userContext, data, req) {
    return await this.withdrawalService.createWithdrawalAccount(userContext, data, req);
  }

  async deleteWithdrawalAccount(userContext, id, req) {
    return await this.withdrawalService.deleteWithdrawalAccount(userContext, id, req);
  }

  async setDefaultWithdrawalAccount(userContext, id, req) {
    return await this.withdrawalService.setDefaultWithdrawalAccount(userContext, id, req);
  }

  // --- DEBT METHODS ---
  async getUserDebts(userContext, userId, req = null) {
    return await this.debtService.getUserDebts(userContext, userId, req);
  }

  async payDebt(userId, debtId, req) {
    return await this.debtService.payDebt(userId, debtId, req);
  }

  async payStoreDebt(userContext, debtId, req) {
    return await this.debtService.payStoreDebt(userContext, debtId, req);
  }

  // --- TREASURY METHODS ---
  async getTokenRegistry() {
    return await this.treasuryService.getTokenRegistry();
  }

  async getProtocolRules() {
    return await this.treasuryService.getProtocolRules();
  }

  async calculateOrderCost(totalCop, distanceKm) {
    return await this.treasuryService.calculateOrderCost(totalCop, distanceKm);
  }

  async getPricingStatus() {
    return await this.treasuryService.getPricingStatus();
  }

  async getPricingHistory(userContext, req = null) {
    return await this.treasuryService.getPricingHistory(userContext, req);
  }

  async getRevenueBreakdown(userContext, from, to) {
    return await this.treasuryService.getRevenueBreakdown(userContext, from, to);
  }

  async getDailyBurnStats(userContext, days) {
    return await this.treasuryService.getDailyBurnStats(userContext, days);
  }

  async proposeYieldAdjustment(userContext, data) {
    return await this.treasuryService.proposeYieldAdjustment(userContext, data);
  }

  async applyNewPeg(userContext, data, req) {
    return await this.treasuryService.applyNewPeg(userContext, data, req);
  }

  async applyYieldAdjustment(userContext, data, req) {
    return await this.treasuryService.applyYieldAdjustment(userContext, data, req);
  }

  async getTierRules() {
    return await this.treasuryService.getTierRules();
  }

  async updateTierRules(userContext, tier, data) {
    return await this.treasuryService.updateTierRules(userContext, tier, data);
  }

  async approveExcessPurchase(userContext, data) {
    return await this.treasuryService.approveExcessPurchase(userContext, data);
  }

  async mintCash(userContext, data, req) {
    return await this.treasuryService.mintCash(userContext, data, req);
  }

  async confirmCashMint(userContext, packageId, req) {
    return await this.treasuryService.confirmCashMint(userContext, packageId, req);
  }

  async declareReserve(userContext, data, req) {
    return await this.treasuryService.declareReserve(userContext, data, req);
  }
}

module.exports = new DomiService();
