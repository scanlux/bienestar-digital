const db = require('../../../config/db');
const redisClient = require('../../../config/redis');
const domiTreasuryEngine = require('../../../services/domiTreasuryEngine');
const { BusinessError, ForbiddenError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class ApplyPegAdjustment {
  async applyNewPeg(userContext, data, req) {
    if (userContext.actorType !== 'system_user') {
      throw new ForbiddenError('Acceso denegado: Solo el administrador puede aplicar ajustes de peg.');
    }

    const { newPegCop, reason } = data;
    if (!newPegCop || newPegCop <= 0) {
      throw new BusinessError('El nuevo peg debe ser un numero positivo mayor a cero.', 400);
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[token]] = await conn.query('SELECT fiat_peg_cop FROM token_registry WHERE id = 1');
      const prevPeg = parseFloat(token.fiat_peg_cop);
      const delta = prevPeg > 0 ? ((newPegCop - prevPeg) / prevPeg) * 100 : 0;

      const status = await domiTreasuryEngine.getTreasuryStatus(conn);

      await conn.query('SET @domi_bypass_security = 1');
      await conn.query('UPDATE token_registry SET fiat_peg_cop = ? WHERE id = 1', [newPegCop]);
      await conn.query('SET @domi_bypass_security = NULL');

      const effectiveDate = new Date().toISOString().split('T')[0];
      await conn.query(`
        INSERT INTO domi_peg_history 
        (effective_date, fiat_peg_cop, prev_fiat_peg_cop, delta_percentage, trigger_reason, reserve_cop_at_time, tokens_supply_at_time, approved_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        effectiveDate, 
        newPegCop, 
        prevPeg, 
        delta, 
        reason === 'sobrecolateralizacion' ? 'sobrecolateralizacion' : 'manual_admin', 
        status.reserva_cop, 
        status.circulante_oficial, 
        userContext.id, 
        `Ajuste de peg a ${newPegCop} COP. Razon: ${reason || 'manual_admin'}`
      ]);

      await conn.commit();

      if (redisClient && redisClient.isOpen) {
        await redisClient.del('domi:token_registry');
        await redisClient.del('domi:fiat_peg_cop');
      }

      await logSecurityEvent(userContext.id, 'DOMI_MANUAL_PEG_ADJUSTMENT', 'CRITICAL', req, {
        operatorId: userContext.id,
        newPeg: newPegCop,
        prevPeg,
        delta,
        reason: reason || 'manual_admin'
      });

      return { success: true, prevPeg, newPeg: newPegCop, delta };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async applyYieldAdjustment(userContext, data, req) {
    if (userContext.actorType !== 'system_user') {
      throw new ForbiddenError('Acceso denegado: Solo usuarios de sistema pueden aplicar ajustes de peg.');
    }

    const { certifiedYieldCop, investedPeriodDays } = data;
    if (certifiedYieldCop === undefined || certifiedYieldCop < 0) {
      throw new BusinessError('certifiedYieldCop es requerido y debe ser mayor o igual a cero.');
    }
    if (!investedPeriodDays || investedPeriodDays <= 0) {
      throw new BusinessError('investedPeriodDays es requerido y debe ser positivo.');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const simulation = await domiTreasuryEngine.evaluateYieldAdjustment(conn, parseFloat(certifiedYieldCop), parseInt(investedPeriodDays));
      if (!simulation.ok) {
        throw new BusinessError(simulation.detail, 400);
      }

      const newPeg = parseFloat(simulation.peg_propuesto.toFixed(8));
      const prevPeg = parseFloat(simulation.peg_actual);
      const delta = simulation.rendimiento_mensual_propuesto * (investedPeriodDays / 30.0) * 100;

      await conn.query('SET @domi_bypass_security = 1');
      await conn.query('UPDATE token_registry SET fiat_peg_cop = ? WHERE id = 1', [newPeg]);
      await conn.query('SET @domi_bypass_security = NULL');

      const status = await domiTreasuryEngine.getTreasuryStatus(conn);

      const effectiveDate = new Date().toISOString().split('T')[0];
      await conn.query(`
        INSERT INTO domi_peg_history 
        (effective_date, fiat_peg_cop, prev_fiat_peg_cop, delta_percentage, trigger_reason, reserve_cop_at_time, tokens_supply_at_time, approved_by, notes)
        VALUES (?, ?, ?, ?, 'inversion_rendimiento', ?, ?, ?, ?)
      `, [
        effectiveDate, 
        newPeg, 
        prevPeg, 
        delta, 
        status.reserva_cop, 
        status.circulante_oficial, 
        userContext.id, 
        `Ajuste por rendimiento de inversiones: yield=${certifiedYieldCop} COP, period=${investedPeriodDays} dias.`
      ]);

      await conn.commit();

      if (redisClient && redisClient.isOpen) {
        await redisClient.del('domi:token_registry');
        await redisClient.del('domi:fiat_peg_cop');
      }

      await logSecurityEvent(userContext.id, 'DOMI_MANUAL_PEG_ADJUSTMENT', 'CRITICAL', req, {
        operatorId: userContext.id,
        newPeg,
        prevPeg,
        delta,
        reason: 'inversion_rendimiento'
      });

      return {
        success: true,
        message: `Ajuste de peg por rendimiento aplicado con éxito. Nuevo peg: ${newPeg} COP.`,
        prevPeg,
        newPeg,
        delta
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new ApplyPegAdjustment();
