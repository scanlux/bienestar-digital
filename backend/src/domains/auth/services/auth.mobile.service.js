const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../../config/db');
const authRepository = require('../auth.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const AUTH_CONSTANTS = require('../auth.constants');
const resolveActorContext = require('../helpers/resolveActorContext');
const getOrCreateSessionStamp = require('../helpers/sessionStampHelper');

class AuthMobileService {
  constructor(authService) {
    this.authService = authService;
  }

  async tokenSync(email, firebaseUid, firebaseIdToken, req) {
    if (!email || !firebaseUid) {
      throw new BusinessError('Email y UID son obligatorios');
    }

    if (!firebaseIdToken) {
      throw new BusinessError('Token de Firebase es obligatorio para la sincronización');
    }
    try {
      let decodedToken;
      if (process.env.NODE_ENV === 'development' && admin.apps.length === 0) {
        decodedToken = { uid: firebaseUid };
      } else {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      }

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

    const hasIdentity = await authRepository.findFirebaseIdentity(user.id, firebaseUid);
    if (!hasIdentity) {
      await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'HIGH', req, { email, type: 'mobile_sync', reason: 'Fallo de autenticación de identidad móvil de Firebase' });
      throw new BusinessError('Fallo de autenticación del token móvil', 401);
    }

    const { permissions, permissionModes, roles } = await authRepository.getUserRolesAndPermissions('user', user.id);
    const systemFlags = await this.authService.getSystemFlags();

    const actorCtx = await resolveActorContext(user);
    const commerceId = actorCtx.commerceId;
    const storeIds = actorCtx.storeIds;
    const deliveryCompanyId = actorCtx.deliveryCompanyId;
    const adminType = actorCtx.adminType;

    const jwtSecret = await this.authService.getJWTSecret();
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

    await logSecurityEvent(user.id, 'SUCCESSFUL_LOGIN', 'LOW', req, { type: 'mobile_sync' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || process.env.APP_DISPLAY_NAME || 'Usuario',
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
      let decodedToken;
      if (process.env.NODE_ENV === 'development' && admin.apps.length === 0) {
        decodedToken = { uid: firebaseUid };
      } else {
        decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      }

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
        // Asegurar que la identidad de Firebase esté registrada si no lo estaba
        await connection.query(
          'INSERT IGNORE INTO firebase_identities (user_id, firebase_uid, provider) VALUES (?, ?, "firebase")',
          [existing.id, firebaseUid]
        );
        await connection.commit();
        connection.release();
        return { message: 'Usuario ya sincronizado', user: existing };
      }

      const parts = (nombre || process.env.APP_DISPLAY_NAME || 'Usuario').trim().split(/\s+/);
      const nombres = parts.slice(0, -1).join(' ') || parts[0];
      const apellidos = parts.length > 1 ? parts[parts.length - 1] : '';

      const userId = await authRepository.insertUser(email, null, 'customer', 'activo', connection);
      await authRepository.insertFirebaseIdentity(userId, firebaseUid, 'firebase', connection);

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

  async checkUser(email, req = null) {
    if (!email) {
      throw new BusinessError('Email es obligatorio');
    }
    const user = await authRepository.findUserMinByEmail(email);
    await logSecurityEvent(user ? user.id : null, 'CHECK_USER_EMAIL', 'LOW', req, { email, exists: !!user });
    return { exists: !!user };
  }

  async mobileRegisterFull(data, req = null) {
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
    dbApellidos = dbApellidos || 'Domi';

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const existing = await authRepository.findUserMinByEmail(email, connection);
      let userId;

      if (existing) {
        userId = existing.id;
        await authRepository.updateProfile(userId, dbNombres, dbApellidos, cedula || `REG_${userId}`, celular, connection);
        if (firebaseUid) {
          await connection.query(
            'INSERT IGNORE INTO firebase_identities (user_id, firebase_uid, provider) VALUES (?, ?, "firebase")',
            [userId, firebaseUid]
          );
        }
      } else {
        let hash = null;
        if (password) {
          hash = await bcrypt.hash(password, 10);
        }

        userId = await authRepository.insertUser(email, hash, 'customer', 'activo', connection);
        await authRepository.insertProfile(userId, dbNombres, dbApellidos, cedula || `REG_${userId}`, celular, connection);

        if (firebaseUid) {
          await authRepository.insertFirebaseIdentity(userId, firebaseUid, 'firebase', connection);
        }
      }

      await authRepository.insertUserAddress(userId, 'Casa', direccion, latitud || null, longitud || null, true, connection);

      await connection.commit();
      connection.release();

      await logSecurityEvent(userId, 'MOBILE_PROFILE_COMPLETED', 'LOW', req, { 
        email, 
        role: 'customer',
        latitud: latitud || null,
        longitud: longitud || null
      });

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
}

module.exports = AuthMobileService;
