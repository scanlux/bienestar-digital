const db = require('../../config/db');
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
}

module.exports = new AuthService();
