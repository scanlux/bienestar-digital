const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const db = require('../../config/db');
const authRepository = require('./auth.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const sessionStampService = require('../../services/sessionStampService');
const redisClient = require('../../config/redis');

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'domi-app-usr'
  });
}

class AuthService {
  async getSystemFlags() {
    try {
      const [flagRows] = await db.query('SELECT `key`, `enabled` FROM system_financial_flags');
      return Object.fromEntries(flagRows.map(f => [f.key, f.enabled === 1]));
    } catch (err) {
      console.error('Error fetching system flags:', err);
      return {};
    }
  }

  async getJWTSecret() {
    if (!process.env.JWT_SECRET) {
      throw new Error('[CRITICAL] JWT_SECRET no está configurada en las variables de entorno.');
    }
    return process.env.JWT_SECRET;
  }

  async login(email, password, req) {
    if (!email || !password) {
      throw new BusinessError('Email y contraseña son obligatorios');
    }

    const jwtSecret = await this.getJWTSecret();

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
      const systemFlags = await this.getSystemFlags();
      let stamp = await sessionStampService.getStamp('system_user', systemUser.id);
      if (!stamp) {
        stamp = await sessionStampService.setStamp('system_user', systemUser.id);
      }

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

      const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '8h' });
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
      const systemFlags = await this.getSystemFlags();
      let stamp = await sessionStampService.getStamp('operator', operator.id);
      if (!stamp) {
        stamp = await sessionStampService.setStamp('operator', operator.id);
      }

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

      const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '8h' });
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
      const systemFlags = await this.getSystemFlags();

      let commerceId = null;
      let storeIds = [];
      let deliveryCompanyId = null;
      let adminType = null;

      if (user.rol === 'admin') {
        if (user.commerce_id) {
          adminType = 'commerce';
          commerceId = user.commerce_id;
          storeIds = await authRepository.findStoresByCommerceId(commerceId);
        } else if (user.store_id) {
          adminType = 'store';
          commerceId = user.store_commerce_id;
          storeIds = [user.store_id];
        } else if (user.delivery_company_id) {
          adminType = 'delivery_company';
          deliveryCompanyId = user.delivery_company_id;
        }
      }

      let stamp = await sessionStampService.getStamp('user', user.id);
      if (!stamp) {
        stamp = await sessionStampService.setStamp('user', user.id);
      }

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

      const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '8h' });
      await logSecurityEvent(user.id, 'SUCCESSFUL_LOGIN', 'LOW', req, { actorType: 'user' });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Usuario Focnius',
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

  async tokenSync(email, firebaseUid, firebaseIdToken, req) {
    if (!email || !firebaseUid) {
      throw new BusinessError('Email y UID son obligatorios');
    }

    if (!firebaseIdToken) {
      throw new BusinessError('Token de Firebase es obligatorio para la sincronización');
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      if (decodedToken.uid !== firebaseUid) {
        await logSecurityEvent(null, 'MALICIOUS_TOKEN_SYNC_ATTEMPT', 'CRITICAL', req, {
          email,
          reason: 'Firebase UID mismatch with ID token'
        });
        throw new BusinessError('El UID del token de Firebase no coincide con el UID provisto', 401);
      }
    } catch (firebaseErr) {
      await logSecurityEvent(null, 'FAILED_TOKEN_SYNC', 'HIGH', req, {
        email,
        reason: 'Error al verificar token con Firebase: ' + firebaseErr.message
      });
      throw new BusinessError('Token de Firebase inválido o expirado: ' + firebaseErr.message, 401);
    }

    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, type: 'mobile_sync', reason: 'Usuario no encontrado' });
      throw new NotFoundError('Usuario no sincronizado en base de datos local');
    }

    if (user.estado !== 'activo') {
      await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, type: 'mobile_sync', reason: 'Cuenta inactiva o bloqueada' });
      throw new ForbiddenError('Cuenta inactiva o bloqueada');
    }

    const isMatch = await bcrypt.compare(firebaseUid, user.password_hash);
    if (!isMatch) {
      await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'HIGH', req, { email, type: 'mobile_sync', reason: 'Fallo de autenticación del token móvil' });
      throw new BusinessError('Fallo de autenticación del token móvil', 401);
    }

    const { permissions, permissionModes, roles } = await authRepository.getUserRolesAndPermissions('user', user.id);
    const systemFlags = await this.getSystemFlags();

    let commerceId = null;
    let storeIds = [];
    let deliveryCompanyId = null;
    let adminType = null;

    if (user.rol === 'admin') {
      if (user.commerce_id) {
        adminType = 'commerce';
        commerceId = user.commerce_id;
        storeIds = await authRepository.findStoresByCommerceId(commerceId);
      } else if (user.store_id) {
        adminType = 'store';
        commerceId = user.store_commerce_id;
        storeIds = [user.store_id];
      } else if (user.delivery_company_id) {
        adminType = 'delivery_company';
        deliveryCompanyId = user.delivery_company_id;
      }
    }

    const jwtSecret = await this.getJWTSecret();
    let stamp = await sessionStampService.getStamp('user', user.id);
    if (!stamp) {
      stamp = await sessionStampService.setStamp('user', user.id);
    }

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

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '8h' });

    await logSecurityEvent(user.id, 'SUCCESSFUL_LOGIN', 'LOW', req, { type: 'mobile_sync' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Usuario Focnius',
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

  async mobileRegister(email, nombre, firebaseUid, firebaseIdToken, req) {
    if (!email || !firebaseUid) {
      throw new BusinessError('Email y UID son obligatorios');
    }

    if (!firebaseIdToken) {
      await logSecurityEvent(null, 'FAILED_TOKEN_SYNC', 'HIGH', req, {
        email,
        reason: 'Token de Firebase faltante en el registro móvil'
      });
      throw new BusinessError('Token de Firebase es obligatorio para registrarse');
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      if (decodedToken.uid !== firebaseUid) {
        await logSecurityEvent(null, 'FAILED_TOKEN_SYNC', 'HIGH', req, {
          email,
          reason: 'Firebase UID mismatch with ID token in mobileRegister'
        });
        throw new BusinessError('El UID del token de Firebase no coincide con el UID provisto', 401);
      }
    } catch (firebaseErr) {
      await logSecurityEvent(null, 'FAILED_TOKEN_SYNC', 'HIGH', req, {
        email,
        reason: 'Error al verificar token con Firebase en registro: ' + firebaseErr.message
      });
      throw new BusinessError('Token de Firebase inválido o expirado: ' + firebaseErr.message, 401);
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const existing = await authRepository.findUserMinByEmail(email, connection);
      if (existing) {
        await connection.commit();
        connection.release();
        return { message: 'Usuario ya sincronizado', user: existing };
      }

      const parts = (nombre || 'Usuario Focnius').trim().split(/\s+/);
      const nombres = parts.slice(0, -1).join(' ') || parts[0];
      const apellidos = parts.length > 1 ? parts[parts.length - 1] : '';

      const dummyHash = await bcrypt.hash(firebaseUid, 10);
      const userId = await authRepository.insertUser(email, dummyHash, 'customer', 'activo', connection);

      await authRepository.insertProfile(
        userId,
        nombres,
        apellidos,
        `REG_${userId}`,
        `300${String(userId).padStart(7, '0')}`,
        connection
      );

      await connection.commit();
      connection.release();

      return {
        message: 'Usuario sincronizado exitosamente',
        user: { id: userId, email, rol: 'customer' }
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async checkUser(email) {
    if (!email) {
      throw new BusinessError('Email es obligatorio');
    }
    const user = await authRepository.findUserMinByEmail(email);
    return { exists: !!user };
  }

  async mobileRegisterFull(data) {
    const { email, nombres, apellidos, nombre, cedula, celular, firebaseUid, password, direccion, latitud, longitud } = data;

    if (!email || !direccion || !celular) {
      throw new BusinessError('Faltan datos obligatorios del perfil');
    }

    if (!firebaseUid && !password) {
      throw new BusinessError('Debe proveer firebaseUid o contraseña');
    }

    let dbNombres = nombres;
    let dbApellidos = apellidos;

    if (!dbNombres && nombre) {
      const parts = nombre.trim().split(/\s+/);
      dbNombres = parts.slice(0, -1).join(' ') || parts[0];
      dbApellidos = parts.length > 1 ? parts[parts.length - 1] : '';
    }

    dbNombres = dbNombres || 'Usuario';
    dbApellidos = dbApellidos || 'Focnius';

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const existing = await authRepository.findUserMinByEmail(email, connection);
      let userId;

      if (existing) {
        userId = existing.id;
        await authRepository.updateProfile(userId, dbNombres, dbApellidos, cedula || `REG_${userId}`, celular, connection);
      } else {
        let hash;
        if (firebaseUid) {
          hash = await bcrypt.hash(firebaseUid, 10);
        } else {
          hash = await bcrypt.hash(password, 10);
        }

        userId = await authRepository.insertUser(email, hash, 'customer', 'activo', connection);
        await authRepository.insertProfile(userId, dbNombres, dbApellidos, cedula || `REG_${userId}`, celular, connection);
      }

      await authRepository.insertUserAddress(userId, 'Casa', direccion, latitud || null, longitud || null, true, connection);

      await connection.commit();
      connection.release();

      return {
        message: 'Perfil completado exitosamente',
        user: {
          id: userId,
          email,
          nombre: `${dbNombres} ${dbApellidos}`.trim(),
          nombres: dbNombres,
          apellidos: dbApellidos,
          telefono: celular,
          cedula_numero: cedula,
          rol: 'customer'
        }
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
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

    let stamp = await sessionStampService.getStamp('user', userId);
    if (!stamp) {
      stamp = await sessionStampService.setStamp('user', userId);
    }

    const jwtSecret = await this.getJWTSecret();
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
      { expiresIn: '8h' }
    );

    return {
      message: 'Modo repartidor activado exitosamente.',
      token,
      user: {
        id: userId,
        email: userContext.email,
        nombre: `${profile.nombres || ''} ${profile.apellidos || ''}`.trim() || 'Usuario Focnius',
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

  async refreshSession(userContext) {
    const { id: userId, actorType } = userContext;
    let userRecord = null;
    let permissions = [];
    let permissionModes = {};
    let roles = [];
    let tokenPayload = {};

    const rbacData = await authRepository.getUserRolesAndPermissions(actorType, userId);
    permissions = rbacData.permissions;
    permissionModes = rbacData.permissionModes;
    roles = rbacData.roles;
    const systemFlags = await this.getSystemFlags();

    if (actorType === 'user') {
      userRecord = await authRepository.findUserById(userId);
      if (!userRecord || userRecord.estado !== 'activo') {
        throw new ForbiddenError('Usuario inactivo o no encontrado.');
      }

      let commerceId = null;
      let storeIds = [];
      let deliveryCompanyId = null;
      let adminType = null;

      if (userRecord.rol === 'admin') {
        if (userRecord.commerce_id) {
          adminType = 'commerce';
          commerceId = userRecord.commerce_id;
          storeIds = await authRepository.findStoresByCommerceId(commerceId);
        } else if (userRecord.store_id) {
          adminType = 'store';
          commerceId = userRecord.store_commerce_id;
          storeIds = [userRecord.store_id];
        } else if (userRecord.delivery_company_id) {
          adminType = 'delivery_company';
          deliveryCompanyId = userRecord.delivery_company_id;
        }
      }

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

    let stamp = await sessionStampService.getStamp(actorType, userId);
    if (!stamp) {
      stamp = await sessionStampService.setStamp(actorType, userId);
    }
    tokenPayload.session_stamp = stamp;

    const jwtSecret = await this.getJWTSecret();
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '8h' });

    return {
      token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        nombre: `${userRecord.nombres || ''} ${userRecord.apellidos || ''}`.trim() || 'Usuario Focnius',
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

  async savePushToken(user, token, platform) {
    const userId = user.id;
    if (!token) {
      throw new BusinessError('Token FCM es requerido.');
    }
    const dbPlatform = platform === 'ios' ? 'ios' : 'android';
    await db.query(`
      INSERT INTO user_push_tokens (user_id, fcm_token, platform)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE fcm_token = ?, updated_at = NOW(6)
    `, [userId, token, dbPlatform, token]);

    return { success: true };
  }
  async getMyNavigation(user, req) {
    const userId = user.id;
    const actorType = user.actorType;
    const adminType = user.adminType;
    const storeIds = user.storeIds;
    const deliveryCompanyId = user.deliveryCompanyId;

    // Determinar scope
    let scope = 'commerce'; // fallback
    if (actorType === 'system_user') {
      scope = 'admin';
    } else if (actorType === 'operator') {
      scope = 'store';
    } else if (actorType === 'user') {
      if (adminType === 'commerce') {
        scope = 'commerce';
      } else if (adminType === 'store') {
        scope = 'store';
      } else if (adminType === 'delivery_company') {
        scope = 'delivery';
      }
    }

    // Obtener los permisos del usuario de forma explícita
    const { permissions: userPermissions } = await authRepository.getUserRolesAndPermissions(actorType, userId);

    // Consulta de navegación
    const [rows] = await db.query(`
      SELECT 
        n.id, n.parent_id, n.label, n.page_title, n.path, n.icon, 
        n.order_index, n.risk_level, n.required_permission,
        COALESCE(p.ui_restriction_mode, 'hidden') AS ui_mode
      FROM system_navigation n
      LEFT JOIN permissions p ON n.required_permission = p.name
      WHERE n.layout_scope = ?
      ORDER BY n.parent_id ASC, n.order_index ASC
    `, [scope]);

    // Filtrar y mapear ítems según permisos
    const resolvedItems = rows.map(row => {
      // Si el ítem no tiene permiso requerido, es accesible por cualquiera en este layout_scope
      if (!row.required_permission) {
        return {
          id: row.id,
          parent_id: row.parent_id,
          label: row.label,
          page_title: row.page_title || row.label,
          path: row.path,
          icon: row.icon,
          order_index: row.order_index,
          risk_level: row.risk_level,
          isLocked: false
        };
      }

      // Bypass total para system_user root
      const isRoot = actorType === 'system_user' && user.rol === 'root';
      const hasPermission = isRoot || userPermissions.includes(row.required_permission);

      if (!hasPermission && row.ui_mode === 'hidden') {
        return null;
      }

      return {
        id: row.id,
        parent_id: row.parent_id,
        label: row.label,
        page_title: row.page_title || row.label,
        path: row.path,
        icon: row.icon,
        order_index: row.order_index,
        risk_level: row.risk_level,
        isLocked: !hasPermission && row.ui_mode === 'ghost'
      };
    }).filter(Boolean);

    // Resolver parámetros dinámicos (:storeId, :deliveryCompanyId)
    const storeIdVal = storeIds && storeIds.length > 0 ? storeIds[0] : null;
    const resolvedPathItems = resolvedItems.map(item => {
      if (!item.path) return item;
      let p = item.path;
      if (storeIdVal) {
        p = p.replace(':storeId', storeIdVal).replace(':id', storeIdVal);
      }
      if (deliveryCompanyId) {
        p = p.replace(':deliveryCompanyId', deliveryCompanyId);
      }
      return { ...item, path: p };
    });

    // Construir estructura de árbol (grupos y sub-ítems)
    const tree = [];
    const itemMap = {};

    for (const item of resolvedPathItems) {
      item.children = [];
      itemMap[item.id] = item;
      if (!item.parent_id) {
        tree.push(item);
      } else {
        const parent = itemMap[item.parent_id];
        if (parent) {
          parent.children.push(item);
        } else {
          // Si por orden index el padre no se procesó antes, se agrega a la raíz
          tree.push(item);
        }
      }
    }

    // Ordenar de nuevo los hijos por order_index
    for (const item of tree) {
      if (item.children.length > 0) {
        item.children.sort((a, b) => a.order_index - b.order_index);
      }
    }

    const lockedCount = resolvedPathItems.filter(i => i.isLocked).length;
    await logSecurityEvent(userId, 'NAV_LOADED', 'LOW', req, {
      scope,
      item_count: resolvedPathItems.length,
      locked_count: lockedCount
    }, 'system', null);

    return tree;
  }
}

module.exports = new AuthService();
