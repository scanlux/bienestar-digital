const deliveryCompanyService = require('./delivery-company.service');
const { handleControllerError } = require('../../utils/errors');

class DeliveryCompanyController {
  async getDrivers(req, res) {
    try {
      const result = await deliveryCompanyService.getDrivers(req.user, req.query);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async affiliateDriver(req, res) {
    try {
      const message = await deliveryCompanyService.affiliateDriver(req.user, req.body);
      res.json({ success: true, message });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deaffiliateDriver(req, res) {
    try {
      const { userId } = req.params;
      const message = await deliveryCompanyService.deaffiliateDriver(req.user, userId, req.query);
      res.json({ success: true, message });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getDashboardStats(req, res) {
    try {
      const stats = await deliveryCompanyService.getDashboardStats(req.user);
      res.json(stats);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getAvailableDrivers(req, res) {
    try {
      const drivers = await deliveryCompanyService.getAvailableDrivers(req.user, req.query);
      res.json(drivers);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getAvailableOrders(req, res) {
    try {
      const orders = await deliveryCompanyService.getAvailableOrders(req.user);
      res.json(orders);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getOrderHistory(req, res) {
    try {
      const history = await deliveryCompanyService.getOrderHistory(req.user, req.query);
      res.json(history);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async acceptOrder(req, res) {
    try {
      const { orderId } = req.params;
      const result = await deliveryCompanyService.acceptOrder(req.user, orderId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async assignDriver(req, res) {
    try {
      const { orderId } = req.params;
      const { driverUserId } = req.body;
      const result = await deliveryCompanyService.assignDriver(req.user, orderId, driverUserId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getFinancialSummary(req, res) {
    try {
      const { id } = req.query; // Puede venir id por query en caso de system_user
      const { filterType, selectedMonth } = req.query;
      const result = await deliveryCompanyService.getDeliveryFinancialSummary(req.user, { id, filterType, selectedMonth }, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new DeliveryCompanyController();
