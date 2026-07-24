const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../../config/db');
const redisClient = require('../../../config/redis');
const authRepository = require('../auth.repository');
const { BusinessError, ForbiddenError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const AUTH_CONSTANTS = require('../auth.constants');
const resolveActorContext = require('../helpers/resolveActorContext');
const getOrCreateSessionStamp = require('../helpers/sessionStampHelper');

class AuthSessionService {
  constructor(authService) {
    this.authService = authService;
  }

  async login(email, password, req) {
    if (!email || !password) {
      throw new BusinessError('Email y contraseña son obligatorios');
    }

    const jwtSecret = await this.authService.getJWTSecret();

    // Consultar modo mantenimiento en Redis
    const isMaintenance = await redisClient.get('system:maintenance_mode');
    const maintenanceActive = isMaintenance === 'true' || isMaintenance === 'quiescing';

    // 1. Buscar en system_users
    const systemUser = await authRepository.findSystemUserByEmail(email);
    if (systemUser) {
      if (systemUser.estado !== 'activo') {
        await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'HIGH', req, { email, actorType: 'system_user', reason: 'Usuario del sistema inactivo' });
        throw new ForbiddenError('Cuenta inactiva');
      }

      if (systemUser.password_locked === 1) {
        await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'HIGH', req, { email, actorType: 'system_user', reason: 'Contraseña bloqueada' });
        throw new ForbiddenError('La contraseña de esta cuenta de sistema está bloqueada.');
      }

      const isMatch = await bcrypt.compare(password, systemUser.password_hash);
      if (!isMatch) {
        await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'HIGH', req, { email, actorType: 'system_user', reason: 'Contraseña incorrecta' });
        throw new BusinessError('Credenciales inválidas', 401);
      }

      const { permissions, permissionModes, roles } = await authRepository.getUserRolesAndPermissions('system_user', systemUser.id);
      const systemFlags = await this.authService.getSystemFlags();
      let stamp = await getOrCreateSessionStamp('system_user', systemUser.id);

      const tokenPayload = {
        id: systemUser.id,
        email: systemUser.email,
        rol: systemUser.nivel,
        actorType: 'system_user',
        nivel: systemUser.nivel,
        nombres: systemUser.nombres,
        apellidos: systemUser.apellidos,
        permissions,
        roles,
        session_stamp: stamp
      };

      const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: AUTH_CONSTANTS.JWT_EXPIRY });
      await logSecurityEvent(systemUser.id, 'SUCCESSFUL_LOGIN', 'LOW', req, { actorType: 'system_user' });

      return {
        token,
        user: {
          id: systemUser.id,
          email: systemUser.email,
          nombre: `${systemUser.nombres || ''} ${systemUser.apellidos || ''}`.trim(),
          nombres: systemUser.nombres,
          apellidos: systemUser.apellidos,
          rol: systemUser.nivel,
          actorType: 'system_user',
          permissions,
          permissionModes,
          systemFlags,
          roles
        }
      };
    }

    // Rechazar accesos no autorizados durante el mantenimiento
    if (maintenanceActive) {
      await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'HIGH', req, {
        email,
        actorType: 'external',
        reason: 'Intento de login de usuario común u operador durante mantenimiento'
      });
      throw new ForbiddenError('El sistema está en mantenimiento. Solo se permite el acceso a personal autorizado.');
    }

    // 2. Buscar en store_operators
    const operator = await authRepository.findOperatorByEmail(email);
    if (operator) {
      if (operator.estado !== 'activo') {
        await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, actorType: 'operator', reason: 'Cuenta de operador inactiva' });
        throw new ForbiddenError('Cuenta inactiva');
      }

      const isMatch = await bcrypt.compare(password, operator.password_hash);
      if (!isMatch) {
        await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, actorType: 'operator', reason: 'Contraseña incorrecta' });
        throw new BusinessError('Credenciales inválidas', 401);
      }

      const { permissions, permissionModes, roles } = await authRepository.getUserRolesAndPermissions('operator', operator.id);
      const systemFlags = await this.authService.getSystemFlags();
      let stamp = await getOrCreateSessionStamp('operator', operator.id);

      const tokenPayload = {
        id: operator.id,
        email: operator.email,
        rol: 'operator',
        actorType: 'operator',
        storeId: operator.store_id,
        storeIds: [operator.store_id],
        nombres: operator.nombres,
        apellidos: operator.apellidos,
        permissions,
        roles,
        session_stamp: stamp
      };

      const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: AUTH_CONSTANTS.JWT_EXPIRY });
      await logSecurityEvent(operator.id, 'SUCCESSFUL_LOGIN', 'LOW', req, { actorType: 'operator' });

      return {
        token,
        user: {
          id: operator.id,
          email: operator.email,
          nombre: `${operator.nombres || ''} ${operator.apellidos || ''}`.trim(),
          nombres: operator.nombres,
          apellidos: operator.apellidos,
          rol: 'operator',
          actorType: 'operator',
          storeId: operator.store_id,
          storeIds: [operator.store_id],
          permissions,
          permissionModes,
          systemFlags,
          roles
        }
      };
    }

    // 3. Buscar en users
    const user = await authRepository.findUserByEmail(email);
    if (user) {
      if (user.estado !== 'activo') {
        await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, actorType: 'user', reason: 'Cuenta inactiva o bloqueada' });
        throw new ForbiddenError('Cuenta inactiva o bloqueada');
      }

      if (user.password_locked === 1) {
        await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, actorType: 'user', reason: 'Contraseña bloqueada' });
        throw new ForbiddenError('La contraseña de esta cuenta está bloqueada.');
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, actorType: 'user', reason: 'Contraseña incorrecta' });
        throw new BusinessError('Credenciales inválidas', 401);
      }

      const { permissions, permissionModes, roles } = await authRepository.getUserRolesAndPermissions('user', user.id);
      const systemFlags = await this.authService.getSystemFlags();

      const actorCtx = await resolveActorContext(user);
      const commerceId = actorCtx.commerceId;
      const storeIds = actorCtx.storeIds;
      const deliveryCompanyId = actorCtx.deliveryCompanyId;
      const adminType = actorCtx.adminType;

      let stamp = await getOrCreateSessionStamp('user', user.id);

      const tokenPayload = {
        id: user.id,
        email: user.email,
        rol: user.rol,
        actorType: 'user',
        adminType,
        es_repartidor: user.es_repartidor,
        repartidor_activo: user.repartidor_activo,
        permissions,
        roles,
        commerceId,
        storeIds,
        deliveryCompanyId,
        session_stamp: stamp
      };

      const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: AUTH_CONSTANTS.JWT_EXPIRY });
      await logSecurityEvent(user.id, 'SUCCESSFUL_LOGIN', 'LOW', req, { actorType: 'user' });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || process.env.APP_DISPLAY_NAME || 'Usuario',
          nombres: user.nombres,
          apellidos: user.apellidos,
          telefono: user.telefono,
          rol: user.rol,
          actorType: 'user',
          adminType,
          es_repartidor: user.es_repartidor,
          repartidor_activo: user.repartidor_activo,
          permissions,
          permissionModes,
          systemFlags,
          roles,
          commerceId,
          storeIds,
          deliveryCompanyId
        }
      };
    }

    // 4. Si ninguno existe
    await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, reason: 'Usuario no encontrado' });
    throw new BusinessError('Credenciales inválidas', 401);
  }

  async refreshSession(userContext, req = null) {
    const { id: userId, actorType } = userContext;
    await logSecurityEvent(userId, 'SESSION_REFRESHED', 'LOW', req, { actorType });
    let userRecord = null;
    let permissions = [];
    let permissionModes = {};
    let roles = [];
    let tokenPayload = {};

    const rbacData = await authRepository.getUserRolesAndPermissions(actorType, userId);
    permissions = rbacData.permissions;
    permissionModes = rbacData.permissionModes;
    roles = rbacData.roles;
    const systemFlags = await this.authService.getSystemFlags();

    if (actorType === 'user') {
      userRecord = await authRepository.findUserById(userId);
      if (!userRecord || userRecord.estado !== 'activo') {
        throw new ForbiddenError('Usuario inactivo o no encontrado.');
      }

      const actorCtx = await resolveActorContext(userRecord);
      const commerceId = actorCtx.commerceId;
      const storeIds = actorCtx.storeIds;
      const deliveryCompanyId = actorCtx.deliveryCompanyId;
      const adminType = actorCtx.adminType;

      tokenPayload = {
        id: userRecord.id,
        email: userRecord.email,
        rol: userRecord.rol,
        actorType: 'user',
        adminType,
        es_repartidor: userRecord.es_repartidor,
        repartidor_activo: userRecord.repartidor_activo,
        permissions,
        roles,
        commerceId,
        storeIds,
        deliveryCompanyId
      };

    } else if (actorType === 'operator') {
      userRecord = await authRepository.findOperatorById(userId);
      if (!userRecord || userRecord.estado !== 'activo') {
        throw new ForbiddenError('Operador inactivo o no encontrado.');
      }

      tokenPayload = {
        id: userRecord.id,
        email: userRecord.email,
        rol: 'operator',
        actorType: 'operator',
        storeId: userRecord.store_id,
        storeIds: [userRecord.store_id],
        nombres: userRecord.nombres,
        apellidos: userRecord.apellidos,
        permissions,
        roles
      };

    } else if (actorType === 'system_user') {
      userRecord = await authRepository.findSystemUserById(userId);
      if (!userRecord || userRecord.estado !== 'activo') {
        throw new ForbiddenError('Usuario de sistema inactivo o no encontrado.');
      }

      tokenPayload = {
        id: userRecord.id,
        email: userRecord.email,
        rol: userRecord.nivel,
        actorType: 'system_user',
        nivel: userRecord.nivel,
        nombres: userRecord.nombres,
        apellidos: userRecord.apellidos,
        permissions,
        roles
      };
    } else {
      throw new BusinessError('Tipo de actor inválido para refresco de sesión.');
    }

    let stamp = await getOrCreateSessionStamp(actorType, userId);
    tokenPayload.session_stamp = stamp;

    const jwtSecret = await this.authService.getJWTSecret();
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: AUTH_CONSTANTS.JWT_EXPIRY });

    return {
      token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        nombre: `${userRecord.nombres || ''} ${userRecord.apellidos || ''}`.trim() || process.env.APP_DISPLAY_NAME || 'Usuario',
        nombres: userRecord.nombres,
        apellidos: userRecord.apellidos,
        rol: tokenPayload.rol,
        actorType,
        permissions,
        permissionModes,
        systemFlags,
        roles,
        ...(actorType === 'user' ? {
          adminType: tokenPayload.adminType,
          commerceId: tokenPayload.commerceId,
          storeIds: tokenPayload.storeIds,
          deliveryCompanyId: tokenPayload.deliveryCompanyId
        } : {}),
        ...(actorType === 'operator' ? {
          storeId: userRecord.store_id,
          storeIds: [userRecord.store_id]
        } : {})
      }
    };
  }

  async resetPassword(token, newPassword, req) {
    if (!token || !newPassword) {
      throw new BusinessError('El token y la nueva contraseña son obligatorios.');
    }

    const userIdStr = await redisClient.get(`password_reset:${token}`);
    if (!userIdStr) {
      throw new BusinessError('El enlace de recuperación es inválido o ha expirado.');
    }

    const userId = Number(userIdStr);

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    await redisClient.del(`password_reset:${token}`);

    await logSecurityEvent(
      userId,
      'PASSWORD_RESET_SUCCESSFUL',
      'MEDIUM',
      req,
      { userId },
      'user',
      userId
    );

    return { success: true, message: 'Contraseña restablecida con éxito.' };
  }
}

module.exports = AuthSessionService;
