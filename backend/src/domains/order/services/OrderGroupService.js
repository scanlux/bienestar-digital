const db = require('../../../config/db');
const domiEngine = require('../../../services/domiEngine');
const orderRepository = require('../order.repository');
const { ValidationError, BusinessError, NotFoundError, ForbiddenError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const { executeTransition } = require('../../../services/domi-kernel/fsm/engine');

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

class OrderGroupService {
  async createGroup(user, data, req) {
    const { customer_user_id, payment_method_customer, delivery_address, suborders, notes } = data;
    const paymentMethod = payment_method_customer || 'domi';

    if (!customer_user_id || !suborders || !Array.isArray(suborders) || suborders.length === 0) {
      throw new ValidationError('Faltan campos obligatorios para crear el grupo de pedidos.');
    }

    if (suborders.length > 1 && paymentMethod === 'cash_cod') {
      throw new BusinessError('El pago en efectivo (COD) no está permitido en pedidos multi-sede. Por favor utiliza pago digital con DOMI.');
    }

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      // 1. Validaciones del cliente (Deudas y Score)
      const [debtRows] = await conn.query("SELECT SUM(amount_domis) as total_debt FROM domi_order_debts WHERE customer_user_id = ? AND status = 'pending'", [customer_user_id]);
      const totalDebt = parseFloat(debtRows[0]?.total_debt || 0);
      if (totalDebt > 0) {
        throw new BusinessError(`No puedes realizar nuevos pedidos debido a una Compensación Automática pendiente de pago de ${totalDebt} DOMIs.`);
      }

      const [userRows] = await conn.query('SELECT cod_penalty_remaining_orders, domi_score, rol FROM users WHERE id = ?', [customer_user_id]);
      if (userRows.length === 0) {
        throw new NotFoundError('Usuario cliente no encontrado.');
      }
      const userProfile = userRows[0];
      if (userProfile.rol !== 'customer') {
        throw new BusinessError('Acceso denegado. Solo clientes pueden realizar pedidos.');
      }

      if (paymentMethod === 'cash_cod') {
        if (userProfile.cod_penalty_remaining_orders > 0) {
          throw new BusinessError('No puedes realizar pedidos en efectivo debido a una penalización activa.');
        }
        if (userProfile.domi_score <= 0) {
          throw new BusinessError('No puedes realizar pedidos en efectivo debido a Score negativo.');
        }
      }

      // 2. Obtener coordenadas del cliente
      let customerLat = 5.33775;
      let customerLng = -72.39586; // Centro Yopal fallback
      const [addrRows] = await conn.query('SELECT latitud, longitud FROM user_addresses WHERE user_id = ? AND is_default = 1', [customer_user_id]);
      if (addrRows.length > 0) {
        customerLat = parseFloat(addrRows[0].latitud);
        customerLng = parseFloat(addrRows[0].longitud);
      } else {
        const [anyAddrRows] = await conn.query('SELECT latitud, longitud FROM user_addresses WHERE user_id = ? LIMIT 1', [customer_user_id]);
        if (anyAddrRows.length > 0) {
          customerLat = parseFloat(anyAddrRows[0].latitud);
          customerLng = parseFloat(anyAddrRows[0].longitud);
        }
      }

      // 3. Consultar coordenadas e info de cada sede
      const storeIds = suborders.map(so => so.store_id);
      const [storeRows] = await conn.query('SELECT id, latitud, longitud, nombre_sucursal, acceptance_mode FROM stores WHERE id IN (?)', [storeIds]);
      const storeMap = Object.fromEntries(storeRows.map(s => [s.id, s]));

      for (const so of suborders) {
        if (!storeMap[so.store_id]) {
          throw new NotFoundError(`Sede con ID ${so.store_id} no encontrada.`);
        }
      }

      // 4. Algoritmo Greedy Nearest Neighbor
      let route = [];
      let currentNode = { lat: customerLat, lng: customerLng };
      let unvisited = storeRows.map(s => ({
        id: s.id,
        latitud: parseFloat(s.latitud || 5.33775),
        longitud: parseFloat(s.longitud || -72.39586),
        nombre_sucursal: s.nombre_sucursal
      }));

      let pathSegments = [];
      while (unvisited.length > 0) {
        let nearestStore = null;
        let minDistance = Infinity;
        let nearestIndex = -1;

        for (let i = 0; i < unvisited.length; i++) {
          const dist = getHaversineDistance(currentNode.lat, currentNode.lng, unvisited[i].latitud, unvisited[i].longitud);
          if (dist < minDistance) {
            minDistance = dist;
            nearestStore = unvisited[i];
            nearestIndex = i;
          }
        }

        pathSegments.push({ store_id: nearestStore.id, distance: minDistance });
        currentNode = { lat: nearestStore.latitud, lng: nearestStore.longitud };
        unvisited.splice(nearestIndex, 1);
        route.push(nearestStore);
      }

      // Tramo de regreso a la casa del cliente
      const returnDistance = getHaversineDistance(currentNode.lat, currentNode.lng, customerLat, customerLng);
      const totalDistance = pathSegments.reduce((sum, s) => sum + s.distance, 0) + returnDistance;

      // Distribuir la distancia de regreso equitativamente entre las sub-órdenes
      const returnShare = returnDistance / suborders.length;
      const suborderDistances = {};
      pathSegments.forEach(s => {
        suborderDistances[s.store_id] = s.distance + returnShare;
      });

      // 5. Calcular costos y snapshots consolidados
      const totalCopAllOrders = suborders.reduce((sum, so) => sum + parseFloat(so.total_cop || 0), 0);
      const costDetails = await domiEngine.calculateOrderCost(totalCopAllOrders, totalDistance);
      const fiatPeg = costDetails.fiat_peg_used;

      const totalDomiCostDelivery = costDetails.driver_delivery_cost_domis;
      const totalFoodDomi = parseFloat((totalCopAllOrders / fiatPeg).toFixed(8));
      const clientTotalDomi = parseFloat((totalFoodDomi + totalDomiCostDelivery).toFixed(8));

      // Verificar saldo del cliente (si es pago DOMI)
      if (paymentMethod === 'domi') {
        const customerWallet = await domiEngine.getUserWallet(conn, customer_user_id);
        const balance = parseFloat(customerWallet.balance_custody);
        if (balance < clientTotalDomi) {
          throw new BusinessError(`Saldo insuficiente en DOMIs para realizar el pedido. Disponible: ${balance} DOMI, Requerido: ${clientTotalDomi} DOMI.`);
        }
        // Descontar del balance disponible y congelar
        await conn.query('UPDATE wallets SET balance_custody = balance_custody - ?, locked_balance = locked_balance + ? WHERE id = ?', [clientTotalDomi, clientTotalDomi, customerWallet.id]);
      }

      // 6. Crear la cabecera del grupo
      const [groupResult] = await conn.query(
        'INSERT INTO order_groups (customer_user_id, total_amount_cop, total_domi_cost) VALUES (?, ?, ?)',
        [customer_user_id, totalCopAllOrders, totalDomiCostDelivery]
      );
      const groupOrderId = groupResult.insertId;

      const createdOrders = [];

      // 7. Insertar sub-órdenes
      for (const so of suborders) {
        const storeInfo = storeMap[so.store_id];
        const propDistance = suborderDistances[so.store_id];
        const propDeliveryCostDomi = parseFloat((totalDomiCostDelivery * (propDistance / totalDistance)).toFixed(8));

        // Insertar registro de la orden
        const orderId = await orderRepository.insertOrder({
          store_id: so.store_id,
          customer_user_id,
          total_cop: so.total_cop,
          domi_cost: costDetails.store_cost_domis, // Comisión de sede estándar (1.0 DOMI)
          driver_domi_cost: propDeliveryCostDomi, // Tarifa de envío proporcional
          payment_method_customer: paymentMethod,
          group_order_id: groupOrderId,
          driver_cost_domi_snapshot: 0.45000000, // Comisión del repartidor con 40% de descuento fijo (uniforme)
          store_cost_cop_snapshot: costDetails.store_cost_cop_snapshot,
          fiat_peg_snapshot: fiatPeg,
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
          distance_km: propDistance,
          delivery_address,
          notes
        }, conn);

        // Insertar items de esta sub-orden
        let maxPrepTime = 0;
        if (so.items && so.items.length > 0) {
          const productIds = so.items.map(it => it.product_id);
          const [productSnaps] = await conn.query('SELECT p.id, p.nombre, p.image_url, p.tiempo_prep_estimado, c.nombre as categoria_nombre FROM products p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id IN (?)', [productIds]);
          const snapMap = Object.fromEntries(productSnaps.map(p => [p.id, p]));

          for (const item of so.items) {
            const snap = snapMap[item.product_id] || {};
            const prepTime = snap.tiempo_prep_estimado || 0;
            if (prepTime > maxPrepTime) maxPrepTime = prepTime;

            await conn.query(
              'INSERT INTO order_items (order_id, product_id, quantity, price, product_name_snapshot, product_image_snapshot, prep_time_snapshot, categoria_nombre_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [orderId, item.product_id, item.quantity, item.price, snap.nombre || null, snap.image_url || null, prepTime, snap.categoria_nombre || null]
            );
          }
        }

        // Auto-aceptar si la sede está en modo automatico
        let suborderStatus = 'pendiente';
        if (storeInfo.acceptance_mode === 'automatico') {
          const storeWallet = await domiEngine.getStoreWallet(conn, so.store_id);
          const storeBalance = parseFloat(storeWallet.balance_custody);
          const storeCommission = costDetails.store_cost_domis;

          if (storeBalance >= storeCommission) {
            suborderStatus = 'aceptado';
            // Cobrar comisión de la sede
            await domiEngine.chargeForOrder(orderId, so.store_id, null, storeCommission, 0, conn);
            await conn.query('UPDATE orders SET estimated_prep_time_minutes = ?, preparation_started_at = NOW(), accepted_at = NOW(6), status = ? WHERE id = ?', [maxPrepTime, suborderStatus, orderId]);
          }
        }

        createdOrders.push({
          order_id: orderId,
          store_id: so.store_id,
          store_name: storeInfo.nombre_sucursal,
          status: suborderStatus,
          total_cop: so.total_cop,
          driver_domi_cost: propDeliveryCostDomi
        });
      }

      await conn.commit();
      await logSecurityEvent(user.id, 'GROUP_ORDER_CREATED', 'LOW', req, { groupOrderId, subordersCount: createdOrders.length }, 'user', customer_user_id);

      return {
        success: true,
        groupOrderId,
        total_amount_cop: totalCopAllOrders,
        total_domi_cost: totalDomiCostDelivery,
        orders: createdOrders
      };

    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async cancelGroup(user, groupOrderId, req) {
    const conn = await db.getConnection();
    try {
      // 1. Obtener todas las sub-órdenes activas del grupo
      const [orders] = await conn.query("SELECT id, status, customer_user_id FROM orders WHERE group_order_id = ? AND status NOT IN ('cancelado', 'entregado')", [groupOrderId]);
      
      if (orders.length === 0) {
        throw new BusinessError('No hay pedidos activos en este grupo para cancelar.');
      }

      // Validar pertenencia del cliente
      if (user.rol !== 'admin' && String(orders[0].customer_user_id) !== String(user.id)) {
        const { ForbiddenError } = require('../../../utils/errors');
        throw new ForbiddenError('No estás autorizado para cancelar este grupo de pedidos.');
      }

      const results = [];
      // 2. Iterar y cancelar en cascada aplicando transiciones FSM
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        // Pasar skipScorePenalty: true en meta para todas las órdenes excepto la primera
        const skipScorePenalty = i > 0;
        
        const transitionResult = await executeTransition({
          action: 'CUSTOMER_CANCEL',
          orderId: order.id,
          actorId: user.id,
          actorRole: user.rol,
          meta: { skipScorePenalty },
          db: conn
        });

        results.push({
          orderId: order.id,
          status: transitionResult.newStatus,
          skipScorePenalty
        });
      }

      await logSecurityEvent(user.id, 'GROUP_ORDER_CANCELLED', 'MEDIUM', req, { groupOrderId, ordersCount: orders.length }, 'user', user.id);

      return {
        success: true,
        message: 'Grupo de pedidos cancelado en cascada correctamente.',
        results
      };

    } finally {
      conn.release();
    }
  }
}

module.exports = new OrderGroupService();
