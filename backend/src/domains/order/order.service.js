const OrderLifecycleService = require('./services/OrderLifecycleService');
const OrderQueryService = require('./services/OrderQueryService');
const OrderMessagingService = require('./services/OrderMessagingService');

class OrderService {
  constructor() {
    this.lifecycleService = new OrderLifecycleService(this);
    this.queryService = new OrderQueryService(this);
    this.messagingService = new OrderMessagingService(this);
  }

  // --- LIFECYCLE SERVICE DELEGATIONS ---
  async createOrder(user, data, req) {
    return await this.lifecycleService.createOrder(user, data, req);
  }

  async updateOrderStatus(user, orderId, status, req) {
    return await this.lifecycleService.updateOrderStatus(user, orderId, status, req);
  }

  async acceptOrder(user, orderId, req) {
    return await this.lifecycleService.acceptOrder(user, orderId, req);
  }

  async updateOrderItems(user, orderId, itemsToRemove, itemsToAdd, req) {
    return await this.lifecycleService.updateOrderItems(user, orderId, itemsToRemove, itemsToAdd, req);
  }

  // --- QUERY SERVICE DELEGATIONS ---
  async getOrders(user) {
    return await this.queryService.getOrders(user);
  }

  async getUserOrders(user, userId, req) {
    return await this.queryService.getUserOrders(user, userId, req);
  }

  async getOrderItems(user, orderId, req) {
    return await this.queryService.getOrderItems(user, orderId, req);
  }

  async getOrderDetail(user, orderId, req) {
    return await this.queryService.getOrderDetail(user, orderId, req);
  }

  async getCustomerUnreadCount(user, req) {
    return await this.queryService.getCustomerUnreadCount(user, req);
  }

  // --- MESSAGING SERVICE DELEGATIONS ---
  async notifyUnavailableItems(user, orderId, agotadosItemIds, req) {
    return await this.messagingService.notifyUnavailableItems(user, orderId, agotadosItemIds, req);
  }

  async getCustomerMessagesList(user, req) {
    return await this.messagingService.getCustomerMessagesList(user, req);
  }

  async markCustomerMessagesRead(user, orderId, req) {
    return await this.messagingService.markCustomerMessagesRead(user, orderId, req);
  }

  async getOrderMessages(user, orderId, req) {
    return await this.messagingService.getOrderMessages(user, orderId, req);
  }
}

module.exports = new OrderService();
