const authService = require('./auth.service');
const { handleControllerError } = require('../../utils/errors');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async tokenSync(req, res) {
    try {
      const { email, firebaseUid, firebaseIdToken } = req.body;
      const result = await authService.tokenSync(email, firebaseUid, firebaseIdToken, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async operatorLogin(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.operatorLogin(email, password, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async systemLogin(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.systemLogin(email, password, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async mobileRegister(req, res) {
    try {
      const { email, nombre, firebaseUid } = req.body;
      const result = await authService.mobileRegister(email, nombre, firebaseUid);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async checkUser(req, res) {
    try {
      const { email } = req.query;
      const result = await authService.checkUser(email);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async mobileRegisterFull(req, res) {
    try {
      const result = await authService.mobileRegisterFull(req.body);
      res.status(201).json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async activateDriver(req, res) {
    try {
      const { aceptar_terminos } = req.body;
      const result = await authService.activateDriver(req.user, aceptar_terminos);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async driverStatus(req, res) {
    try {
      const { activo } = req.body;
      const result = await authService.driverStatus(req.user, activo);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async refreshSession(req, res) {
    try {
      const result = await authService.refreshSession(req.user);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new AuthController();
