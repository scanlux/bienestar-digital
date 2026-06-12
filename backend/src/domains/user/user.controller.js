const userServiceModule = require('./user.service');
const { handleControllerError } = require('../../utils/errors');

class UserController {
  async getStoreAdmins(req, res) {
    try {
      const result = await userServiceModule.getStoreAdmins(req.user);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createStoreAdmin(req, res) {
    try {
      const newUserId = await userServiceModule.createStoreAdmin(req.user, req.body, req);
      res.status(201).json({ id: newUserId, message: 'Administrador de sede creado con éxito.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateStoreAdmin(req, res) {
    try {
      const { id } = req.params;
      await userServiceModule.updateStoreAdmin(req.user, id, req.body, req);
      res.json({ message: 'Administrador de sede actualizado con éxito.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateStoreAdminStatus(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      await userServiceModule.updateStoreAdminStatus(req.user, id, estado, req);
      res.json({ message: `Administrador de sede actualizado a estado: ${estado}` });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getUsers(req, res) {
    try {
      const result = await userServiceModule.getUsers(req.user);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new UserController();
