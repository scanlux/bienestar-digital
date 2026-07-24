const adminService = require('./admin.service');
const { handleControllerError } = require('../../utils/errors');

class AdminController {
  async getRegistrationRequests(req, res) {
    try {
      const { estado } = req.query;
      const result = await adminService.getRegistrationRequests(estado);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async rejectRegistrationRequest(req, res) {
    try {
      const { id } = req.params;
      const { notas_system } = req.body;
      const result = await adminService.rejectRegistrationRequest(req.user, id, notas_system, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async approveRegistrationRequest(req, res) {
    try {
      const { id } = req.params;
      const { notas_system } = req.body;
      const result = await adminService.approveRegistrationRequest(req.user, id, notas_system, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getInfoRequestPreview(req, res) {
    try {
      const { id } = req.params;
      const { missingFields } = req.body;
      const result = await adminService.getInfoRequestPreview(req.user, id, { missingFields }, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async sendInfoRequest(req, res) {
    try {
      const { id } = req.params;
      const { missingFields, notas_system } = req.body;
      const result = await adminService.sendInfoRequest(req.user, id, { missingFields, notas_system }, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getSecurityLogs(req, res) {
    try {
      const limit = req.query.limit || 50;
      const offset = req.query.offset || 0;
      const filters = {
        eventType: req.query.eventType,
        severity: req.query.severity,
        resourceType: req.query.resourceType,
        resourceId: req.query.resourceId,
        actorType: req.query.actorType,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };
      const result = await adminService.getSecurityLogs(req.user, filters, limit, offset, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getGlobalStats(req, res) {
    try {
      const result = await adminService.getGlobalStats();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async sendInvitation(req, res) {
    try {
      const result = await adminService.sendInvitation(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getInvitations(req, res) {
    try {
      const result = await adminService.getInvitations();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getFinancialFlags(req, res) {
    try {
      const result = await adminService.getFinancialFlags();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateFinancialFlag(req, res) {
    try {
      const { key } = req.params;
      const { enabled } = req.body;
      const result = await adminService.updateFinancialFlag(req.user, key, enabled, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updatePermissionUIMode(req, res) {
    try {
      const { id } = req.params;
      const { ui_restriction_mode } = req.body;
      const result = await adminService.updatePermissionUIMode(req.user, id, ui_restriction_mode, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getEmailTemplates(req, res) {
    try {
      const result = await adminService.getEmailTemplates(req.user, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getEmailTemplate(req, res) {
    try {
      const { name } = req.params;
      const result = await adminService.getEmailTemplate(req.user, name, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateEmailTemplate(req, res) {
    try {
      const { name } = req.params;
      const { subject, html_body } = req.body;
      const result = await adminService.updateEmailTemplate(req.user, name, { subject, html_body }, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createEmailTemplate(req, res) {
    try {
      const result = await adminService.createEmailTemplate(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateRequestVerifiedFields(req, res) {
    try {
      const { id } = req.params;
      const { fields, documents } = req.body;
      const result = await adminService.updateRequestVerifiedFields(req.user, id, { fields, documents }, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getRequestHistory(req, res) {
    try {
      const { id } = req.params;
      const result = await adminService.getRequestHistory(req.user, id, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getSystemParameters(req, res) {
    try {
      const result = await adminService.getSystemParameters(req.user, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateSystemParameters(req, res) {
    try {
      const result = await adminService.updateSystemParameters(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getSystemNavigation(req, res) {
    try {
      const result = await adminService.getSystemNavigation(req.user, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async reorderSystemNavigation(req, res) {
    try {
      const result = await adminService.reorderSystemNavigation(req.user, req.body.items, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateSystemNavigationItem(req, res) {
    try {
      const { id } = req.params;
      const result = await adminService.updateSystemNavigationItem(req.user, id, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new AdminController();
