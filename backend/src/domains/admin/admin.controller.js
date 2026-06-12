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
      const result = await adminService.getSecurityLogs(filters, limit, offset);
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
}

module.exports = new AdminController();
