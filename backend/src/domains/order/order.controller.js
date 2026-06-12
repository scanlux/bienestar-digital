const orderService = require('./order.service');
const { handleControllerError } = require('../../utils/errors');

class OrderController {
  async getOrders(req, res) {
    try {
      const result = await orderService.getOrders(req.user);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const result = await orderService.updateOrderStatus(req.user, orderId, status, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createOrder(req, res) {
    try {
      const result = await orderService.createOrder(req.user, req.body, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getUserOrders(req, res) {
    try {
      const { userId } = req.params;
      const result = await orderService.getUserOrders(req.user, userId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new OrderController();
