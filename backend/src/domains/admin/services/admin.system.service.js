const crypto = require('crypto');
const db = require('../../../config/db');
const adminRepository = require('../admin.repository');
const userRepository = require('../../user/user.repository');
const { BusinessError, NotFoundError, ForbiddenError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const domiEngine = require('../../../services/domiEngine');
const domiTreasuryEngine = require('../../../services/domiTreasuryEngine');
const { getRedisClient } = require('../../../config/redis');

class AdminSystemService {
  constructor(adminService) {
    this.adminService = adminService;
  }

  async getGlobalStats() {
    return await adminRepository.findGlobalStats();
  }

  async getFinancialFlags() {
    return await adminRepository.getFinancialFlags();
  }

  async updateFinancialFlag(user, key, enabled, req) {
    if (enabled === undefined) {
      throw new BusinessError('El estado "enabled" es obligatorio.');
    }
    
    if (key === 'withdrawals_enabled') {
      const isRoot = user.actorType === 'system_user' && user.rol === 'root';
      const hasPerm = isRoot || await userRepository.checkUserPermission(user.actorType, user.id, 'suspend_withdrawals');
      if (!hasPerm) {
        throw new ForbiddenError('No tienes autorización para suspender o habilitar los retiros globales.');
      }
    }

    await adminRepository.updateFinancialFlag(key, enabled, user.id);
    
    await logSecurityEvent(
      user.id,
      'UPDATE_FINANCIAL_FLAG',
      'HIGH',
      req,
      { flagKey: key, enabled: !!enabled },
      user.actorType || 'system_user',
      0
    );
    
    return { success: true, message: `Interruptor ${key} actualizado a ${enabled ? 'activo' : 'inactivo'}` };
  }

  async updatePermissionUIMode(user, id, mode, req) {
    if (!['ghost', 'hidden', 'disabled'].includes(mode)) {
      throw new BusinessError('Modo de restricción inválido. Debe ser: ghost, hidden, o disabled.');
    }
    await adminRepository.updatePermissionUIMode(id, mode);

    await logSecurityEvent(
      user.id,
      'UPDATE_PERMISSION_UI_MODE',
      'MEDIUM',
      req,
      { permissionId: id, uiMode: mode },
      user.actorType || 'system_user',
      0
    );

    return { success: true, message: `Modo de restriccion de permiso actualizado a ${mode}` };
  }

  async getSystemParameters(userContext, req = null) {
    await logSecurityEvent(userContext.id, 'VIEW_SYSTEM_PARAMETERS', 'MEDIUM', req);
    const conn = await db.getConnection();
    try {
      const rules = await domiEngine.getProtocolRules(conn);
      const token = await domiEngine.getTokenRegistry(conn);
      const treasury = await domiTreasuryEngine.getTreasuryStatus(conn);

      const [sysParams] = await conn.query('SELECT `key`, `value` FROM system_parameters');
      sysParams.forEach(p => {
        rules[p.key] = Number(p.value);
      });

      const [metaRows] = await conn.query('SELECT param_key, label, description, actor, initiator, flow_trigger, applicable_states, payment_methods, formula_hint, impact_note FROM protocol_rules_metadata');
      const metadata = {};
      metaRows.forEach(row => {
        metadata[row.param_key] = {
          label: row.label,
          description: row.description,
          actor: row.actor,
          initiator: row.initiator,
          flow_trigger: row.flow_trigger,
          applicable_states: row.applicable_states,
          payment_methods: row.payment_methods,
          formula_hint: row.formula_hint,
          impact_note: row.impact_note
        };
      });

      return {
        rules,
        token,
        treasury,
        metadata
      };
    } finally {
      conn.release();
    }
  }

  async updateSystemParameters(user, data, req) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const systemParamKeys = [
        'free_tier_stores_limit',
        'free_tier_categories_limit',
        'free_tier_products_limit',
        'influencer_reels_limit'
      ];

      for (const key of systemParamKeys) {
        if (data[key] !== undefined) {
          await conn.query(
            'UPDATE system_parameters SET `value` = ? WHERE `key` = ?',
            [String(data[key]), key]
          );
        }
      }

      const currentRules = await domiEngine.getProtocolRules(conn);

      const updatableFields = [
        'store_fixed_fee_cop',
        'driver_fixed_fee_cop',
        'cashback_rate_customer',
        'max_balance_cop',
        'min_domi_balance_driver',
        'free_withdrawals_per_month',
        'withdrawal_fee_cop',
        'score_min_for_cashback',
        'score_cashback_win_base',
        'max_monthly_yield_pct',
        'min_collateral_ratio_post_adjust',
        'store_subscription_fee_domi',
        'commerce_subscription_fee_domi',
        'wompi_commission_percent',
        'wompi_commission_fixed_cop',
        'wompi_commission_iva_percent',
        'wompi_min_purchase_cop',
        'score_earned_on_purchase',
        'score_earned_on_domi_purchase',
        'score_penalty_domi_cancel_accepted',
        'score_penalty_domi_cancel_in_transit',
        'score_penalty_domi_cancel_dispatch',
        'score_penalty_cash_cancel_accepted',
        'score_penalty_cash_cancel_in_transit',
        'score_penalty_cash_cancel_dispatch',
        'driver_cancellation_compensation_rate',
        'driver_cancel_pre_pickup_refund_rate',
        'driver_cancel_post_pickup_penalty_rate',
        'customer_cancel_store_refund_prep_rate',
        'customer_cancel_client_refund_prep_rate',
        'customer_cancel_sys_retain_prep_rate',
        'customer_cancel_driver_commission_refund_transit_rate',
        'customer_cancel_store_commission_refund_dispatch_rate',
        'customer_cancel_driver_commission_refund_dispatch_rate',
        'customer_cancel_driver_delivery_pct_dispatch',
        'platform_processing_fee_rate',
        'delivery_base_fare_cop',
        'delivery_base_distance_km',
        'delivery_extra_rate_cop_per_km',
        'delivery_max_distance_km',
        'retention_penalty_rate',
        'refund_standard_rate',
        'rescue_cashback_rate',
        'driver_rescue_commission_refund_rate',
        'driver_rescue_timeout_minutes',
        'driver_rescue_max_attempts',
        'driver_penalty_points_rescue_original',
        'driver_rescue_chain_penalty_points',
        'minimum_delivery_rate',
        'store_solvency_delivery_multiplier',
        'solvency_commission_guarantee_fraction',
        'store_cancel_client_indemnity_domi_amount',
        'store_penalty_points_prep',
        'store_penalty_points_dispatch',
        'driver_penalty_points_prep',
        'driver_penalty_points_dispatch',
        'driver_penalty_points_transit',
        'store_cancel_driver_delivery_pct_rate',
        'store_cancel_client_indemnity_rate',
        'customer_cancel_driver_delivery_pct_dispatch_rate',
        'driver_commission_refund_on_store_cancel_rate'
      ];

      const updates = {};
      const queryParts = [];
      const values = [];

      for (const field of updatableFields) {
        if (data[field] !== undefined) {
          updates[field] = data[field];
          queryParts.push(`\`${field}\` = ?`);
          values.push(data[field]);
        }
      }

      if (queryParts.length === 0) {
        throw new BusinessError('No se especificaron parametros validos para actualizar.');
      }

      await adminRepository.protectedUpdateProtocolRules(queryParts, values, conn);

      await conn.commit();

      const beforeString = JSON.stringify(currentRules);
      const afterString = JSON.stringify({ ...currentRules, ...updates });
      const beforeHash = crypto.createHash('sha256').update(beforeString).digest('hex');
      const afterHash = crypto.createHash('sha256').update(afterString).digest('hex');

      await logSecurityEvent(
        user.id,
        'UPDATE_PROTOCOL_PARAMETERS',
        'HIGH',
        req,
        { updates, previous: currentRules, beforeHash, afterHash },
        'system',
        1
      );

      return { success: true, message: 'Parametros del protocolo actualizados con exito.', updates };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getSystemNavigation(user, req) {
    const items = await adminRepository.getSystemNavigationItems();
    await logSecurityEvent(
      user.id,
      'VIEW_SYSTEM_NAVIGATION',
      'LOW',
      req,
      {},
      'system',
      null
    );
    return items;
  }

  async reorderSystemNavigation(user, items, req) {
    if (!Array.isArray(items)) {
      throw new BusinessError('Debe proveer una lista de items de navegacion.');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await adminRepository.bulkUpdateNavigationOrders(items, conn);

      await conn.commit();

      await logSecurityEvent(
        user.id,
        'REORDER_SYSTEM_NAVIGATION',
        'HIGH',
        req,
        { items_count: items.length },
        'system',
        null
      );

      return { success: true, message: 'Orden de navegacion actualizado con exito.' };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async updateSystemNavigationItem(user, id, data, req) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query('SELECT * FROM system_navigation WHERE id = ?', [id]);
      const current = rows[0];
      if (!current) {
        throw new NotFoundError('Item de navegacion no encontrado.');
      }

      if (current.is_system === 1) {
        if (data.layout_scope && data.layout_scope !== current.layout_scope) {
          throw new BusinessError('No se permite alterar el layout_scope de un menu de sistema.');
        }
      }

      await adminRepository.updateSystemNavigationItem(id, data, conn);

      await conn.commit();

      await logSecurityEvent(
        user.id,
        'UPDATE_SYSTEM_NAVIGATION_ITEM',
        'HIGH',
        req,
        { id, updates: data, previous: current },
        'system',
        id
      );

      return { success: true, message: 'Item de navegacion actualizado con exito.' };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

module.exports = AdminSystemService;
