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

  async acceptOrder(req, res) {
    try {
      const { orderId } = req.params;
      const result = await orderService.acceptOrder(req.user, parseInt(orderId, 10), req);
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

  async getOrderItems(req, res) {
    try {
      const { orderId } = req.params;
      const result = await orderService.getOrderItems(req.user, orderId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async notifyUnavailableItems(req, res) {
    try {
      const { orderId } = req.params;
      const { agotados } = req.body;
      const result = await orderService.notifyUnavailableItems(req.user, orderId, agotados, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateOrderItems(req, res) {
    try {
      const { orderId } = req.params;
      const { itemsToRemove, itemsToAdd } = req.body;
      const result = await orderService.updateOrderItems(req.user, orderId, itemsToRemove, itemsToAdd, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getCustomerMessagesList(req, res) {
    try {
      const result = await orderService.getCustomerMessagesList(req.user, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getCustomerUnreadCount(req, res) {
    try {
      const result = await orderService.getCustomerUnreadCount(req.user, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async markCustomerMessagesRead(req, res) {
    try {
      const { orderId } = req.params;
      const result = await orderService.markCustomerMessagesRead(req.user, orderId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getOrderMessages(req, res) {
    try {
      const { orderId } = req.params;
      const result = await orderService.getOrderMessages(req.user, orderId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getOrderDetail(req, res) {
    try {
      const { orderId } = req.params;
      const result = await orderService.getOrderDetail(req.user, orderId, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new OrderController();
