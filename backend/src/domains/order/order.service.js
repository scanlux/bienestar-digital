const orderRepository = require('./order.repository');
const { ForbiddenError, NotFoundError, ValidationError, BusinessError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const domiEngine = require('../../services/domiEngine');
const db = require('../../config/db');

class OrderService {
  async getOrders(user) {
    const isSystem = user.actorType === 'system_user';
    const stores = await orderRepository.findStoresByCommerce(user.commerceId, isSystem);
    if (stores.length === 0) {
      return [];
    }
    const storeIds = stores.map(s => s.id);
    return await orderRepository.findOrdersByStoreIds(storeIds);
  }

  async updateOrderStatus(user, orderId, status, req) {
    const isSystem = user.actorType === 'system_user';
    const commerceId = user.commerceId;

    // El estado 'listo_despacho' es asignado exclusivamente por el sistema cuando un repartidor acepta la orden.
    // Ningun admin/operador/tienda puede forzarlo manualmente via este endpoint.
    if (!status || !['pendiente', 'aceptado', 'preparando', 'listo', 'en_camino', 'entregado', 'cancelado'].includes(status)) {
      throw new ValidationError('Estado invalido o no provisto.');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Obtener el pedido completo
      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (orderRows.length === 0) {
        throw new NotFoundError('Pedido no encontrado.');
      }
      const order = orderRows[0];
      const storeId = order.store_id;

      // Validar BOLA (Broken Object Level Authorization)
      if (!isSystem) {
        const isUserDriver = user.roles && user.roles.includes('driver');
        if (isUserDriver) {
          if (order.driver_user_id !== user.id) {
            throw new ForbiddenError('No tienes autorizacion sobre este pedido ya que no eres el repartidor asignado.');
          }
          if (!['en_camino', 'entregado', 'cancelado'].includes(status)) {
            throw new ForbiddenError('Los repartidores solo pueden marcar como en camino, entregado o cancelado.');
          }
        } else if (user.rol === 'customer') {
          if (order.customer_user_id !== user.id) {
            throw new ForbiddenError('No tienes autorizacion sobre este pedido.');
          }
          if (status !== 'cancelado') {
            throw new ForbiddenError('Los clientes solo pueden cancelar pedidos.');
          }
        } else {
          const belongs = await orderRepository.checkStoreBelongsToCommerce(storeId, commerceId);
          if (!belongs) {
            await logSecurityEvent(
              user.id,
              'BOLA_ATTEMPT',
              'HIGH',
              req,
              { orderId: parseInt(orderId), action: 'change_order_status', targetStoreId: storeId },
              'store',
              storeId
            );
            throw new ForbiddenError('No tienes autorizacion sobre la sede de este pedido.');
          }
        }
      }

      const oldStatus = order.status;

      // 1. Si el pedido pasa a 'aceptado' (o de 'pendiente' a 'preparando' como fallback), cobrar la comisión de la tienda y calcular tiempos
      if ((status === 'aceptado' || (status === 'preparando' && oldStatus === 'pendiente')) && oldStatus === 'pendiente') {
        const costDetails = await domiEngine.calculateOrderCost(parseFloat(order.total_cop), order.distance_km);
        
        // Validar saldo de la sede antes de cobrar
        const storeWallet = await domiEngine.getStoreWallet(conn, order.store_id);
        const storeBalance = parseFloat(storeWallet.balance_custody);
        const storeCommission = costDetails.store_cost_domis;

        if (storeBalance < storeCommission) {
          throw new BusinessError(`Saldo insuficiente en DOMIs para aceptar el pedido. Se requiere 1.0 DOMI (400 COP), saldo disponible: ${storeBalance} DOMI. Por favor compra tokens DOMI.`);
        }

        // Cobrar la comisión de la tienda (400 COP convertidos a DOMI) al aceptar
        await domiEngine.chargeForOrder(
          orderId,
          order.store_id,
          null, // No driver assigned yet
          storeCommission, // storeCost
          0 // driverCost = 0
        );

        // Calcular el tiempo de preparacion maximo del pedido usando el snapshot guardado en order_items
        const [prepRows] = await conn.query(
          'SELECT MAX(COALESCE(prep_time_snapshot, 0)) as max_prep FROM order_items WHERE order_id = ?',
          [orderId]
        );
        const maxPrepTime = prepRows[0]?.max_prep || 0;

        await conn.query(
          'UPDATE orders SET estimated_prep_time_minutes = ?, preparation_started_at = NOW(), accepted_at = NOW(6) WHERE id = ?',
          [maxPrepTime, orderId]
        );
      }

      // 2. Si el pedido se entrega, procesar la transferencia digital o el incremento de score
      if (status === 'entregado' && oldStatus !== 'entregado') {
        const costDetails = await domiEngine.calculateOrderCost(parseFloat(order.total_cop), order.distance_km);

        // Decrementar penalización COD si aplica
        const [userRows] = await conn.query('SELECT cod_penalty_remaining_orders FROM users WHERE id = ?', [order.customer_user_id]);
        const codPenalty = userRows.length > 0 ? userRows[0].cod_penalty_remaining_orders : 0;
        if (codPenalty > 0) {
          await conn.query('UPDATE users SET cod_penalty_remaining_orders = GREATEST(0, cod_penalty_remaining_orders - 1) WHERE id = ?', [order.customer_user_id]);
        }

        // Si es pago en DOMI, transferir el total del pedido del cliente a la tienda
        if (order.payment_method_customer === 'domi') {
          await domiEngine.settleOrderPayment(conn, order, costDetails);
        } else {
          // Si es pago en efectivo (COD), el cliente gana el score_earned_on_purchase
          const rules = await domiEngine.getProtocolRules(conn);
          const scoreDelta = parseInt(rules.score_earned_on_purchase) || 5;
          const domiCashbackEngine = require('../../services/domiCashbackEngine');
          await domiCashbackEngine.incrementScore(order.customer_user_id, scoreDelta, conn);
        }
      }

      // 3. Si el pedido se cancela, procesar la cancelación según la matriz y el actor
      if (status === 'cancelado' && oldStatus !== 'cancelado') {
        const cancelResult = await domiEngine.routeCancellation(conn, order, oldStatus, user);
        if (cancelResult && cancelResult.nextStatus) {
          status = cancelResult.nextStatus;
        }
      }


      // Al transicionar a 'cancelado' (Rechazo de Sede)
      if (status === 'cancelado' && oldStatus !== 'cancelado') {
        if (user.rol === 'admin' || user.actorType === 'operator' || user.commerceId) {
          const observation = req.body.observation || req.body.observacion;
          if (!observation || typeof observation !== 'string' || observation.trim().length < 5) {
            throw new ValidationError('El motivo de rechazo es obligatorio y debe tener al menos 5 caracteres.');
          }
          await conn.query('UPDATE orders SET store_rejection_notes = ? WHERE id = ?', [observation.trim(), orderId]);
        }
      }

      // Actualizar el estado del pedido
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

      await conn.commit();

      // Logger
      await logSecurityEvent(
        user.id,
        'CHANGE_ORDER_STATUS',
        'LOW',
        req,
        { orderId: parseInt(orderId), status },
        'store',
        storeId
      );

      return { success: true, message: `Estado del pedido actualizado a: ${status}` };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async createOrder(user, data, req) {
    const { 
      store_id, 
      customer_user_id, 
      total_cop, 
      payment_method_customer, // 'domi' o 'cash_cod'
      delivery_address, 
      notes,
      items, // Opcional: Array de { product_id, quantity, price }
      distance_km
    } = data;

    const paymentMethod = payment_method_customer || 'domi';

    if (!store_id || !customer_user_id || !total_cop) {
      throw new ValidationError('Faltan campos obligatorios (store_id, customer_user_id, total_cop)');
    }

    if (user.rol !== 'admin' && String(user.id) !== String(customer_user_id)) {
      await logSecurityEvent(user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
        reason: 'Intento de crear pedido para otro usuario',
        targetCustomerUserId: customer_user_id
      });
      throw new ForbiddenError('Acceso no autorizado. No puedes crear pedidos para otros usuarios.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Validar si el cliente tiene deudas pendientes (Compensación Automática)
      const [debtRows] = await connection.query(
        "SELECT SUM(amount_domis) as total_debt FROM domi_order_debts WHERE customer_user_id = ? AND status = 'pending'",
        [customer_user_id]
      );
      const totalDebt = parseFloat(debtRows[0]?.total_debt || 0);
      if (totalDebt > 0) {
        throw new BusinessError(`No puedes realizar nuevos pedidos debido a que tienes una Compensación Automática de ${totalDebt} DOMIs pendiente de pago. Por favor liquida tu deuda primero en tu monedero.`, 400);
      }

      // Validar que el usuario destinatario del pedido tenga el rol de 'customer'
      const [userRows] = await connection.query('SELECT cod_penalty_remaining_orders, domi_score, rol FROM users WHERE id = ?', [customer_user_id]);
      if (userRows.length === 0) {
        throw new NotFoundError('Usuario destinatario del pedido no encontrado.');
      }
      
      const targetUserRol = userRows[0].rol;
      if (targetUserRol !== 'customer') {
        await logSecurityEvent(user.id, 'UNAUTHORIZED_ORDER_CREATION_ROLE', 'HIGH', req, {
          reason: 'Intento de crear pedido para un usuario que no tiene rol customer',
          targetCustomerUserId: customer_user_id,
          targetUserRol
        });
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

      // 1. Calcular los costos fijos/comisiones del pedido
      const costDetails = await domiEngine.calculateOrderCost(parseFloat(total_cop), distance_km);

      // 2. Si el pago es con DOMIs, verificar y bloquear saldo del cliente
      if (paymentMethod === 'domi') {
        const customerWallet = await domiEngine.getUserWallet(connection, customer_user_id);
        const orderTotalDomi = parseFloat((parseFloat(total_cop) / costDetails.fiat_peg_used).toFixed(8));
        const deliveryDomi = parseFloat(costDetails.driver_delivery_cost_domis || 0);
        const customerTotalDomi = parseFloat((orderTotalDomi + deliveryDomi).toFixed(8));

        const balance = parseFloat(customerWallet.balance_custody);
        if (balance < customerTotalDomi) {
          throw new BusinessError(`Saldo insuficiente en DOMIs para realizar el pedido. Disponible: ${balance} DOMI, Requerido: ${customerTotalDomi} DOMI.`);
        }

        // Bloquear el saldo del cliente (mover de disponible a bloqueado)
        await connection.query(
          'UPDATE wallets SET balance_custody = balance_custody - ?, locked_balance = locked_balance + ? WHERE id = ?',
          [customerTotalDomi, customerTotalDomi, customerWallet.id]
        );

        // Sincronizar cache de Redis del cliente decrementando el balance disponible
        const domiRedis = require('../../services/domiRedis');
        await domiRedis.decrementBalance('user', customer_user_id, customerTotalDomi);
      }

      // 3. Insertar pedido con todos los snapshots y tipo de pago
      const orderId = await orderRepository.insertOrder({
        store_id,
        customer_user_id,
        total_cop,
        domi_cost: costDetails.store_cost_domis,
        driver_domi_cost: costDetails.driver_delivery_cost_domis, // Tarifa de domicilio real por distancia
        payment_method_customer: paymentMethod,
        store_cost_cop_snapshot: costDetails.store_cost_cop_snapshot,
        driver_cost_domi_snapshot: costDetails.driver_commission_domis, // Comisión de plataforma
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
        delivery_address,
        notes
      }, connection);

      // Guardar productos en order_items con snapshot completo del catalogo
      let maxPrepTime = 0;
      if (Array.isArray(items) && items.length > 0) {
        // Obtener snapshots de todos los productos en una sola query
        const productIds = items.map(it => it.product_id);
        const [productSnaps] = await connection.query(`
          SELECT p.id, p.nombre, p.image_url, p.tiempo_prep_estimado, c.nombre as categoria_nombre
          FROM products p
          LEFT JOIN categorias c ON p.categoria_id = c.id
          WHERE p.id IN (?)
        `, [productIds]);
        const snapMap = Object.fromEntries(productSnaps.map(p => [p.id, p]));

        for (const item of items) {
          const snap = snapMap[item.product_id] || {};
          const prepTime = snap.tiempo_prep_estimado || 0;
          if (prepTime > maxPrepTime) maxPrepTime = prepTime;

          await connection.query(`
            INSERT INTO order_items 
              (order_id, product_id, quantity, price,
               product_name_snapshot, product_image_snapshot,
               prep_time_snapshot, categoria_nombre_snapshot)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            orderId, item.product_id, item.quantity, item.price,
            snap.nombre || null,
            snap.image_url || null,
            prepTime,
            snap.categoria_nombre || null
          ]);
        }
        // maxPrepTime ya calculado en el loop, no se necesita query adicional
      }

      // Consultar el acceptance_mode de la tienda
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
        // Actualizar estado del pedido e iniciar preparación (se calcula aceptado_at)
        await connection.query(
          'UPDATE orders SET status = ?, estimated_prep_time_minutes = ?, preparation_started_at = NOW(), accepted_at = NOW(6) WHERE id = ?',
          [initialStatus, maxPrepTime, orderId]
        );

        // Cobrar la comisión de la tienda inmediatamente en modo automático (1 DOMI / 400 COP)
        await domiEngine.chargeForOrder(
          orderId,
          store_id,
          null,
          costDetails.store_cost_domis,
          0
        );
      } else {
        // Solo actualizar el tiempo de preparación estimado si queda en 'pendiente'
        await connection.query(
          'UPDATE orders SET estimated_prep_time_minutes = ? WHERE id = ?',
          [maxPrepTime, orderId]
        );
      }

      await connection.commit();
      connection.release();

      return { 
        id: orderId, 
        message: 'Pedido creado con éxito',
        status: initialStatus,
        costDetails
      };
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

      // 1. Validar que el usuario es repartidor activo
      const [userRows] = await conn.query('SELECT es_repartidor, repartidor_activo, estado FROM users WHERE id = ?', [user.id]);
      if (userRows.length === 0 || userRows[0].es_repartidor !== 1 || userRows[0].repartidor_activo !== 1 || userRows[0].estado !== 'activo') {
        throw new ForbiddenError('Acceso denegado: El usuario no se encuentra activo o habilitado como repartidor.');
      }

      // 2. Obtener el pedido y bloquear
      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (orderRows.length === 0) {
        throw new NotFoundError(`Pedido #${orderId} no encontrado.`);
      }
      const order = orderRows[0];

      const isCompanyPaid = order.delivery_company_commission_paid === 1;

      // Solo se puede aceptar si el pedido aun no tiene repartidor asignado.
      // 'listo_despacho' indica que ya hay repartidor: ese estado lo pone el sistema aqui mismo al aceptar.
      const isValidStatus = ['aceptado', 'preparando', 'listo'].includes(order.status);

      if (!isValidStatus) {
        throw new BusinessError(`El pedido #${orderId} ya no está disponible (estado actual: ${order.status}).`, 400);
      }

      // Doble guarda: si ya tiene repartidor asignado (no deberia pasar con el estado correcto), rechazar.
      if (order.driver_user_id !== null && order.driver_user_id !== undefined) {
        throw new BusinessError(`El pedido #${orderId} ya tiene un repartidor asignado.`, 400);
      }

      // Validar si el pedido tiene una oferta activa y si el repartidor es el ofertado
      if (order.current_offer_driver_id !== null && order.current_offer_driver_id !== undefined) {
        if (String(order.current_offer_driver_id) !== String(user.id)) {
          throw new BusinessError('No tienes una oferta activa para este pedido o ya fue ofrecido a otro repartidor.', 403);
        }
        
        // Validar ventana de 60 segundos
        const offerSentAtMs = new Date(order.offer_sent_at).getTime();
        const nowMs = Date.now();
        if (nowMs - offerSentAtMs > 60 * 1000) {
          throw new BusinessError('La oferta para este pedido ha expirado por límite de tiempo de 60 segundos.', 400);
        }
      }

      // 3. Calcular costos y comisiones fijas del pedido
      const costDetails = await domiEngine.calculateOrderCost(parseFloat(order.total_cop), order.distance_km);

      // 4. Cobrar la comisión del repartidor al aceptar (300 COP convertidos a DOMI) si no fue pagado por empresa
      if (!isCompanyPaid) {
        await domiEngine.chargeForOrder(
          orderId, 
          order.store_id, 
          user.id, 
          0, // storeCost = 0 al aceptar
          costDetails.driver_cost_domis // driverCost = 300 COP en DOMIs
        );
      }

      // 5. Actualizar el pedido en la base de datos con snapshots y limpiar la oferta
      await conn.query(
        `UPDATE orders SET 
          driver_user_id = ?, 
          status = 'listo_despacho', 
          accepted_at = COALESCE(accepted_at, NOW()),
          current_offer_driver_id = NULL,
          offer_sent_at = NULL,
          driver_cost_domi_snapshot = ?,
          fiat_peg_snapshot = ?
         WHERE id = ?`,
        [
          user.id,
          order.driver_cost_domi_snapshot || costDetails.driver_cost_domis,
          order.fiat_peg_snapshot || costDetails.fiat_peg_used,
          orderId
        ]
      );

      await conn.commit();

      await logSecurityEvent(user.id, 'ORDER_ACCEPTED', 'LOW', req, {
        orderId,
        driverUserId: user.id,
        driverCostDomi: order.driver_cost_domi_snapshot || costDetails.driver_cost_domis
      });

      return {
        success: true,
        message: 'Pedido aceptado y comisiones preautorizadas con éxito.',
        orderId,
        costDetails
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getUserOrders(user, userId, req) {
    if (user.rol !== 'admin' && String(user.id) !== String(userId)) {
      await logSecurityEvent(user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
        reason: 'Intento de ver historial de pedidos de otro usuario',
        targetUserId: userId
      });
      throw new ForbiddenError('Acceso no autorizado. Sólo puedes ver tu propio historial de pedidos.');
    }

    return await orderRepository.findUserOrders(userId);
  }

  async getOrderItems(user, orderId, req) {
    const isSystem = user.actorType === 'system_user';
    const commerceId = user.commerceId;

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Pedido no encontrado.');
    }

    if (!isSystem && user.rol !== 'customer') {
      const belongs = await orderRepository.checkStoreBelongsToCommerce(order.store_id, commerceId);
      if (!belongs) {
        throw new ForbiddenError('No tienes autorización sobre la sede de este pedido.');
      }
    }

    const [rows] = await db.query(`
      SELECT 
        oi.*,
        COALESCE(pr.nombre, oi.product_name_snapshot, 'Producto no disponible') as product_name,
        COALESCE(pi.url, oi.product_image_snapshot) as thumbnail
      FROM order_items oi
      LEFT JOIN products pr ON pr.id = oi.product_id
      LEFT JOIN product_images pi ON pi.product_id = pr.id AND pi.tipo = 'thumbnail'
      WHERE oi.order_id = ?
    `, [orderId]);

    return rows;
  }

  async notifyUnavailableItems(user, orderId, agotadosItemIds, req) {
    const isSystem = user.actorType === 'system_user';
    const commerceId = user.commerceId;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (orderRows.length === 0) {
        throw new NotFoundError('Pedido no encontrado.');
      }
      const order = orderRows[0];

      if (order.status !== 'pendiente') {
        throw new BusinessError('Solo se pueden notificar faltantes de pedidos en estado pendiente.', 400);
      }

      if (!isSystem) {
        const belongs = await orderRepository.checkStoreBelongsToCommerce(order.store_id, commerceId);
        if (!belongs) {
          throw new ForbiddenError('No tienes autorización sobre la sede de este pedido.');
        }
      }

      // Obtener el perfil del cliente para saludarlo
      const [profileRows] = await conn.query('SELECT nombres FROM profiles WHERE usuario_id = ?', [order.customer_user_id]);
      const customerName = profileRows[0]?.nombres || 'Cliente';

      // Consultar los items marcados como agotados
      const [items] = await conn.query(`
        SELECT oi.*, 
               COALESCE(pr.nombre, oi.product_name_snapshot, 'Producto no disponible') as product_name, 
               COALESCE(pr.categoria_id, 0) as category_id
        FROM order_items oi
        LEFT JOIN products pr ON pr.id = oi.product_id
        WHERE oi.id IN (?) AND oi.order_id = ?
      `, [agotadosItemIds, orderId]);

      const messagesToSend = [];

      for (const item of items) {
        // Mensaje del bot para el agotado
        const messageText = `Hola ${customerName}, el producto "${item.product_name}" no está disponible en este momento.`;
        const [msgResult] = await conn.query(`
          INSERT INTO order_messages (order_id, sender_type, message, message_type)
          VALUES (?, 'bot', ?, 'text')
        `, [orderId, messageText]);

        messagesToSend.push({
          id: msgResult.insertId,
          order_id: orderId,
          sender_type: 'bot',
          message: messageText,
          message_type: 'text',
          extra_data: null,
          created_at: new Date()
        });

        // Buscar alternativas
        // Misma categoria_id, misma store_id (a través de store_products), precio_base <= precio del item, y activo (disponible)
        const [alternatives] = await conn.query(`
          SELECT p.id, p.nombre, p.precio_base as precio, pi.url as thumbnail
          FROM products p
          LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.tipo = 'thumbnail'
          WHERE p.categoria_id = ? AND p.store_id = ? AND p.precio_base <= ? AND p.id != ? 
            AND p.disponible = 1 AND p.deleted_at IS NULL
          LIMIT 2
        `, [item.category_id, order.store_id, item.price, item.product_id]);

        if (alternatives.length > 0) {
          const suggestionText = `¿Te gustaría reemplazarlo por alguna de estas alternativas?`;
          const extraData = JSON.stringify({ suggestions: alternatives, original_item_id: item.id });
          const [suggestResult] = await conn.query(`
            INSERT INTO order_messages (order_id, sender_type, message, message_type, extra_data)
            VALUES (?, 'bot', ?, 'product_suggestion', ?)
          `, [orderId, suggestionText, extraData]);

          messagesToSend.push({
            id: suggestResult.insertId,
            order_id: orderId,
            sender_type: 'bot',
            message: suggestionText,
            message_type: 'product_suggestion',
            extra_data: { suggestions: alternatives, original_item_id: item.id },
            created_at: new Date()
          });
        }
      }

      // Mensaje de ver menú completo de la sede
      // Obtener el slug de la tienda
      const [storeRows] = await conn.query('SELECT slug FROM stores WHERE id = ?', [order.store_id]);
      const storeSlug = storeRows[0]?.slug || '';

      const menuText = `También puedes explorar el menú completo de la sede para elegir algo más.`;
      const menuExtraData = JSON.stringify({ store_id: order.store_id, store_slug: storeSlug });
      const [menuResult] = await conn.query(`
        INSERT INTO order_messages (order_id, sender_type, message, message_type, extra_data)
        VALUES (?, 'bot', ?, 'menu_link', ?)
      `, [orderId, menuText, menuExtraData]);

      messagesToSend.push({
        id: menuResult.insertId,
        order_id: orderId,
        sender_type: 'bot',
        message: menuText,
        message_type: 'menu_link',
        extra_data: { store_id: order.store_id, store_slug: storeSlug },
        created_at: new Date()
      });

      await conn.commit();

      // Enviar las notificaciones asíncronamente a través de Websockets/FCM (Fase 3)
      try {
        const notificationService = require('../../services/notificationService');
        for (const msg of messagesToSend) {
          await notificationService.sendOrderMessage(orderId, order.customer_user_id, msg);
        }
      } catch (err) {
        console.error('[NOTIFICATION_SERVICE_ERROR] Failed to send real-time notifications:', err.message);
      }

      await logSecurityEvent(user.id, 'ORDER_NOTIFY_UNAVAILABLE', 'INFO', req, {
        orderId,
        agotadosItemIds,
      }, 'store', order.store_id);

      return { success: true, messages: messagesToSend };
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

      // Bloquear pedido
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

      // 1. Eliminar los items marcados
      if (Array.isArray(itemsToRemove) && itemsToRemove.length > 0) {
        await conn.query('DELETE FROM order_items WHERE id IN (?) AND order_id = ?', [itemsToRemove, orderId]);
      }

      // 2. Agregar los nuevos items con snapshots completos
      if (Array.isArray(itemsToAdd) && itemsToAdd.length > 0) {
        for (const item of itemsToAdd) {
          const [snapRows] = await conn.query(`
            SELECT p.nombre, p.image_url, p.tiempo_prep_estimado, c.nombre as cat_nombre 
            FROM products p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            WHERE p.id = ?
          `, [item.productId]);
          const snap = snapRows[0] || {};

          await conn.query(`
            INSERT INTO order_items 
              (order_id, product_id, quantity, price,
               product_name_snapshot, product_image_snapshot, prep_time_snapshot, categoria_nombre_snapshot)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            orderId, item.productId, item.quantity, item.price,
            snap.nombre || null,
            snap.image_url || null,
            snap.tiempo_prep_estimado || 0,
            snap.cat_nombre || null
          ]);
        }
      }

      // 3. Recalcular total_cop
      const [itemRows] = await conn.query('SELECT SUM(price * quantity) as new_total FROM order_items WHERE order_id = ?', [orderId]);
      const newTotal = parseFloat(itemRows[0]?.new_total || 0);

      if (newTotal <= 0) {
        // Si no quedan items, el pedido debe ser cancelado
        await conn.query('UPDATE orders SET status = "cancelado", total_cop = 0 WHERE id = ?', [orderId]);
      } else {
        await conn.query('UPDATE orders SET total_cop = ? WHERE id = ?', [newTotal, orderId]);
      }

      // 4. Si el pago es con DOMIs, ajustar balance bloqueado/reembolso del cliente
      if (order.payment_method_customer === 'domi') {
        const domiEngine = require('../../services/domiEngine');
        const costDetails = await domiEngine.calculateOrderCost(newTotal, order.distance_km);

        const oldTotalDomi = parseFloat((parseFloat(order.total_cop) / order.fiat_peg_snapshot).toFixed(8));
        const newTotalDomi = parseFloat((newTotal / order.fiat_peg_snapshot).toFixed(8));
        const deltaDomi = oldTotalDomi - newTotalDomi;

        if (deltaDomi > 0) {
          // El pedido es más barato, reembolsar la diferencia al saldo disponible del cliente
          const customerWallet = await domiEngine.getUserWallet(conn, order.customer_user_id);
          await conn.query(
            'UPDATE wallets SET balance_custody = balance_custody + ?, locked_balance = locked_balance - ? WHERE id = ?',
            [deltaDomi, oldTotalDomi - newTotalDomi, customerWallet.id]
          );
          // Actualizar Redis
          const domiRedis = require('../../services/domiRedis');
          await domiRedis.incrementBalance('user', order.customer_user_id, deltaDomi);
        } else if (deltaDomi < 0) {
          // El pedido es más caro, intentar bloquear la diferencia
          const difference = Math.abs(deltaDomi);
          const customerWallet = await domiEngine.getUserWallet(conn, order.customer_user_id);
          const balance = parseFloat(customerWallet.balance_custody);
          if (balance < difference) {
            throw new BusinessError(`Saldo insuficiente en DOMIs para agregar estos productos. Disponible: ${balance} DOMI, Adicional Requerido: ${difference} DOMI.`);
          }
          await conn.query(
            'UPDATE wallets SET balance_custody = balance_custody - ?, locked_balance = locked_balance + ? WHERE id = ?',
            [difference, difference, customerWallet.id]
          );
          // Actualizar Redis
          const domiRedis = require('../../services/domiRedis');
          await domiRedis.decrementBalance('user', order.customer_user_id, difference);
        }
      }

      await conn.commit();

      // Enviar mensaje de confirmación al chat del pedido
      try {
        const textMessage = `Se ha modificado el detalle de los productos del pedido. Nuevo total: ${newTotal.toLocaleString()} COP.`;
        const [msgResult] = await conn.query(`
          INSERT INTO order_messages (order_id, sender_type, message, message_type)
          VALUES (?, 'system', ?, 'text')
        `, [orderId, textMessage]);

        const notificationService = require('../../services/notificationService');
        await notificationService.sendOrderMessage(orderId, order.customer_user_id, {
          id: msgResult.insertId,
          order_id: orderId,
          sender_type: 'system',
          message: textMessage,
          message_type: 'text',
          extra_data: null,
          created_at: new Date()
        });
      } catch (msgErr) {
        console.error('Failed to log system modification message:', msgErr.message);
      }

      await logSecurityEvent(user.id, 'ORDER_ITEMS_MODIFIED', 'INFO', req, {
        orderId,
        itemsToRemove,
        itemsToAdd,
        newTotal
      });

      return { success: true, newTotal };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getCustomerMessagesList(user, req) {
    const customerId = user.id;
    const [rows] = await db.query(`
      SELECT om.*, s.nombre_sucursal as store_name
      FROM order_messages om
      JOIN (
        SELECT order_id, MAX(id) as max_id
        FROM order_messages
        GROUP BY order_id
      ) latest ON om.id = latest.max_id
      JOIN orders o ON o.id = om.order_id
      JOIN stores s ON s.id = o.store_id
      WHERE o.customer_user_id = ?
      ORDER BY om.created_at DESC
    `, [customerId]);

    return rows.map(row => {
      if (typeof row.extra_data === 'string') {
        try {
          row.extra_data = JSON.parse(row.extra_data);
        } catch (e) {
          row.extra_data = null;
        }
      }
      return row;
    });
  }

  async getCustomerUnreadCount(user, req) {
    const customerId = user.id;
    const [rows] = await db.query(`
      SELECT COUNT(*) as unread_count
      FROM order_messages om
      JOIN orders o ON o.id = om.order_id
      WHERE o.customer_user_id = ? AND om.is_read = 0 AND om.sender_type = 'bot'
    `, [customerId]);

    return { unreadCount: rows[0]?.unread_count || 0 };
  }

  async markCustomerMessagesRead(user, orderId, req) {
    const customerId = user.id;
    await db.query(`
      UPDATE order_messages om
      JOIN orders o ON o.id = om.order_id
      SET om.is_read = 1
      WHERE om.order_id = ? AND o.customer_user_id = ? AND om.sender_type = 'bot'
    `, [orderId, customerId]);

    return { success: true };
  }

  async getOrderMessages(user, orderId, req) {
    const isSystem = user.actorType === 'system_user';
    
    // Validar acceso
    const [orderRows] = await db.query('SELECT store_id, customer_user_id, driver_user_id FROM orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) {
      throw new NotFoundError('Pedido no encontrado.');
    }
    const order = orderRows[0];

    if (!isSystem && user.rol === 'customer' && order.customer_user_id !== user.id) {
      throw new ForbiddenError('No tienes autorización sobre este pedido.');
    }

    if (!isSystem && user.rol !== 'customer') {
      const belongs = await orderRepository.checkStoreBelongsToCommerce(order.store_id, user.commerceId);
      if (!belongs) {
        throw new ForbiddenError('No tienes autorización sobre este pedido.');
      }
    }

    const [rows] = await db.query(`
      SELECT * FROM order_messages
      WHERE order_id = ?
      ORDER BY created_at ASC
    `, [orderId]);

    return rows.map(row => {
      if (typeof row.extra_data === 'string') {
        try {
          row.extra_data = JSON.parse(row.extra_data);
        } catch (e) {
          row.extra_data = null;
        }
      }
      return row;
    });
  }

  async getOrderDetail(user, orderId, req) {
    const isSystem = user.actorType === 'system_user';
    
    // Obtener la orden
    const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) {
      throw new NotFoundError('Pedido no encontrado.');
    }
    const order = orderRows[0];

    // Validar BOLA (Broken Object Level Authorization)
    if (!isSystem) {
      if (user.rol === 'customer') {
        if (order.customer_user_id !== user.id) {
          throw new ForbiddenError('No tienes autorización sobre este pedido.');
        }
      } else if (user.rol === 'driver') {
        if (order.driver_user_id !== user.id) {
          throw new ForbiddenError('No tienes autorización sobre este pedido.');
        }
      } else {
        const belongs = await orderRepository.checkStoreBelongsToCommerce(order.store_id, user.commerceId);
        if (!belongs) {
          await logSecurityEvent(
            user.id,
            'BOLA_ATTEMPT',
            'HIGH',
            req,
            { orderId: parseInt(orderId), action: 'view_order_details', targetStoreId: order.store_id },
            'store',
            order.store_id
          );
          throw new ForbiddenError('No tienes autorización sobre este pedido.');
        }
      }
    }

    // Obtener los productos del pedido
    const [items] = await db.query(`
      SELECT oi.*, p.nombre, p.image_url 
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    order.items = items;
    return order;
  }
}

module.exports = new OrderService();
