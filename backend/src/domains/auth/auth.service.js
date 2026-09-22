const db = require('../../config/db');
const { logSecurityEvent } = require('../../utils/securityLogger');
const AuthSessionService = require('./services/auth.session.service');
const AuthMobileService = require('./services/auth.mobile.service');
const AuthDriverService = require('./services/auth.driver.service');
const AuthNavigationService = require('./services/auth.navigation.service');

class AuthService {
  constructor() {
    this.sessionService = new AuthSessionService(this);
    this.mobileService = new AuthMobileService(this);
    this.driverService = new AuthDriverService(this);
    this.navigationService = new AuthNavigationService(this);
  }

  async getSystemFlags() {
    try {
      const [flagRows] = await db.query('SELECT `key`, `enabled` FROM system_financial_flags');
      return Object.fromEntries(flagRows.map(f => [f.key, f.enabled === 1]));
    } catch (e) {
      return {};
    }
  }

  async getJWTSecret() {
    return process.env.JWT_SECRET || 'super-secret-key-bienestar';
  }

  async login(email, password, req) {
    return this.sessionService.login(email, password, req);
  }

  async tokenSync(email, firebaseUid, firebaseIdToken, req) {
    return this.mobileService.tokenSync(email, firebaseUid, firebaseIdToken, req);
  }

  async mobileRegister(email, nombre, firebaseUid, firebaseIdToken, req) {
    return this.mobileService.mobileRegister(email, nombre, firebaseUid, firebaseIdToken, req);
  }

  async checkUser(email, req = null) {
    return this.mobileService.checkUser(email, req);
  }

  async mobileRegisterFull(data, req = null) {
    return this.mobileService.mobileRegisterFull(data, req);
  }

  async activateDriver(userContext, aceptarTerminos, req) {
    return this.driverService.activateDriver(userContext, aceptarTerminos, req);
  }

  async driverStatus(userContext, activo, req) {
    return this.driverService.driverStatus(userContext, activo, req);
  }

  async refreshSession(userContext, req = null) {
    return this.sessionService.refreshSession(userContext, req);
  }

  async resetPassword(token, newPassword, req) {
    return this.sessionService.resetPassword(token, newPassword, req);
  }

  async savePushToken(user, token, platform) {
    return this.mobileService.savePushToken(user, token, platform);
  }

  async getMyNavigation(user, req) {
    return this.navigationService.getMyNavigation(user, req);
  }

  async reportSecurityEvent(eventType, severity, details, userId, req) {
    let resolvedUserId = userId || null;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key-bienestar', { algorithms: ['HS256'] });
        if (verified && verified.id) {
          resolvedUserId = verified.id;
        }
      } catch (err) {
        // Ignorar errores al decodificar token inválido/expirado
      }
    }
    await logSecurityEvent(resolvedUserId, eventType, severity, req, details);
    return { success: true };
  }

  async reportSecurityEventBatch(events, req) {
    let resolvedUserId = null;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key-bienestar', { algorithms: ['HS256'] });
        if (verified && verified.id) {
          resolvedUserId = verified.id;
        }
      } catch (err) {
        // Ignorar
      }
    }

    // Procesar todos los eventos en paralelo
    const promises = events.map(async (event) => {
      const { eventType, severity, details, userId } = event;
      const targetUserId = resolvedUserId || userId || null;
      await logSecurityEvent(targetUserId, eventType, severity, req, details);
    });

    await Promise.all(promises);
    return { success: true };
  }
}

module.exports = new AuthService();
