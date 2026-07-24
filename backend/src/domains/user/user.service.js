const UserStoreAdminService = require('./services/UserStoreAdminService');
const UserSystemService = require('./services/UserSystemService');
const UserFinancialService = require('./services/UserFinancialService');

class UserService {
  constructor() {
    this.storeAdminService = new UserStoreAdminService(this);
    this.systemService = new UserSystemService(this);
    this.financialService = new UserFinancialService(this);
  }

  // --- STORE ADMIN SERVICE DELEGATIONS ---
  async getStoreAdmins(userContext) {
    return await this.storeAdminService.getStoreAdmins(userContext);
  }

  async createStoreAdmin(userContext, data, req) {
    return await this.storeAdminService.createStoreAdmin(userContext, data, req);
  }

  async updateStoreAdmin(userContext, id, data, req) {
    return await this.storeAdminService.updateStoreAdmin(userContext, id, data, req);
  }

  async updateStoreAdminStatus(userContext, id, estado, req) {
    return await this.storeAdminService.updateStoreAdminStatus(userContext, id, estado, req);
  }

  async sendStoreAdminRecoveryEmail(userContext, id, req) {
    return await this.storeAdminService.sendStoreAdminRecoveryEmail(userContext, id, req);
  }

  // --- SYSTEM SERVICE DELEGATIONS ---
  async getUsers(userContext) {
    return await this.systemService.getUsers(userContext);
  }

  async getSystemUsers(userContext) {
    return await this.systemService.getSystemUsers(userContext);
  }

  async createSystemUser(userContext, data, req) {
    return await this.systemService.createSystemUser(userContext, data, req);
  }

  async moderateUser(userContext, targetUserId, data, req) {
    return await this.systemService.moderateUser(userContext, targetUserId, data, req);
  }

  async getModerationHistory(userContext, targetUserId, targetUserType) {
    return await this.systemService.getModerationHistory(userContext, targetUserId, targetUserType);
  }

  // --- FINANCIAL SERVICE DELEGATIONS ---
  async setFinancialPin(userContext, data, req) {
    return await this.financialService.setFinancialPin(userContext, data, req);
  }

  async unlockFinancialPin(userContext, targetUserId, req) {
    return await this.financialService.unlockFinancialPin(userContext, targetUserId, req);
  }

  async generateResetPinLink(userContext, targetUserId, req) {
    return await this.financialService.generateResetPinLink(userContext, targetUserId, req);
  }
}

module.exports = new UserService();
