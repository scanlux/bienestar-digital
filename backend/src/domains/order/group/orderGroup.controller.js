const orderGroupService = require('../services/OrderGroupService');

class OrderGroupController {
  async createGroup(req, res, next) {
    try {
      const result = await orderGroupService.createGroup(req.user, req.body, req);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async cancelGroup(req, res, next) {
    try {
      const { groupOrderId } = req.params;
      const result = await orderGroupService.cancelGroup(req.user, parseInt(groupOrderId), req);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderGroupController();
