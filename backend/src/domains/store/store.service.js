const db = require('../../config/db');
const storeRepository = require('./store.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const appLogger = require('../../utils/appLogger');

const StoreManagementService = require('./services/StoreManagementService');
const StoreMediaService = require('./services/StoreMediaService');
const StoreStatusService = require('./services/StoreStatusService');

class StoreService {
  constructor() {
    this.managementService = new StoreManagementService(this);
    this.mediaService = new StoreMediaService(this);
    this.statusService = new StoreStatusService(this);
  }

  // --- HELPERS COMPARTIDOS ---
  async cleanupOldImage(oldUrl, req) {
    try {
      const getFileName = (url) => {
        if (!url) return '';
        const parts = url.split('/');
        return parts[parts.length - 1];
      };
      const oldFileName = getFileName(oldUrl);

      if (oldUrl.includes('/uploads/stores/')) {
        const mediaServerUrl = process.env.MEDIA_SERVER_URL || 'http://localhost:4001';
        await fetch(`${mediaServerUrl}/api/media/delete/store/${oldFileName}`, {
          method: 'DELETE',
          headers: {
            'x-internal-key': process.env.INTERNAL_API_KEY || ''
          }
        }).catch(err => appLogger.error('[IMAGE_CLEANUP_ERROR]', err));
      }
    } catch (err) {
      appLogger.error('[IMAGE_CLEANUP_FAILED]', err);
    }
  }

  async cloneCatalog(sourceStoreId, targetStoreId, connection) {
    const [menus] = await connection.query(
      'SELECT id, nombre, descripcion, orden, disponible FROM menus WHERE store_id = ? AND deleted_at IS NULL',
      [sourceStoreId]
    );

    for (const menu of menus) {
      const [menuResult] = await connection.query(
        'INSERT INTO menus (store_id, nombre, descripcion, orden, disponible) VALUES (?, ?, ?, ?, ?)',
        [targetStoreId, menu.nombre, menu.descripcion, menu.orden, menu.disponible]
      );
      const newMenuId = menuResult.insertId;

      const [categories] = await connection.query(
        'SELECT id, nombre, descripcion, orden_visual, disponible FROM categorias WHERE menu_id = ? AND deleted_at IS NULL',
        [menu.id]
      );

      for (const cat of categories) {
        const [catResult] = await connection.query(
          'INSERT INTO categorias (menu_id, nombre, descripcion, orden_visual, disponible) VALUES (?, ?, ?, ?, ?)',
          [newMenuId, cat.nombre, cat.descripcion, cat.orden_visual, cat.disponible]
        );
        const newCategoryId = catResult.insertId;

        const [products] = await connection.query(
          `SELECT nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano, image_url, tags 
           FROM products 
           WHERE store_id = ? AND categoria_id = ? AND deleted_at IS NULL`,
          [sourceStoreId, cat.id]
        );

        for (const prod of products) {
          await connection.query(
            `INSERT INTO products 
             (store_id, categoria_id, menu_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, es_vegetariano, image_url, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              targetStoreId, newCategoryId, newMenuId, prod.nombre, prod.descripcion_larga,
              prod.precio_base, prod.tiempo_prep_estimado, prod.disponible,
              prod.es_vegetariano, prod.image_url, prod.tags
            ]
          );
        }
      }
    }
  }

  // --- MANAGEMENT SERVICE DELEGATIONS ---
  async getMyStores(userContext) {
    return await this.managementService.getStores(userContext, null);
  }

  async getStoresByCommerceId(userContext, commerceId, req) {
    return await this.managementService.getStores(userContext, commerceId, req);
  }

  async getStoreById(userContext, id, req) {
    return await this.managementService.getStoreDetail(userContext, id, req);
  }

  async createStore(userContext, data, req) {
    return await this.managementService.createStore(userContext, data, req);
  }

  async updateStore(userContext, data, req) {
    return await this.managementService.updateStore(userContext, data, req);
  }

  // --- MEDIA SERVICE DELEGATIONS ---
  async uploadStoreLogo(userContext, storeId, imageUrl, req) {
    return await this.mediaService.uploadStoreLogo(userContext, storeId, imageUrl, req);
  }

  async uploadStoreBanner(userContext, storeId, bannerUrl, req) {
    return await this.mediaService.uploadStoreBanner(userContext, storeId, bannerUrl, req);
  }

  // --- STATUS SERVICE DELEGATIONS ---
  async getStoreSchedule(storeId) {
    return await this.statusService.getStoreSchedule(storeId);
  }

  async updateStoreSchedule(userContext, storeId, schedule, req) {
    return await this.statusService.updateStoreSchedule(userContext, storeId, schedule, req);
  }

  async toggleStoreOpenStatus(userContext, storeId, estado, fechaRegreso, req) {
    return await this.statusService.toggleStoreOpenStatus(userContext, storeId, estado, fechaRegreso, req);
  }

  // --- VIDEO METHODS ---
  async getVideos(storeId) {
    const targetStoreId = Number(storeId);
    return await storeRepository.findVideosByStoreId(targetStoreId);
  }

  async createVideo(userContext, storeId, url, descripcion, req) {
    const isSystem = userContext.actorType === 'system_user';
    const targetStoreId = Number(storeId);

    const store = await storeRepository.findById(targetStoreId);
    if (!store) throw new NotFoundError('Sede no encontrada.');

    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { storeId: targetStoreId, action: 'create_video' },
        'store',
        targetStoreId
      );
      throw new ForbiddenError('No autorizado para subir videos a esta sede.');
    }

    const videoId = await storeRepository.createVideo(targetStoreId, url, descripcion);

    await logSecurityEvent(
      userContext.id,
      'CREATE_VIDEO',
      'MEDIUM',
      req,
      { videoId, storeId: targetStoreId },
      'store',
      targetStoreId
    );

    return videoId;
  }

  async toggleVideo(userContext, videoId, isActive, req) {
    const targetVideoId = Number(videoId);
    const video = await storeRepository.findVideoById(targetVideoId);
    if (!video) {
      throw new NotFoundError('Video no encontrado.');
    }

    const store = await storeRepository.findById(video.store_id);
    if (!store) throw new NotFoundError('Sede asociada al video no encontrada.');

    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { videoId: targetVideoId, action: 'toggle_video' },
        'store',
        video.store_id
      );
      throw new ForbiddenError('No autorizado para modificar este video.');
    }

    await storeRepository.updateVideoStatus(targetVideoId, video.store_id, isActive ? 1 : 0);
    return true;
  }

  async deleteVideo(userContext, videoId, req) {
    const targetVideoId = Number(videoId);
    const video = await storeRepository.findVideoById(targetVideoId);
    if (!video) {
      throw new NotFoundError('Video no encontrado.');
    }

    const store = await storeRepository.findById(video.store_id);
    if (!store) throw new NotFoundError('Sede asociada al video no encontrada.');

    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && store.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { videoId: targetVideoId, action: 'delete_video' },
        'store',
        video.store_id
      );
      throw new ForbiddenError('No autorizado para eliminar este video.');
    }

    const getFileName = (url) => {
      if (!url) return '';
      const parts = url.split('/');
      return parts[parts.length - 1];
    };

    if (video.url) {
      try {
        const fileName = getFileName(video.url);
        const mediaServerUrl = process.env.MEDIA_SERVER_URL || 'http://localhost:4001';
        await fetch(`${mediaServerUrl}/api/media/delete/video/${fileName}`, {
          method: 'DELETE',
          headers: {
            'x-internal-key': process.env.INTERNAL_API_KEY || ''
          }
        }).catch(err => appLogger.error('[VIDEO_CLEANUP_ERROR]', err));
      } catch (err) {
        appLogger.error('[VIDEO_CLEANUP_FAILED]', err);
      }
    }

    await storeRepository.deleteVideo(targetVideoId, video.store_id);

    await logSecurityEvent(
      userContext.id,
      'DELETE_VIDEO',
      'MEDIUM',
      req,
      { videoId: targetVideoId, url: video.url },
      'store',
      video.store_id
    );

    return true;
  }

  // --- FINANCIAL METHODS ---
  async getStoreFinancialSummary(userContext, params, req) {
    const { filterType, selectedMonth, id } = params;
    const isSystem = userContext.actorType === 'system_user';
    
    let targetStoreId = Number(id);
    if (!isSystem) {
      if (!userContext.storeId && (!userContext.storeIds || userContext.storeIds.length === 0)) {
        throw new ForbiddenError('El usuario no tiene una sede asociada.');
      }
      targetStoreId = userContext.storeId || userContext.storeIds[0];
    }

    if (!targetStoreId) {
      throw new BusinessError('Debe especificar una sede válida.');
    }

    const { start, end } = getQueryDateBoundsLocal(filterType, selectedMonth);

    const stats = await storeRepository.getStoreFinancialSummaryData(targetStoreId, start, end);
    if (!stats) {
      throw new NotFoundError('Sede no encontrada o sin datos disponibles.');
    }

    const monthsWithData = await storeRepository.getMonthsWithData(targetStoreId);
    const colNow = new Date(new Date().getTime() - (5 * 3600000));
    const currentMonthStr = `${colNow.getUTCFullYear()}-${String(colNow.getUTCMonth() + 1).padStart(2, '0')}`;
    
    let monthOptions = [...monthsWithData];
    if (!monthOptions.includes(currentMonthStr)) {
      monthOptions.unshift(currentMonthStr);
    }

    const [tokenRows] = await db.query('SELECT fiat_peg_cop FROM token_registry WHERE id = 1');
    const fiatPeg = tokenRows.length > 0 ? parseFloat(tokenRows[0].fiat_peg_cop) : 400.0;

    const [debtRows] = await db.query(
      `SELECT SUM(amount_domis) as total_debts 
       FROM domi_order_debts 
       WHERE beneficiary_type = 'store' 
         AND beneficiary_id = ? 
         AND status = 'pending'`,
      [targetStoreId]
    );
    const contingentDomi = parseFloat(debtRows[0].total_debts || 0.0);

    const completed = parseInt(stats.completed_orders, 10);
    const rejected = parseInt(stats.rejected_orders, 10);
    const cancelled = parseInt(stats.cancelled_orders, 10);
    const sales = parseFloat(stats.total_sales);
    const commissions = parseFloat(stats.commissions_paid);
    const balance = parseFloat(stats.balance_custody);

    await logSecurityEvent(
      userContext.id,
      'VIEW_FINANCIAL_SUMMARY',
      'INFO',
      req,
      { storeId: targetStoreId, filterType },
      'store',
      targetStoreId
    );

    return {
      consolidated: {
        totalSalesCop: sales,
        totalCommissionsPaidDomi: commissions,
        totalCompletedOrders: completed,
        totalRejectedOrders: rejected,
        totalCancelledOrders: cancelled,
        totalContingentRefundsDomi: contingentDomi,
        walletBalanceDomi: balance,
        walletBalanceCop: balance * fiatPeg,
        fiatPeg
      },
      store: {
        storeId: stats.store_id,
        nombreSucursal: stats.nombre_sucursal,
        estado: stats.estado,
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

module.exports = new StoreService();
