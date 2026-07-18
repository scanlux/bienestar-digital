const db = require('../../../config/db');
const { BusinessError, ForbiddenError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class DeclareReserve {
  async execute(userContext, data, req) {
    if (userContext.actorType !== 'system_user') {
      throw new ForbiddenError('Acceso denegado: Solo usuarios de sistema pueden declarar la reserva bancaria.');
    }

    const { reservaCop, notas } = data;
    if (reservaCop === undefined || reservaCop < 0) {
      throw new BusinessError('reservaCop es requerido y debe ser mayor o igual a cero.');
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        'INSERT INTO domi_reserve_declarations (reserva_cop, declared_by, fecha_declaracion, notas) VALUES (?, ?, CURDATE(), ?)',
        [reservaCop, userContext.id, notas || null]
      );

      // Registrar evento de seguridad de auditoría
      await logSecurityEvent(userContext.id, 'DOMI_RESERVE_DECLARED', 'HIGH', req, {
        operatorId: userContext.id,
        reservaCop,
        notas
      });

      await conn.commit();
      return {
        success: true,
        message: `Reserva bancaria declarada exitosamente en $${parseFloat(reservaCop).toLocaleString()} COP.`,
        reservaCop
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new DeclareReserve();
