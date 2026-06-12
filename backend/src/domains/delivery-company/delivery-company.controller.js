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
}

module.exports = new DeliveryCompanyController();
