const db = require('../../../config/db');
const domiRepository = require('../domi.repository');
const domiEngine = require('../../../services/domiEngine');
const domiTreasuryEngine = require('../../../services/domiTreasuryEngine');
const { BusinessError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const MintDomis = require('../use-cases/MintDomis');
const DeclareReserve = require('../use-cases/DeclareReserve');
const ApplyPegAdjustment = require('../use-cases/ApplyPegAdjustment');

class DomiTreasuryService {
  constructor(domiService) {
    this.domiService = domiService;
  }

  async getTokenRegistry() {
    const registry = await domiRepository.findTokenRegistry();
    if (!registry) {
      throw new BusinessError('Token no configurado', 500);
    }
    return registry;
  }

  async getProtocolRules() {
    const rules = await domiRepository.findProtocolRules();
    if (!rules) {
      throw new BusinessError('Reglas no configuradas', 500);
    }
    return rules;
  }

  async calculateOrderCost(totalCop, distanceKm) {
    if (!totalCop || totalCop <= 0) {
      throw new BusinessError('totalCop es requerido y debe ser positivo');
    }
    return await domiEngine.calculateOrderCost(totalCop, distanceKm);
  }

  async getPricingStatus() {
    const conn = await db.getConnection();
    try {
      return await domiTreasuryEngine.getTreasuryStatus(conn);
    } finally {
      conn.release();
    }
  }

  async getPricingHistory(userContext, req = null) {
    await logSecurityEvent(userContext.id, 'VIEW_PRICING_HISTORY', 'LOW', req);
    const conn = await db.getConnection();
    try {
      const [history] = await conn.query('SELECT * FROM domi_peg_history ORDER BY id DESC LIMIT 100');
      return history;
    } finally {
      conn.release();
    }
  }

  async getRevenueBreakdown(userContext, from, to) {
    const conn = await db.getConnection();
    try {
      return await domiTreasuryEngine.getRevenueBreakdown(conn, from, to);
    } finally {
      conn.release();
    }
  }

  async getDailyBurnStats(userContext, days) {
    const conn = await db.getConnection();
    try {
      return await domiTreasuryEngine.getDailyBurnStats(conn, parseInt(days || 30, 10));
    } finally {
      conn.release();
    }
  }

  async proposeYieldAdjustment(userContext, data) {
    const { certifiedYieldCop, investedPeriodDays } = data;
    if (certifiedYieldCop === undefined || certifiedYieldCop < 0) {
      throw new BusinessError('certifiedYieldCop es requerido y debe ser mayor o igual a cero.');
    }
    if (!investedPeriodDays || investedPeriodDays <= 0) {
      throw new BusinessError('investedPeriodDays es requerido y debe ser positivo.');
    }
    const conn = await db.getConnection();
    try {
      return await domiTreasuryEngine.evaluateYieldAdjustment(conn, parseFloat(certifiedYieldCop), parseInt(investedPeriodDays, 10));
    } finally {
      conn.release();
    }
  }

  async applyNewPeg(userContext, data, req) {
    return await ApplyPegAdjustment.applyNewPeg(userContext, data, req);
  }

  async applyYieldAdjustment(userContext, data, req) {
    return await ApplyPegAdjustment.applyYieldAdjustment(userContext, data, req);
  }

  async getTierRules() {
    const conn = await db.getConnection();
    try {
      const [rules] = await conn.query('SELECT * FROM domi_tier_rules');
      return rules;
    } finally {
      conn.release();
    }
  }

  async updateTierRules(userContext, tier, data, req = null) {
    const {
      max_balance_domi,
      large_withdrawal_threshold_domi,
      cooldown_days,
      free_withdrawals_per_month,
      withdrawal_fee_cop,
      daily_withdrawal_limit_cop
    } = data;

    const conn = await db.getConnection();
    try {
      await conn.query(`
        UPDATE domi_tier_rules 
        SET max_balance_domi = ?, 
            large_withdrawal_threshold_domi = ?, 
            cooldown_days = ?, 
            free_withdrawals_per_month = ?, 
            withdrawal_fee_cop = ?, 
            daily_withdrawal_limit_cop = ?
        WHERE tier = ?
      `, [
        max_balance_domi,
        large_withdrawal_threshold_domi,
        cooldown_days,
        free_withdrawals_per_month,
        withdrawal_fee_cop,
        daily_withdrawal_limit_cop,
        tier
      ]);

      await logSecurityEvent(
        userContext.id,
        'DOMI_TIER_RULES_UPDATED',
        'HIGH',
        req,
        { tier, max_balance_domi, daily_withdrawal_limit_cop }
      );

      return { success: true, tier };
    } finally {
      conn.release();
    }
  }

  async approveExcessPurchase(userContext, data, req = null) {
    const { walletId } = data;
    const conn = await db.getConnection();
    try {
      await conn.query('UPDATE wallets SET excess_purchase_approved = 1 WHERE id = ?', [walletId]);

      await logSecurityEvent(
        userContext.id,
        'EXCESS_PURCHASE_APPROVED',
        'HIGH',
        req,
        { walletId },
        'wallet',
        walletId
      );

      return { success: true, walletId };
    } finally {
      conn.release();
    }
  }

  async mintCash(userContext, data, req) {
    return await MintDomis.mintCash(userContext, data, req);
  }

  async confirmCashMint(userContext, packageId, req) {
    return await MintDomis.confirmCashMint(userContext, packageId, req);
  }

  async declareReserve(userContext, data, req) {
    return await DeclareReserve.execute(userContext, data, req);
  }
}

module.exports = DomiTreasuryService;
