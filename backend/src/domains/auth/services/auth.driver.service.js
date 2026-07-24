const jwt = require('jsonwebtoken');
const authRepository = require('../auth.repository');
const { BusinessError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const AUTH_CONSTANTS = require('../auth.constants');
const getOrCreateSessionStamp = require('../helpers/sessionStampHelper');

class AuthDriverService {
  constructor(authService) {
    this.authService = authService;
  }

  async activateDriver(userContext, aceptarTerminos, req) {
    const userId = userContext.id;

    if (!aceptarTerminos) {
      throw new BusinessError('Debe aceptar los términos y condiciones de repartidor.');
    }

    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    if (user.rol !== 'customer') {
      throw new BusinessError('Solo los usuarios con rol customer pueden activar el modo repartidor.');
    }

    await authRepository.updateDriverStatus(userId, 1, 1);
    await logSecurityEvent(userId, 'DRIVER_MODE_ACTIVATED', 'MEDIUM', req, { email: user.email });

    const profile = await authRepository.findUserProfile(userId);
    const { permissions, roles } = await authRepository.getUserRolesAndPermissions('user', userId);

    let stamp = await getOrCreateSessionStamp('user', userId);

    const jwtSecret = await this.authService.getJWTSecret();
    const token = jwt.sign(
      { 
        id: userId, 
        email: userContext.email, 
        rol: 'customer', 
        es_repartidor: 1, 
        repartidor_activo: 1,
        permissions, 
        roles,
        commerceId: null, 
        storeIds: [],
        session_stamp: stamp
      },
      jwtSecret,
      { expiresIn: AUTH_CONSTANTS.JWT_EXPIRY }
    );

    return {
      message: 'Modo repartidor activado exitosamente.',
      token,
      user: {
        id: userId,
        email: userContext.email,
        nombre: `${profile.nombres || ''} ${profile.apellidos || ''}`.trim() || process.env.APP_DISPLAY_NAME || 'Usuario',
        rol: 'customer',
        es_repartidor: 1,
        repartidor_activo: 1,
        permissions
      }
    };
  }

  async driverStatus(userContext, activo, req) {
    const userId = userContext.id;

    if (activo === undefined) {
      throw new BusinessError('Debe proveer el estado del turno (activo: true/false).');
    }

    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    if (user.es_repartidor !== 1) {
      throw new BusinessError('El usuario no tiene el modo repartidor habilitado.');
    }

    const statusVal = activo ? 1 : 0;
    await authRepository.updateDriverStatus(userId, 1, statusVal);
    await logSecurityEvent(
      userId,
      activo ? 'DRIVER_SHIFT_STARTED' : 'DRIVER_SHIFT_ENDED',
      'LOW',
      req,
      { email: user.email }
    );

    return {
      message: `Turno de repartidor ${activo ? 'iniciado' : 'finalizado'} exitosamente.`,
      repartidor_activo: statusVal
    };
  }
}

module.exports = AuthDriverService;
