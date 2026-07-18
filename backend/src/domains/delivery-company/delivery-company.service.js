const deliveryCompanyRepository = require('./delivery-company.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const domiEngine = require('../../services/domiEngine');
const db = require('../../config/db');
const { logSecurityEvent } = require('../../utils/securityLogger');

class DeliveryCompanyService {
  async getDrivers(userContext, queryData) {
    const isSystem = userContext.actorType === 'system_user';
    const deliveryCompanyId = isSystem ? queryData.deliveryCompanyId : userContext.deliveryCompanyId;

    if (!deliveryCompanyId) {
      throw new BusinessError('deliveryCompanyId es requerido.');
    }

    return await deliveryCompanyRepository.findDriversByCompanyId(deliveryCompanyId);
  }

  async affiliateDriver(userContext, bodyData) {
    const { cedula } = bodyData;
    const isSystem = userContext.actorType === 'system_user';
    const deliveryCompanyId = isSystem ? bodyData.deliveryCompanyId : userContext.deliveryCompanyId;

    if (!cedula) {
      throw new BusinessError('Cédula es requerida.');
    }

    if (!deliveryCompanyId) {
      throw new BusinessError('deliveryCompanyId es requerido.');
    }

    const driver = await deliveryCompanyRepository.findDriverByCedula(cedula);
    if (!driver) {
      throw new NotFoundError('No se encontró ningún repartidor con la cédula provista.');
    }

    if (driver.es_repartidor !== 1) {
      throw new BusinessError('El usuario asociado a esta cédula no tiene habilitado el modo de repartidor.');
    }

    if (driver.delivery_company_id !== null) {
      if (driver.delivery_company_id === parseInt(deliveryCompanyId, 10)) {
        throw new BusinessError('El repartidor ya se encuentra afiliado a tu empresa.');
      }
      throw new BusinessError('El repartidor ya está afiliado a otra empresa de delivery.');
    }

    await deliveryCompanyRepository.updateDriverCompany(driver.id, deliveryCompanyId);

    return `Repartidor ${driver.nombres} ${driver.apellidos} afiliado exitosamente.`;
  }

  async deaffiliateDriver(userContext, userId, queryData) {
    const isSystem = userContext.actorType === 'system_user';
    const deliveryCompanyId = isSystem ? queryData.deliveryCompanyId : userContext.deliveryCompanyId;

    if (!deliveryCompanyId) {
      throw new BusinessError('deliveryCompanyId es requerido.');
    }

    const profile = await deliveryCompanyRepository.findDriverProfile(userId);
    if (!profile) {
      throw new NotFoundError('Perfil de repartidor no encontrado.');
    }

    if (profile.delivery_company_id !== parseInt(deliveryCompanyId, 10) && !isSystem) {
      throw new ForbiddenError('No tienes permiso para desafiliar a este repartidor.');
    }

    await deliveryCompanyRepository.updateDriverCompany(userId, null);

    return 'Repartidor desafiliado exitosamente.';
  }

  async getDashboardStats(userContext) {
    const deliveryCompanyId = userContext.deliveryCompanyId;
    if (!deliveryCompanyId) {
      throw new BusinessError('Acceso denegado: No tienes una empresa de reparto asociada.', 403);
    }
    return await deliveryCompanyRepository.getDashboardStats(deliveryCompanyId);
  }

  async getAvailableDrivers(userContext, queryData) {
    const deliveryCompanyId = userContext.deliveryCompanyId;
    if (!deliveryCompanyId) {
      throw new BusinessError('Acceso denegado: No tienes una empresa de reparto asociada.', 403);
    }
    const period = queryData.period || 'day';
    if (period !== 'day' && period !== 'week') {
      throw new BusinessError('Período inválido. Debe ser day o week.', 400);
    }
    return await deliveryCompanyRepository.findAvailableDrivers(deliveryCompanyId, period);
  }

  async getAvailableOrders(userContext) {
    const deliveryCompanyId = userContext.deliveryCompanyId;
    if (!deliveryCompanyId) {
      throw new BusinessError('Acceso denegado: No tienes una empresa de reparto asociada.', 403);
    }
    
    // Obtener block_meters de la base de datos
    const [rules] = await db.query('SELECT block_meters FROM protocol_rules WHERE id = 1');
    const blockMeters = rules.length > 0 ? parseInt(rules[0].block_meters, 10) : 100;

    const orders = await deliveryCompanyRepository.findAvailableOrders();
    return orders.map(o => ({ ...o, block_meters: blockMeters }));
  }

  async getOrderHistory(userContext, queryData) {
    const deliveryCompanyId = userContext.deliveryCompanyId;
    if (!deliveryCompanyId) {
      throw new BusinessError('Acceso denegado: No tienes una empresa de reparto asociada.', 403);
    }
    const page = parseInt(queryData.page, 10) || 1;
    const limit = parseInt(queryData.limit, 10) || 20;
    const offset = (page - 1) * limit;

    // Obtener block_meters de la base de datos
    const [rules] = await db.query('SELECT block_meters FROM protocol_rules WHERE id = 1');
    const blockMeters = rules.length > 0 ? parseInt(rules[0].block_meters, 10) : 100;

    const orders = await deliveryCompanyRepository.findOrderHistory(deliveryCompanyId, limit, offset);
    return orders.map(o => ({ ...o, block_meters: blockMeters }));
  }

  async acceptOrder(userContext, orderId, req) {
    const deliveryCompanyId = userContext.deliveryCompanyId;
    if (!deliveryCompanyId) {
      throw new BusinessError('Acceso denegado: No tienes una empresa de reparto asociada.', 403);
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Obtener pedido y validar
      const order = await deliveryCompanyRepository.findOrderById(conn, orderId);
      if (!order) {
        throw new NotFoundError(`Pedido #${orderId} no encontrado.`);
      }

      if (order.status !== 'listo') {
        throw new BusinessError(`El pedido #${orderId} no está listo para despacho (estado actual: ${order.status}).`, 400);
      }

      if (order.driver_user_id !== null) {
        throw new BusinessError(`El pedido #${orderId} ya tiene un repartidor asignado.`, 400);
      }

      if (order.delivery_company_id !== null) {
        throw new BusinessError(`El pedido #${orderId} ya fue aceptado por otra empresa de reparto.`, 400);
      }

      // 2. Calcular costos
      const costDetails = await domiEngine.calculateOrderCost(parseFloat(order.total_cop), order.distance_km);

      // 3. Realizar cobro
      try {
        await domiEngine.chargeDeliveryCompanyForOrder(orderId, deliveryCompanyId, costDetails.driver_cost_domis);
      } catch (chargeErr) {
        // Si falla por saldo insuficiente, lanzar error legible con código HTTP 402
        if (chargeErr.message.includes('insuficiente')) {
          throw new BusinessError(chargeErr.message, 402);
        }
        throw chargeErr;
      }

      // 4. Actualizar pedido a listo_despacho y registrar la empresa de reparto
      await deliveryCompanyRepository.acceptOrder(
        conn,
        orderId,
        deliveryCompanyId,
        costDetails.driver_cost_domis,
        costDetails.fiat_peg_used
      );

      await conn.commit();

      await logSecurityEvent(userContext.id, 'DELIVERY_COMPANY_ACCEPT_ORDER', 'LOW', req, {
        orderId,
        deliveryCompanyId,
        costDomi: costDetails.driver_cost_domis
      }, 'order', orderId);

      return {
        success: true,
        message: 'Pedido aceptado por la empresa de reparto exitosamente.',
        costPaid: costDetails.driver_cost_domis
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async assignDriver(userContext, orderId, driverUserId, req) {
    const deliveryCompanyId = userContext.deliveryCompanyId;
    if (!deliveryCompanyId) {
      throw new BusinessError('Acceso denegado: No tienes una empresa de reparto asociada.', 403);
    }

    if (!driverUserId) {
      throw new BusinessError('El ID del repartidor es requerido.', 400);
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Obtener pedido y validar
      const order = await deliveryCompanyRepository.findOrderById(conn, orderId);
      if (!order) {
        throw new NotFoundError(`Pedido #${orderId} no encontrado.`);
      }

      if (order.delivery_company_id !== parseInt(deliveryCompanyId, 10)) {
        throw new ForbiddenError('No tienes permiso para gestionar este pedido.');
      }

      if (order.status !== 'listo_despacho') {
        throw new BusinessError(`El pedido #${orderId} debe estar en estado listo_despacho para poder asignar repartidor (estado actual: ${order.status}).`, 400);
      }

      // 2. Obtener perfil del repartidor y validar que pertenezca a la misma empresa
      const driverProfile = await deliveryCompanyRepository.findDriverProfile(driverUserId);
      if (!driverProfile) {
        throw new NotFoundError('Repartidor no encontrado.');
      }

      if (driverProfile.delivery_company_id !== parseInt(deliveryCompanyId, 10)) {
        throw new ForbiddenError('El repartidor no está afiliado a tu empresa de reparto.');
      }

      // 3. Asignar el repartidor al pedido
      await deliveryCompanyRepository.assignDriver(conn, orderId, driverUserId);

      await conn.commit();

      await logSecurityEvent(userContext.id, 'ASSIGN_DRIVER_BY_COMPANY', 'LOW', req, {
        orderId,
        driverUserId,
        deliveryCompanyId
      }, 'order', orderId);

      return {
        success: true,
        message: 'Repartidor asignado exitosamente al pedido.'
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getDeliveryFinancialSummary(userContext, params, req) {
    const { filterType, selectedMonth, id } = params;
    const isSystem = userContext.actorType === 'system_user';

    let targetCompanyId = Number(id);
    if (!isSystem) {
      // BOLA Protection: si no es de sistema, forzar a su propia empresa
      targetCompanyId = userContext.deliveryCompanyId;
    }

    if (!targetCompanyId) {
      throw new BusinessError('Debe especificar una empresa de delivery válida.');
    }

    // 1. Obtener rangos de fecha localizados
    const { start, end } = getQueryDateBoundsLocal(filterType, selectedMonth);

    // 2. Obtener estadísticas de la empresa
    const stats = await deliveryCompanyRepository.getDeliveryFinancialSummaryData(targetCompanyId, start, end);
    if (!stats) {
      throw new NotFoundError('Empresa de mensajería no encontrada o sin datos.');
    }

    // 3. Obtener meses con datos
    const monthsWithData = await deliveryCompanyRepository.getMonthsWithData(targetCompanyId);
    const colNow = new Date(new Date().getTime() - (5 * 3600000));
    const currentMonthStr = `${colNow.getUTCFullYear()}-${String(colNow.getUTCMonth() + 1).padStart(2, '0')}`;
    
    let monthOptions = [...monthsWithData];
    if (!monthOptions.includes(currentMonthStr)) {
      monthOptions.unshift(currentMonthStr);
    }

    // 4. Obtener paridad del token DOMI peg
    const [tokenRows] = await db.query('SELECT fiat_peg_cop FROM token_registry WHERE id = 1');
    const fiatPeg = tokenRows.length > 0 ? parseFloat(tokenRows[0].fiat_peg_cop) : 400.0;

    // 5. Obtener saldo disponible de billetera de la empresa
    // El usuario_id de la empresa se obtiene uniendo con la tabla delivery_companies
    const [companyRows] = await db.query('SELECT usuario_id FROM delivery_companies WHERE id = ?', [targetCompanyId]);
    let balance = 0;
    if (companyRows.length > 0) {
      const [walletRows] = await db.query('SELECT balance_custody FROM wallets WHERE user_id = ?', [companyRows[0].usuario_id]);
      if (walletRows.length > 0) {
        balance = parseFloat(walletRows[0].balance_custody || 0);
      }
    }

    const completed = parseInt(stats.completed_orders, 10);
    const rejected = parseInt(stats.rejected_orders, 10);
    const cancelled = parseInt(stats.cancelled_orders, 10);
    const earnings = parseFloat(stats.total_earnings);

    // Registrar auditoría de seguridad
    await logSecurityEvent(
      userContext.id,
      'VIEW_DELIVERY_FINANCIAL_SUMMARY',
      'INFO',
      req,
      { deliveryCompanyId: targetCompanyId, filterType },
      'delivery_company',
      targetCompanyId
    );

    return {
      consolidated: {
        totalEarningsCop: earnings, // Mapeo semántico: totalEarningsCop en vez de totalSalesCop
        totalCommissionsPaidDomi: 0, // No aplica costo de comisión de plataforma directo aquí
        totalCompletedOrders: completed,
        totalRejectedOrders: rejected,
        totalCancelledOrders: cancelled,
        totalContingentRefundsDomi: 0, // No aplica deudas contingentes directas de cliente a empresa de reparto en este scope
        walletBalanceDomi: balance,
        walletBalanceCop: balance * fiatPeg,
        fiatPeg
      },
      fiatPeg,
      monthOptions
    };
  }
}

function getQueryDateBoundsLocal(filterType, selectedMonth) {
  const now = new Date();
  const col = new Date(now.getTime() - (5 * 3600000));
  const y = col.getUTCFullYear();
  const m = col.getUTCMonth();
  const d = col.getUTCDate();

  let start, end;

  if (filterType === 'day') {
    start = new Date(Date.UTC(y, m, d, 5, 0, 0, 0));
    end = new Date(Date.UTC(y, m, d, 28, 59, 59, 999));
  } else if (filterType === 'week') {
    const dayOfWeek = col.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start = new Date(Date.UTC(y, m, d + diffToMonday, 5, 0, 0, 0));
    end = new Date(Date.UTC(y, m, d + diffToMonday + 6, 28, 59, 59, 999));
  } else if (filterType === 'month') {
    let year = y;
    let monthZeroIndexed = m;

    if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      const [yStr, mStr] = selectedMonth.split('-');
      year = parseInt(yStr, 10);
      monthZeroIndexed = parseInt(mStr, 10) - 1;
    }

    start = new Date(Date.UTC(year, monthZeroIndexed, 1, 5, 0, 0, 0));
    const lastDayObj = new Date(Date.UTC(year, monthZeroIndexed + 1, 0));
    const lastDay = lastDayObj.getUTCDate();
    end = new Date(Date.UTC(year, monthZeroIndexed, lastDay, 28, 59, 59, 999));
  } else {
    start = new Date(Date.UTC(y, m, d, 5, 0, 0, 0));
    end = new Date(Date.UTC(y, m, d, 28, 59, 59, 999));
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

module.exports = new DeliveryCompanyService();
