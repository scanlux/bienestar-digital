const AdminRegistrationService = require('./services/admin.registration.service');
const AdminSystemService = require('./services/admin.system.service');
const AdminAuditService = require('./services/admin.audit.service');

class AdminService {
  constructor() {
    this.registrationService = new AdminRegistrationService(this);
    this.systemService = new AdminSystemService(this);
    this.auditService = new AdminAuditService(this);
  }

  async getRegistrationRequests(status) {
    return this.registrationService.getRegistrationRequests(status);
  }

  async rejectRegistrationRequest(user, id, notes_system, req) {
    return this.registrationService.rejectRegistrationRequest(user, id, notes_system, req);
  }

  async approveRegistrationRequest(user, id, notes_system, req) {
    return this.registrationService.approveRegistrationRequest(user, id, notes_system, req);
  }

  async sendInvitation(user, invitationData, req) {
    return this.registrationService.sendInvitation(user, invitationData, req);
  }

  async getInvitations() {
    return this.registrationService.getInvitations();
  }

  async getSecurityLogs(user, filters, limit = 50, offset = 0, req) {
    return this.auditService.getSecurityLogs(user, filters, limit, offset, req);
  }

  async getGlobalStats() {
    return this.systemService.getGlobalStats();
  }

  async getFinancialFlags() {
    return this.systemService.getFinancialFlags();
  }

  async updateFinancialFlag(user, key, enabled, req) {
    return this.systemService.updateFinancialFlag(user, key, enabled, req);
  }

  async updatePermissionUIMode(user, id, mode, req) {
    return this.systemService.updatePermissionUIMode(user, id, mode, req);
  }

  async getEmailTemplates(user, req) {
    return this.auditService.getEmailTemplates(user, req);
  }

  async getEmailTemplate(user, name, req) {
    return this.auditService.getEmailTemplate(user, name, req);
  }

  async updateEmailTemplate(user, name, data, req) {
    return this.auditService.updateEmailTemplate(user, name, data, req);
  }

  async createEmailTemplate(user, data, req) {
    return this.auditService.createEmailTemplate(user, data, req);
  }

  async getInfoRequestPreview(user, id, data, req = null) {
    return this.registrationService.getInfoRequestPreview(user, id, data, req);
  }

  async sendInfoRequest(user, id, data, req) {
    return this.registrationService.sendInfoRequest(user, id, data, req);
  }

  async updateRequestVerifiedFields(user, id, data, req) {
    return this.registrationService.updateRequestVerifiedFields(user, id, data, req);
  }

  async getRequestHistory(user, id, req) {
    return this.registrationService.getRequestHistory(user, id, req);
  }

  async getSystemParameters(user, req = null) {
    return this.systemService.getSystemParameters(user, req);
  }

  async updateSystemParameters(user, data, req) {
    return this.systemService.updateSystemParameters(user, data, req);
  }

  async getSystemNavigation(user, req) {
    return this.systemService.getSystemNavigation(user, req);
  }

  async reorderSystemNavigation(user, items, req) {
    return this.systemService.reorderSystemNavigation(user, items, req);
  }

  async updateSystemNavigationItem(user, id, data, req) {
    return this.systemService.updateSystemNavigationItem(user, id, data, req);
  }
}

module.exports = new AdminService();
