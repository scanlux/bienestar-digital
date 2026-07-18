const commerceRepository = require('./commerce.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');

class CommerceService {
  async getCommerces(userContext, status) {
    const isSystem = userContext.actorType === 'system_user';
    
    // BOLA Check: si no es sistema, solo puede listar su propio comercio
    if (!isSystem) {
      const myCommerce = await commerceRepository.findById(userContext.commerceId);
      if (!myCommerce) return [];
      
      // Filtrar por status si fue provisto
      if (status && myCommerce.status !== status) {
        return [];
      }
      return [myCommerce];
    }
    
    return await commerceRepository.findAll(status);
  }

  async getCommerceById(userContext, id, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetId = Number(id);
    
    // BOLA Check: si no es sistema, no puede consultar otro comercio
    if (!isSystem && targetId !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { commerceId: targetId, action: 'view_commerce_details' },
        'commerce',
        targetId
      );
      throw new ForbiddenError('No está autorizado para ver los detalles de este comercio.');
    }
    
    const commerce = await commerceRepository.findById(targetId);
    if (!commerce) {
      throw new NotFoundError('Comercio no encontrado.');
    }
    
    await logSecurityEvent(
      userContext.id,
      'VIEW_COMMERCE_DETAILS',
      'LOW',
      req,
      { commerceId: targetId },
      'commerce',
      targetId
    );

