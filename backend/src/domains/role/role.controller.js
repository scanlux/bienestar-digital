const roleService = require('./role.service');
const { handleControllerError } = require('../../utils/errors');

class RoleController {
  async getPermissionCategories(req, res) {
    try {
      const result = await roleService.getPermissionCategories();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getPermissions(req, res) {
    try {
      const result = await roleService.getPermissions();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getRoles(req, res) {
    try {
      const result = await roleService.getRoles();
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getPermissionsAnalysis(req, res) {
    try {
      const result = await roleService.getPermissionsAnalysis(req.user, req);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async createRole(req, res) {
    try {
      const roleId = await roleService.createRole(req.user, req.body, req);
      res.status(201).json({ message: 'Rol creado exitosamente.', roleId });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      await roleService.updateRole(req.user, id, req.body, req);
      res.json({ message: 'Rol actualizado exitosamente.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async deleteRole(req, res) {
    try {
      const { id } = req.params;
      await roleService.deleteRole(req.user, id, req);
      res.json({ message: 'Rol eliminado exitosamente.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async getUserRoles(req, res) {
    try {
      const { id } = req.params;
      const userType = req.query.userType || 'user';
      const result = await roleService.getUserRoles(userType, id);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error);
    }
  }

  async updateUserRoles(req, res) {
    try {
      const { id } = req.params;
      await roleService.updateUserRoles(req.user, id, req.body, req);
      res.json({ message: 'Roles de usuario actualizados exitosamente.' });
    } catch (error) {
      handleControllerError(res, error);
    }
  }
}

module.exports = new RoleController();
