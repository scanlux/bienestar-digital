const orderRepository = require('../order.repository');
const { ForbiddenError, NotFoundError, ValidationError, BusinessError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const domiEngine = require('../../../services/domiEngine');
const db = require('../../../config/db');
const domiCashbackEngine = require('../../../services/domiCashbackEngine');
const domiRedis = require('../../../services/domiRedis');
const notificationService = require('../../../services/notificationService');
const assertOrderAccess = require('../helpers/orderAccessGuard');
const fcmService = require('../../../services/fcmService');

class OrderLifecycleService {
  constructor(orderService) {
    this.orderService = orderService;
  }

  async updateOrderStatus(user, orderId, status, req) {
    const isSystem = user.actorType === 'system_user';
    const commerceId = user.commerceId;

    if (!status || !['pendiente', 'aceptado', 'preparando', 'listo', 'en_camino', 'entregado', 'cancelado'].includes(status)) {
      throw new ValidationError('Estado invalido o no provisto.');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (orderRows.length === 0) {
        throw new NotFoundError('Pedido no encontrado.');
      }
      const order = orderRows[0];
      const storeId = order.store_id;

      await assertOrderAccess(user, order, status, req);
      const oldStatus = order.status;

      if (status === 'aceptado' && oldStatus === 'pendiente') {
        const costDetails = await domiEngine.calculateOrderCost(parseFloat(order.total_cop), order.distance_km);
        const storeWallet = await domiEngine.getStoreWallet(conn, order.store_id);
        const storeBalance = parseFloat(storeWallet.balance_custody);
        const storeCommission = costDetails.store_cost_domis;

        if (storeBalance < storeCommission) {
          throw new BusinessError(`Saldo insuficiente en DOMIs para aceptar el pedido. Se requiere 1.0 DOMI (400 COP), saldo disponible: ${storeBalance} DOMI. Por favor compra tokens DOMI.`);
        }

        await domiEngine.chargeForOrder(orderId, order.store_id, null, storeCommission, 0);

        const [prepRows] = await conn.query('SELECT MAX(COALESCE(prep_time_snapshot, 0)) as max_prep FROM order_items WHERE order_id = ?', [orderId]);
        const maxPrepTime = prepRows[0]?.max_prep || 0;

        await conn.query('UPDATE orders SET estimated_prep_time_minutes = ?, preparation_started_at = NOW(), accepted_at = NOW(6) WHERE id = ?', [maxPrepTime, orderId]);
      }

      let settleResult = null;
      if (status === 'entregado' && oldStatus !== 'entregado') {
        const costDetails = await domiEngine.calculateOrderCost(parseFloat(order.total_cop), order.distance_km);

        const [userRows] = await conn.query('SELECT cod_penalty_remaining_orders FROM users WHERE id = ?', [order.customer_user_id]);
        const codPenalty = userRows.length > 0 ? userRows[0].cod_penalty_remaining_orders : 0;
        if (codPenalty > 0) {
          await conn.query('UPDATE users SET cod_penalty_remaining_orders = GREATEST(0, cod_penalty_remaining_orders - 1) WHERE id = ?', [order.customer_user_id]);
        }

        if (order.payment_method_customer === 'domi') {
          settleResult = await domiEngine.settleOrderPayment(conn, order, costDetails);
        } else {
          const rules = await domiEngine.getProtocolRules(conn);
          const scoreDelta = parseInt(rules.score_earned_on_purchase) || 5;
          await domiCashbackEngine.incrementScore(order.customer_user_id, scoreDelta, conn);
        }
      }

      if (status === 'cancelado' && oldStatus !== 'cancelado') {
        const cancelResult = await domiEngine.routeCancellation(conn, order, oldStatus, user);
        if (cancelResult && cancelResult.nextStatus) {
          status = cancelResult.nextStatus;
        }
      }

      if (status === 'cancelado' && oldStatus !== 'cancelado') {
        if (user.rol === 'admin' || user.actorType === 'operator' || user.commerceId) {
          const observation = req.body.observation || req.body.observacion;
          if (!observation || typeof observation !== 'string' || observation.trim().length < 5) {
            throw new ValidationError('El motivo de rechazo es obligatorio y debe tener al menos 5 caracteres.');
          }
          await conn.query('UPDATE orders SET store_rejection_notes = ? WHERE id = ?', [observation.trim(), orderId]);
        }
      }

      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
      await conn.commit();

      if (settleResult) {
        await domiRedis.incrementBalance('store', settleResult.storeId, settleResult.orderTotalDomi);
        if (settleResult.hasDriverPayment) {
          await domiRedis.incrementBalance(settleResult.driverOwnerType, settleResult.driverOwnerId, settleResult.deliveryDomi);
        }
      }

      // Trigger FCM push notification asynchronously
      if (status !== oldStatus) {
        let pushBody = '';
        if (status === 'aceptado') {
          pushBody = 'Tu pedido fue aceptado y está siendo preparado';
        } else if (status === 'preparando') {
          pushBody = 'Tu pedido está en preparación';
        } else if (status === 'listo') {
          pushBody = 'Tu pedido está listo, esperando al repartidor';
        } else if (status === 'en_camino') {
          pushBody = 'Tu repartidor va en camino';
        } else if (status === 'en_rescate') {
          pushBody = 'Tu repartidor reportó un inconveniente. Buscando solución';
        } else if (status === 'entregado') {
          pushBody = 'Pedido entregado. ¡Gracias por tu compra!';
        } else if (status === 'cancelado') {
          if (user.rol === 'admin' || user.actorType === 'operator' || user.commerceId) {
            pushBody = 'Tu pedido fue cancelado por el establecimiento';
          } else if (isSystem) {
            pushBody = 'No encontramos repartidor disponible. Pedido cancelado';
          }
        }

        if (pushBody) {
          this._sendPushToCustomer(
            order.customer_user_id,
            'Actualización de tu pedido',
            pushBody,
            { orderId: String(orderId), newStatus: status }
          );
        }
      }

      await logSecurityEvent(user.id, 'CHANGE_ORDER_STATUS', 'LOW', req, { orderId: parseInt(orderId), status }, 'store', storeId);

      return { success: true, message: `Estado del pedido actualizado a: ${status}` };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async createOrder(user, data, req) {
    const { store_id, customer_user_id, total_cop, payment_method_customer, delivery_address, notes, items, distance_km } = data;
    const paymentMethod = payment_method_customer || 'domi';

    if (!store_id || !customer_user_id || !total_cop) {
      throw new ValidationError('Faltan campos obligatorios (store_id, customer_user_id, total_cop)');
    }

    if (user.rol !== 'admin' && String(user.id) !== String(customer_user_id)) {
      await logSecurityEvent(user.id, 'BOLA_ATTEMPT', 'HIGH', req, { reason: 'Intento de crear pedido para otro usuario', targetCustomerUserId: customer_user_id });
      throw new ForbiddenError('Acceso no autorizado. No puedes crear pedidos para otros usuarios.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [debtRows] = await connection.query("SELECT SUM(amount_domis) as total_debt FROM domi_order_debts WHERE customer_user_id = ? AND status = 'pending'", [customer_user_id]);
      const totalDebt = parseFloat(debtRows[0]?.total_debt || 0);
      if (totalDebt > 0) {
        throw new BusinessError(`No puedes realizar nuevos pedidos debido a que tienes una Compensación Automática de ${totalDebt} DOMIs pendiente de pago. Por favor liquida tu deuda primero en tu monedero.`, 400);
      }

      const [userRows] = await connection.query('SELECT cod_penalty_remaining_orders, domi_score, rol FROM users WHERE id = ?', [customer_user_id]);
      if (userRows.length === 0) {
        throw new NotFoundError('Usuario destinatario del pedido no encontrado.');
      }
      
      const targetUserRol = userRows[0].rol;
      if (targetUserRol !== 'customer') {
        await logSecurityEvent(user.id, 'UNAUTHORIZED_ORDER_CREATION_ROLE', 'HIGH', req, { reason: 'Intento de crear pedido para un usuario que no tiene rol customer', targetCustomerUserId: customer_user_id, targetUserRol });
        throw new BusinessError('Acceso denegado. Solo los usuarios con rol de cliente (customer) pueden realizar pedidos.', 403);
      }

      const codPenalty = userRows[0].cod_penalty_remaining_orders;
      const domiScore = userRows[0].domi_score;

      if (paymentMethod === 'cash_cod') {
        if (codPenalty > 0) {
          throw new BusinessError('No puedes realizar pedidos con pago en efectivo (COD) debido a una penalización activa por incumplimientos previos. Por favor utiliza pago digital con DOMI.', 400);
        }
        if (domiScore <= 0) {
          throw new BusinessError(`No puedes realizar pedidos con pago en efectivo debido a que tu nivel de Score es de ${domiScore}. Debes tener Score positivo (> 0) para usar pago en efectivo. Por favor utiliza pago digital con DOMI.`, 400);
        }
      }

      const costDetails = await domiEngine.calculateOrderCost(parseFloat(total_cop), distance_km);

      if (paymentMethod === 'domi') {
        const customerWallet = await domiEngine.getUserWallet(connection, customer_user_id);
        const orderTotalDomi = parseFloat((parseFloat(total_cop) / costDetails.fiat_peg_used).toFixed(8));
        const deliveryDomi = parseFloat(costDetails.driver_delivery_cost_domis || 0);
        const customerTotalDomi = parseFloat((orderTotalDomi + deliveryDomi).toFixed(8));

        const balance = parseFloat(customerWallet.balance_custody);
        if (balance < customerTotalDomi) {
          throw new BusinessError(`Saldo insuficiente en DOMIs para realizar el pedido. Disponible: ${balance} DOMI, Requerido: ${customerTotalDomi} DOMI.`);
        }

        await connection.query('UPDATE wallets SET balance_custody = balance_custody - ?, locked_balance = locked_balance + ? WHERE id = ?', [customerTotalDomi, customerTotalDomi, customerWallet.id]);
      }

      const orderId = await orderRepository.insertOrder({
        store_id, customer_user_id, total_cop,
        domi_cost: costDetails.store_cost_domis,
        driver_domi_cost: costDetails.driver_delivery_cost_domis,
        payment_method_customer: paymentMethod,
        store_cost_cop_snapshot: costDetails.store_cost_cop_snapshot,
        driver_cost_domi_snapshot: costDetails.driver_commission_domis,
        fiat_peg_snapshot: costDetails.fiat_peg_used,
        store_commission_refund_rate_snapshot: costDetails.store_commission_refund_rate_snapshot,
        driver_commission_refund_rate_snapshot: costDetails.driver_commission_refund_rate_snapshot,
        driver_commission_refund_transit_rate_snapshot: costDetails.driver_commission_refund_transit_rate_snapshot,
        driver_rescue_commission_refund_rate_snapshot: costDetails.driver_rescue_commission_refund_rate_snapshot,
        driver_rescue_timeout_minutes_snapshot: costDetails.driver_rescue_timeout_minutes_snapshot,
        driver_rescue_max_attempts_snapshot: costDetails.driver_rescue_max_attempts_snapshot,
        driver_penalty_points_rescue_original_snapshot: costDetails.driver_penalty_points_rescue_original_snapshot,
        driver_rescue_chain_penalty_points_snapshot: costDetails.driver_rescue_chain_penalty_points_snapshot,
        minimum_delivery_rate_snapshot: costDetails.minimum_delivery_rate_snapshot,
        store_solvency_delivery_multiplier_snapshot: costDetails.store_solvency_delivery_multiplier_snapshot,
        solvency_commission_guarantee_fraction_snapshot: costDetails.solvency_commission_guarantee_fraction_snapshot,
        store_cancel_client_indemnity_domi_amount_snapshot: costDetails.store_cancel_client_indemnity_domi_amount_snapshot,
        store_penalty_points_prep_snapshot: costDetails.store_penalty_points_prep_snapshot,
        store_penalty_points_dispatch_snapshot: costDetails.store_penalty_points_dispatch_snapshot,
        driver_penalty_points_prep_snapshot: costDetails.driver_penalty_points_prep_snapshot,
        driver_penalty_points_dispatch_snapshot: costDetails.driver_penalty_points_dispatch_snapshot,
        driver_penalty_points_transit_snapshot: costDetails.driver_penalty_points_transit_snapshot,
        store_cancel_driver_delivery_pct_rate_snapshot: costDetails.store_cancel_driver_delivery_pct_rate_snapshot,
        store_cancel_client_indemnity_rate_snapshot: costDetails.store_cancel_client_indemnity_rate_snapshot,
        customer_cancel_driver_delivery_pct_dispatch_rate_snapshot: costDetails.customer_cancel_driver_delivery_pct_dispatch_rate_snapshot,
        driver_commission_refund_on_store_cancel_rate_snapshot: costDetails.driver_commission_refund_on_store_cancel_rate_snapshot,
        score_penalty_cash_cancel_accepted_snapshot: costDetails.score_penalty_cash_cancel_accepted_snapshot,
        score_penalty_cash_cancel_dispatch_snapshot: costDetails.score_penalty_cash_cancel_dispatch_snapshot,
        score_penalty_cash_cancel_in_transit_snapshot: costDetails.score_penalty_cash_cancel_in_transit_snapshot,
        score_penalty_domi_cancel_accepted_snapshot: costDetails.score_penalty_domi_cancel_accepted_snapshot,
        score_penalty_domi_cancel_dispatch_snapshot: costDetails.score_penalty_domi_cancel_dispatch_snapshot,
        score_penalty_domi_cancel_in_transit_snapshot: costDetails.score_penalty_domi_cancel_in_transit_snapshot,
        platform_processing_fee_rate_snapshot: costDetails.platform_processing_fee_rate_snapshot,
        distance_km: costDetails.distance_km_used,
        delivery_address, notes
      }, connection);

      let maxPrepTime = 0;
      if (Array.isArray(items) && items.length > 0) {
        const productIds = items.map(it => it.product_id);
        const [productSnaps] = await connection.query(`SELECT p.id, p.nombre, p.image_url, p.tiempo_prep_estimado, c.nombre as categoria_nombre FROM products p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id IN (?)`, [productIds]);
        const snapMap = Object.fromEntries(productSnaps.map(p => [p.id, p]));

        for (const item of items) {
          const snap = snapMap[item.product_id] || {};
          const prepTime = snap.tiempo_prep_estimado || 0;
          if (prepTime > maxPrepTime) maxPrepTime = prepTime;

          await connection.query(`INSERT INTO order_items (order_id, product_id, quantity, price, product_name_snapshot, product_image_snapshot, prep_time_snapshot, categoria_nombre_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [orderId, item.product_id, item.quantity, item.price, snap.nombre || null, snap.image_url || null, prepTime, snap.categoria_nombre || null]);
        }
      }

      const [storeRows] = await connection.query('SELECT acceptance_mode FROM stores WHERE id = ?', [store_id]);
      const storeMode = storeRows[0]?.acceptance_mode || 'automatico';

      let initialStatus = 'pendiente';

      if (storeMode === 'automatico') {
        const storeWallet = await domiEngine.getStoreWallet(connection, store_id);
        const storeBalance = parseFloat(storeWallet.balance_custody);
        const storeCommission = costDetails.store_cost_domis;

        if (storeBalance >= storeCommission) {
          initialStatus = 'aceptado';
        } else {
          console.warn(`[ORDER_AUTO_ACCEPT_BYPASS] La sede #${store_id} no tiene saldo suficiente (${storeBalance} DOMI) para auto-aceptar el pedido. Se deja en 'pendiente'.`);
        }
      }

      if (initialStatus === 'aceptado') {
        await connection.query('UPDATE orders SET status = ?, estimated_prep_time_minutes = ?, preparation_started_at = NOW(), accepted_at = NOW(6) WHERE id = ?', [initialStatus, maxPrepTime, orderId]);
        await domiEngine.chargeForOrder(orderId, store_id, null, costDetails.store_cost_domis, 0);
      } else {
        await connection.query('UPDATE orders SET estimated_prep_time_minutes = ? WHERE id = ?', [maxPrepTime, orderId]);
      }

      await connection.commit();

      if (paymentMethod === 'domi') {
        const orderTotalDomi = parseFloat((parseFloat(total_cop) / costDetails.fiat_peg_used).toFixed(8));
        const deliveryDomi = parseFloat(costDetails.driver_delivery_cost_domis || 0);
        const customerTotalDomi = parseFloat((orderTotalDomi + deliveryDomi).toFixed(8));
        await domiRedis.decrementBalance('user', customer_user_id, customerTotalDomi);
      }

      connection.release();

      return { id: orderId, message: 'Pedido creado con éxito', status: initialStatus, costDetails };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async acceptOrder(user, orderId, req) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [userRows] = await conn.query('SELECT es_repartidor, repartidor_activo, estado FROM users WHERE id = ?', [user.id]);
      if (userRows.length === 0 || userRows[0].es_repartidor !== 1 || userRows[0].repartidor_activo !== 1 || userRows[0].estado !== 'activo') {
        throw new ForbiddenError('Acceso denegado: El usuario no se encuentra activo o habilitado como repartidor.');
      }

      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (orderRows.length === 0) {
        throw new NotFoundError(`Pedido #${orderId} no encontrado.`);
      }
      const order = orderRows[0];

      const isCompanyPaid = order.delivery_company_commission_paid === 1;
      const isValidStatus = ['aceptado', 'preparando', 'listo'].includes(order.status);

      if (!isValidStatus) {
        throw new BusinessError(`El pedido #${orderId} ya no está disponible (estado actual: ${order.status}).`, 400);
      }

      if (order.driver_user_id !== null && order.driver_user_id !== undefined) {
        throw new BusinessError(`El pedido #${orderId} ya tiene un repartidor asignado.`, 400);
      }

      if (order.current_offer_driver_id !== null && order.current_offer_driver_id !== undefined) {
        if (String(order.current_offer_driver_id) !== String(user.id)) {
          throw new BusinessError('No tienes una oferta activa para este pedido o ya fue ofrecido a otro repartidor.', 403);
        }

        const rules = await domiEngine.getProtocolRules(conn);
        const offerTimeoutSeconds = rules.driver_offer_timeout_seconds || 60;
        const offerSentAtMs = new Date(order.offer_sent_at).getTime();
        const nowMs = Date.now();
        if (nowMs - offerSentAtMs > offerTimeoutSeconds * 1000) {
          throw new BusinessError(`La oferta para este pedido ha expirado por límite de tiempo de ${offerTimeoutSeconds} segundos.`, 400);
        }
      }

      const costDetails = await domiEngine.calculateOrderCost(parseFloat(order.total_cop), order.distance_km);

      // --- GRUPO MULTI-SEDE ---
      if (order.group_order_id) {
        const [groupOrders] = await conn.query('SELECT * FROM orders WHERE group_order_id = ? FOR UPDATE', [order.group_order_id]);
        
        for (const go of groupOrders) {
          if (go.driver_user_id !== null && go.driver_user_id !== undefined) {
            throw new BusinessError(`Una o más sub-órdenes del grupo ya tienen un repartidor asignado.`, 400);
          }
        }

        const totalDriverCommission = groupOrders.reduce((sum, o) => sum + parseFloat(o.driver_cost_domi_snapshot || 0), 0);
        const driverWallet = await domiEngine.getUserWallet(conn, user.id);
        const balance = parseFloat(driverWallet.balance_custody);

        if (balance >= totalDriverCommission) {
          for (const go of groupOrders) {
            if (!isCompanyPaid) {
              await domiEngine.chargeForOrder(go.id, go.store_id, user.id, 0, go.driver_cost_domi_snapshot, conn);
            }
          }
          await conn.query(
            `UPDATE orders SET driver_user_id = ?, status = 'listo_despacho', accepted_at = COALESCE(accepted_at, NOW()), current_offer_driver_id = NULL, offer_sent_at = NULL, fiat_peg_snapshot = ? WHERE group_order_id = ?`,
            [user.id, order.fiat_peg_snapshot || costDetails.fiat_peg_used, order.group_order_id]
          );
          await conn.query('UPDATE order_groups SET driver_deposit_status = \'paid\', driver_deposit_grace_expiry = NULL WHERE id = ?', [order.group_order_id]);
        } else {
          await conn.query(
            `UPDATE orders SET driver_user_id = ?, status = 'listo_despacho', accepted_at = COALESCE(accepted_at, NOW()), current_offer_driver_id = NULL, offer_sent_at = NULL, fiat_peg_snapshot = ? WHERE group_order_id = ?`,
            [user.id, order.fiat_peg_snapshot || costDetails.fiat_peg_used, order.group_order_id]
          );
          await conn.query('UPDATE order_groups SET driver_deposit_status = \'pending\', driver_deposit_grace_expiry = DATE_ADD(NOW(6), INTERVAL 3 MINUTE) WHERE id = ?', [order.group_order_id]);
        }

      } else {
        // --- ORDEN INDEPENDIENTE STANDARD ---
        if (!isCompanyPaid) {
          await domiEngine.chargeForOrder(orderId, order.store_id, user.id, 0, costDetails.driver_cost_domis, conn);
        }

        await conn.query(
          `UPDATE orders SET driver_user_id = ?, status = 'listo_despacho', accepted_at = COALESCE(accepted_at, NOW()), current_offer_driver_id = NULL, offer_sent_at = NULL, driver_cost_domi_snapshot = ?, fiat_peg_snapshot = ? WHERE id = ?`,
          [user.id, order.driver_cost_domi_snapshot || costDetails.driver_cost_domis, order.fiat_peg_snapshot || costDetails.fiat_peg_used, orderId]
        );
      }

      await conn.commit();

      this._sendPushToCustomer(
        order.customer_user_id,
        'Actualización de tu pedido',
        'Un repartidor está en camino a recoger tu pedido',
        { orderId: String(orderId), newStatus: 'listo_despacho' }
      );

      await logSecurityEvent(user.id, 'ORDER_ACCEPTED', 'LOW', req, { orderId, driverUserId: user.id, driverCostDomi: order.driver_cost_domi_snapshot || costDetails.driver_cost_domis });

      return { success: true, message: 'Pedido aceptado y comisiones preautorizadas con éxito.', orderId, costDetails };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async updateOrderItems(user, orderId, itemsToRemove, itemsToAdd, req) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (orderRows.length === 0) {
        throw new NotFoundError('Pedido no encontrado.');
      }
      const order = orderRows[0];

      if (order.status !== 'pendiente') {
        throw new BusinessError('Solo se pueden modificar productos de pedidos en estado pendiente.', 400);
      }

      if (user.rol === 'customer' && order.customer_user_id !== user.id) {
        throw new ForbiddenError('No tienes autorización sobre este pedido.');
      }

      if (Array.isArray(itemsToRemove) && itemsToRemove.length > 0) {
        await conn.query('DELETE FROM order_items WHERE id IN (?) AND order_id = ?', [itemsToRemove, orderId]);
      }

      if (Array.isArray(itemsToAdd) && itemsToAdd.length > 0) {
        for (const item of itemsToAdd) {
          const [snapRows] = await conn.query(`SELECT p.nombre, p.image_url, p.tiempo_prep_estimado, c.nombre as cat_nombre FROM products p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?`, [item.productId]);
          const snap = snapRows[0] || {};

          await conn.query(`INSERT INTO order_items (order_id, product_id, quantity, price, product_name_snapshot, product_image_snapshot, prep_time_snapshot, categoria_nombre_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
          [orderId, item.productId, item.quantity, item.price, snap.nombre || null, snap.image_url || null, snap.tiempo_prep_estimado || 0, snap.cat_nombre || null]);
        }
      }

      const [itemRows] = await conn.query('SELECT SUM(price * quantity) as new_total FROM order_items WHERE order_id = ?', [orderId]);
      const newTotal = parseFloat(itemRows[0]?.new_total || 0);

      if (newTotal <= 0) {
        await conn.query('UPDATE orders SET status = "cancelado", total_cop = 0 WHERE id = ?', [orderId]);
      } else {
        await conn.query('UPDATE orders SET total_cop = ? WHERE id = ?', [newTotal, orderId]);
      }

      let redisUpdateAction = null;
      if (order.payment_method_customer === 'domi') {
        const oldTotalDomi = parseFloat((parseFloat(order.total_cop) / order.fiat_peg_snapshot).toFixed(8));
        const newTotalDomi = parseFloat((newTotal / order.fiat_peg_snapshot).toFixed(8));
        const deltaDomi = oldTotalDomi - newTotalDomi;

        if (deltaDomi > 0) {
          const customerWallet = await domiEngine.getUserWallet(conn, order.customer_user_id);
          await conn.query('UPDATE wallets SET balance_custody = balance_custody + ?, locked_balance = locked_balance - ? WHERE id = ?', [deltaDomi, oldTotalDomi - newTotalDomi, customerWallet.id]);
          redisUpdateAction = { type: 'increment', amount: deltaDomi };
        } else if (deltaDomi < 0) {
          const difference = Math.abs(deltaDomi);
          const customerWallet = await domiEngine.getUserWallet(conn, order.customer_user_id);
          const balance = parseFloat(customerWallet.balance_custody);
          if (balance < difference) {
            throw new BusinessError(`Saldo insuficiente en DOMIs para agregar estos productos. Disponible: ${balance} DOMI, Adicional Requerido: ${difference} DOMI.`);
          }
          await conn.query('UPDATE wallets SET balance_custody = balance_custody - ?, locked_balance = locked_balance + ? WHERE id = ?', [difference, difference, customerWallet.id]);
          redisUpdateAction = { type: 'decrement', amount: difference };
        }
      }

      await conn.commit();

      if (redisUpdateAction) {
        if (redisUpdateAction.type === 'increment') {
          await domiRedis.incrementBalance('user', order.customer_user_id, redisUpdateAction.amount);
        } else {
          await domiRedis.decrementBalance('user', order.customer_user_id, redisUpdateAction.amount);
        }
      }

      try {
        const textMessage = `Se ha modificado el detalle de los productos del pedido. Nuevo total: ${newTotal.toLocaleString()} COP.`;
        const [msgResult] = await conn.query(`INSERT INTO order_messages (order_id, sender_type, message, message_type) VALUES (?, 'system', ?, 'text')`, [orderId, textMessage]);
        await notificationService.sendOrderMessage(orderId, order.customer_user_id, {
          id: msgResult.insertId, order_id: orderId, sender_type: 'system', message: textMessage, message_type: 'text', extra_data: null, created_at: new Date()
        });
      } catch (msgErr) {
        console.error('Failed to log system modification message:', msgErr.message);
      }

      await logSecurityEvent(user.id, 'ORDER_ITEMS_MODIFIED', 'INFO', req, { orderId, itemsToRemove, itemsToAdd, newTotal });

      return { success: true, newTotal };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async _sendPushToCustomer(customerUserId, title, body, data) {
    try {
      const [tokenRows] = await db.query(
        'SELECT fcm_token AS token FROM user_push_tokens WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [customerUserId]
      );
      if (tokenRows.length > 0) {
        const token = tokenRows[0].token;
        await fcmService.sendPush(token, { title, body, data });
      }
    } catch (error) {
      console.error('[FCM ERROR] Failed to send push to customer:', error);
    }
  }
}

module.exports = OrderLifecycleService;