    return commerce;
  }

  async createCommerce(userContext, data, req) {
    const { nit, usuario_id } = data;
    
    // Validar si el usuario ya tiene un comercio asignado
    if (usuario_id) {
      const existingUserCommerce = await commerceRepository.findByUserId(usuario_id);
      if (existingUserCommerce) {
        throw new BusinessError('Este usuario ya tiene un comercio asignado.');
      }
    }
    
    // Validar si el NIT ya está registrado
    if (nit) {
      const existingNit = await commerceRepository.findByNit(nit);
      if (existingNit) {
        throw new BusinessError('El NIT provisto ya se encuentra registrado.');
      }
    }
    
    const commerceId = await commerceRepository.create(data);
    
    await logSecurityEvent(
      userContext.id,
      'CREATE_COMMERCE',
      'HIGH',
      req,
      { commerceId, nombre: data.nombre, nit },
      'commerce',
      commerceId
    );
    
    return commerceId;
  }

  async updateCommerce(userContext, id, data, req) {
    const targetId = Number(id);
    const isSystem = userContext.actorType === 'system_user';
    
    // BOLA Check: si no es de sistema, solo puede actualizar su propio comercio
    if (!isSystem && targetId !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { commerceId: targetId, action: 'edit_commerce' },
        'commerce',
        targetId
      );
      throw new ForbiddenError('No está autorizado para modificar este comercio.');
    }

    // Defensa en profundidad: si no es usuario de sistema, sanitizar parámetros críticos
    if (!isSystem) {
      delete data.usuario_id;
      delete data.orden;
      delete data.status;
    }
    
    const commerce = await commerceRepository.findById(targetId);
    if (!commerce) {
      throw new NotFoundError('Comercio no encontrado.');
    }
    
    // Validar reasignación de usuario administrador
    if (data.usuario_id) {
      const existingUserCommerce = await commerceRepository.findByUserId(data.usuario_id, targetId);
      if (existingUserCommerce) {
        throw new BusinessError('Este usuario ya tiene otro comercio asignado.');
      }
    }
    
    // Validar cambio de NIT registrado
    if (data.nit) {
      const existingNit = await commerceRepository.findByNit(data.nit, targetId);
      if (existingNit) {
        throw new BusinessError('El NIT provisto ya se encuentra registrado en otro comercio.');
      }
    }
    
    const updateData = {
      nombre: data.nombre !== undefined ? data.nombre : commerce.nombre,
      nit: data.nit !== undefined ? data.nit : commerce.nit,
      nit_dv: data.nit_dv !== undefined ? data.nit_dv : commerce.nit_dv,
      telefono: data.telefono !== undefined ? data.telefono : commerce.telefono,
      ciudad: data.ciudad !== undefined ? data.ciudad : commerce.ciudad,
      direccion: data.direccion !== undefined ? data.direccion : commerce.direccion,
      descripcion: data.descripcion !== undefined ? data.descripcion : commerce.descripcion,
      logo_url: data.logo_url !== undefined ? data.logo_url : commerce.logo_url,
      orden: data.orden !== undefined ? data.orden : commerce.orden,
      usuario_id: data.usuario_id !== undefined ? data.usuario_id : commerce.usuario_id,
      admin_nombres: data.admin_nombres !== undefined ? data.admin_nombres : commerce.admin_nombres,
      admin_apellidos: data.admin_apellidos !== undefined ? data.admin_apellidos : commerce.admin_apellidos
    };

    await commerceRepository.update(targetId, updateData);
    
    await logSecurityEvent(
      userContext.id,
      'EDIT_COMMERCE',
      'MEDIUM',
      req,
      { commerceId: targetId, nombre: data.nombre, nit: data.nit },
      'commerce',
      targetId
    );
    
    return true;
  }

  async updateCommerceStatus(userContext, id, status, req) {
    const targetId = Number(id);
    const commerce = await commerceRepository.findById(targetId);
    if (!commerce) {
      throw new NotFoundError('Comercio no encontrado.');
    }
    
    await commerceRepository.updateStatus(targetId, status);
    
    await logSecurityEvent(
      userContext.id,
      'CHANGE_COMMERCE_STATUS',
      'HIGH',
      req,
      { commerceId: targetId, newStatus: status },
      'commerce',
      targetId
    );
    
    return true;
  }

  async getFinancialSummary(userContext, params, req) {
    const db = require('../../config/db');
    const { filterType, selectedMonth, commerceId } = params;
    const isSystem = userContext.actorType === 'system_user';
    
    let targetCommerceId = Number(commerceId);
    if (!isSystem) {
      targetCommerceId = userContext.commerceId;
    }

    if (!targetCommerceId) {
      throw new BusinessError('Debe especificar un comercio válido.');
    }

    // 1. Obtener los rangos de fecha UTC
    const { start, end } = getQueryDateBounds(filterType, selectedMonth);

    // 2. Obtener datos financieros agregados por sede
    const storesStats = await commerceRepository.getFinancialSummaryData(targetCommerceId, start, end);

    // 3. Obtener meses con datos
    const monthsWithData = await commerceRepository.getMonthsWithData(targetCommerceId);

    // Si la lista de meses está vacía o no incluye el mes actual, agregarlo al inicio
    const colNow = new Date(new Date().getTime() - (5 * 3600000));
    const currentMonthStr = `${colNow.getUTCFullYear()}-${String(colNow.getUTCMonth() + 1).padStart(2, '0')}`;
    
    let monthOptions = [...monthsWithData];
    if (!monthOptions.includes(currentMonthStr)) {
      monthOptions.unshift(currentMonthStr);
    }

    // 4. Obtener el peg actual del token registry para calcular equivalencia COP sin hardcodear
    const [tokenRows] = await db.query('SELECT fiat_peg_cop FROM token_registry WHERE id = 1');
    const fiatPeg = tokenRows.length > 0 ? parseFloat(tokenRows[0].fiat_peg_cop) : 400.0;

    // 5. Obtener reembolsos contingentes (deudas pendientes de clientes a favor de las sedes de este comercio)
    const [debtRows] = await db.query(
      `SELECT beneficiary_id as store_id, SUM(amount_domis) as total_debts 
       FROM domi_order_debts 
       WHERE beneficiary_type = 'store' 
         AND beneficiary_id IN (SELECT id FROM stores WHERE commerce_id = ?) 
         AND status = 'pending' 
       GROUP BY beneficiary_id`,
      [targetCommerceId]
    );

    const storeDebtsMap = {};
    debtRows.forEach(row => {
      storeDebtsMap[row.store_id] = parseFloat(row.total_debts || 0);
    });

    // Calcular el consolidado total de todas las sedes
    let totalSalesCop = 0;
    let totalCommissionsPaidDomi = 0;
    let totalCompletedOrders = 0;
    let totalRejectedOrders = 0;
    let totalCancelledOrders = 0;
    let totalContingentRefundsDomi = 0;

    const formattedStores = storesStats.map(store => {
      const sales = parseFloat(store.total_sales);
      const commissions = parseFloat(store.commissions_paid);
      const completed = parseInt(store.completed_orders, 10);
      const rejected = parseInt(store.rejected_orders, 10);
      const cancelled = parseInt(store.cancelled_orders, 10);
      const balance = parseFloat(store.balance_custody);
      const contingentDomi = storeDebtsMap[store.store_id] || 0.0;

      totalSalesCop += sales;
      totalCommissionsPaidDomi += commissions;
      totalCompletedOrders += completed;
      totalRejectedOrders += rejected;
      totalCancelledOrders += cancelled;
      totalContingentRefundsDomi += contingentDomi;

      return {
        storeId: store.store_id,
        nombreSucursal: store.nombre_sucursal,
        estado: store.estado,
        balanceCustodyDomi: balance,
        balanceCustodyCop: balance * fiatPeg,
        contingentRefundsDomi: contingentDomi,
        contingentRefundsCop: contingentDomi * fiatPeg,
        stats: {
          completedOrdersCount: completed,
          rejectedOrdersCount: rejected,
          cancelledOrdersCount: cancelled,
          totalSalesCop: sales,
          commissionsPaidDomi: commissions
        }
      };
    });

    const consolidated = {
      totalSalesCop,
      totalCommissionsPaidDomi,
      totalCompletedOrders,
      totalRejectedOrders,
      totalCancelledOrders,
      totalContingentRefundsDomi,
      totalContingentRefundsCop: totalContingentRefundsDomi * fiatPeg
    };

    // Registrar evento de auditoría
    await logSecurityEvent(
      userContext.id,
      'VIEW_COMMERCE_FINANCIAL_SUMMARY',
      'LOW',
      req,
      { commerceId: targetCommerceId, filterType, selectedMonth },
      'commerce',
      targetCommerceId
    );

    return {
      commerceId: targetCommerceId,
      filterType,
      selectedMonth: selectedMonth || currentMonthStr,
      monthOptions,
      dateRange: { start, end },
      fiatPeg,
      stores: formattedStores,
      consolidated
    };
  }

  async getStoresHistory(userContext, queryParams, req) {
    const isSystem = userContext.actorType === 'system_user';
    let targetCommerceId = Number(queryParams.commerceId);
    if (!isSystem) {
      targetCommerceId = userContext.commerceId;
    }

    if (!targetCommerceId) {
      throw new BusinessError('Debe especificar un comercio válido.');
    }

    const { search, txType, storeId } = queryParams;
    const history = await commerceRepository.getStoresLedgerHistory(targetCommerceId, { search, txType, storeId });

    // Fetch fiat peg
    const db = require('../../config/db');
    const [tokenRows] = await db.query('SELECT fiat_peg_cop FROM token_registry WHERE id = 1');
    const fiatPeg = tokenRows.length > 0 ? parseFloat(tokenRows[0].fiat_peg_cop) : 400.0;

    // Registrar evento de auditoría
    await logSecurityEvent(
      userContext.id,
      'VIEW_COMMERCE_STORES_HISTORY',
      'LOW',
      req,
      { commerceId: targetCommerceId, search, txType, storeId },
      'commerce',
      targetCommerceId
    );

    return {
      commerceId: targetCommerceId,
      fiatPeg,
      history
    };
  }
}

function getQueryDateBounds(filterType, selectedMonth) {
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
    const dayOfWeek = col.getUTCDay(); // 0 (Sun) - 6 (Sat)
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

module.exports = new CommerceService();
