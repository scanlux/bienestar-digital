const db = require('../../../config/db');
const userRepository = require('../user.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const bcrypt = require('bcryptjs');

class UserFinancialService {
  constructor(userService) {
    this.userService = userService;
  }

  async setFinancialPin(userContext, data, req) {
    const { currentPassword, financialPin } = data;
    if (!currentPassword || !financialPin) {
      throw new BusinessError('La contraseña actual y el nuevo PIN financiero de 6 dígitos son obligatorios.');
    }

    if (!/^\d{6}$/.test(String(financialPin))) {
      throw new BusinessError('El PIN financiero debe ser un código numérico exacto de 6 dígitos.');
    }

    const user = await userRepository.findUserWithPinHash(userContext.id);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    // Validar contraseña
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordMatch) {
      await logSecurityEvent(userContext.id, 'FINANCIAL_PIN_SETUP_FAIL', 'MEDIUM', req, {
        reason: 'Contraseña incorrecta al intentar configurar el PIN financiero'
      });
      throw new ForbiddenError('La contraseña ingresada es incorrecta.');
    }

    // Generar hash bcrypt del PIN
    const pinHash = await bcrypt.hash(String(financialPin), 10);
    await userRepository.updateUserFinancialPin(userContext.id, pinHash);

    await logSecurityEvent(userContext.id, 'FINANCIAL_PIN_UPDATED', 'HIGH', req, {
      message: 'PIN financiero configurado o actualizado exitosamente.'
    });

    return { success: true, message: 'PIN financiero guardado con éxito.' };
  }

  async unlockFinancialPin(userContext, targetUserId, req) {
    // Verificar que el usuario en sesión sea administrador
    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && userContext.rol !== 'admin') {
      throw new ForbiddenError('No tienes privilegios para desbloquear cuentas de operadores.');
    }

    const targetUser = await userRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Usuario a desbloquear no encontrado.');
    }

    await userRepository.resetFinancialPinAttempts(targetUserId);

    await logSecurityEvent(userContext.id, 'FINANCIAL_PIN_UNLOCKED', 'HIGH', req, {
      message: `El administrador desbloqueó el PIN del usuario id ${targetUserId}`,
      targetUserEmail: targetUser.email
    });

    return { success: true, message: 'PIN financiero desbloqueado con éxito.' };
  }

  async generateResetPinLink(userContext, targetUserId, req) {
    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && userContext.rol !== 'admin') {
      throw new ForbiddenError('No tienes privilegios para restablecer cuentas de operadores.');
    }

    const targetUser = await userRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    // Generamos un token temporal
    const token = require('crypto').randomBytes(20).toString('hex');
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-pin?token=${token}&userId=${targetUserId}`;

    // Simulamos el envío por correo escribiéndolo en logs por seguridad y auditoría
    const emailService = require('../../../services/emailService');
    await emailService.sendMail({
      to: targetUser.email,
      subject: 'Restablecimiento de PIN Financiero - Bienestar Digital',
      text: `Se ha generado un enlace para restablecer tu PIN financiero.\n\nEnlace: ${resetUrl}\n\nSi no solicitaste esto, contacta de inmediato al administrador de seguridad.`,
      html: `
        <div style="font-family: sans-serif; padding: 2rem; color: #1e293b;">
          <h2>Restablecimiento de PIN Financiero</h2>
          <p>Un administrador ha generado un enlace para que configures nuevamente tu PIN financiero de 6 dígitos.</p>
          <p style="margin: 2rem 0;">
            <a href="${resetUrl}" style="background-color: #10b981; color: #000; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Restablecer mi PIN
            </a>
          </p>
          <p style="font-size: 0.8rem; color: #64748b;">Si el botón no funciona, copia y pega esta URL en tu navegador: <br/> ${resetUrl}</p>
        </div>
      `
    });

    await logSecurityEvent(userContext.id, 'FINANCIAL_PIN_RESET_LINK_SENT', 'HIGH', req, {
      message: `Enlace de restablecimiento de PIN generado para usuario id ${targetUserId}`,
      targetUserEmail: targetUser.email
    });

    return { success: true, message: 'Enlace de restablecimiento enviado exitosamente.', resetUrl };
  }
}

module.exports = UserFinancialService;
