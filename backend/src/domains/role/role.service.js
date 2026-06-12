const db = require('../../config/db');
const roleRepository = require('./role.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const { permissionsAnalysis } = require('../../utils/permissionsRegistry');
const sessionStampService = require('../../services/sessionStampService');

class RoleService {
  async getPermissionCategories() {
    const categories = await roleRepository.findPermissionCategories();
    const permissions = await roleRepository.findPermissions();

    return categories.map(cat => ({
      ...cat,
      permissions: permissions.filter(p => p.category_id === cat.id)
    }));
  }

  async getPermissions() {
    return await roleRepository.findPermissionsWithCategory();
  }

  async getRoles() {
    const roles = await roleRepository.findRoles();
    const rolePerms = await roleRepository.findRolePermissions();

    return roles.map(role => {
      const perms = rolePerms.filter(rp => rp.role_id === role.id).map(rp => ({
        id: rp.permission_id,
        name: rp.permission_name,
        category: rp.category_name
      }));
      return {
        ...role,
        permissions: perms
      };
    });
  }

  async getPermissionsAnalysis(userContext, req) {
    await logSecurityEvent(
      userContext.id,
      'VIEW_PRIVILEGE_ANALYSIS',
      'LOW',
      req
    );
    return permissionsAnalysis;
  }

  async createRole(userContext, data, req) {
    const { name, code, description, permissionIds } = data;

    if (!name || !code) {
      throw new BusinessError('El nombre y el código de rol son requeridos.');
    }

    const normalizedCode = code.toLowerCase().trim().replace(/\s+/g, '_');

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (userContext.roles?.includes('root')) {
        await connection.query('SET @domi_is_root = 1');
      }

      const existing = await roleRepository.findRoleByCode(normalizedCode, connection);
      if (existing) {
        throw new BusinessError('Ya existe un rol con ese código.');
      }

      const roleId = await roleRepository.insertRole(name, normalizedCode, description || '', connection);

      if (permissionIds && Array.isArray(permissionIds)) {
        for (const permId of permissionIds) {
          await roleRepository.insertRolePermission(roleId, permId, connection);
        }
      }

      await logSecurityEvent(
        userContext.id,
        'CREATE_ROLE',
        'MEDIUM',
        req,
        { roleId, code: normalizedCode },
        'role',
        roleId
      );

      await connection.commit();
      connection.release();
      return roleId;
    } catch (error) {
      await connection.rollback();
      connection.release();
      if (error.sqlState === '45000') {
        throw new ForbiddenError(error.message);
      }
      throw error;
    }
  }

  async updateRole(userContext, roleId, data, req) {
    const { name, description, permissionIds } = data;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (userContext.roles?.includes('root')) {
        await connection.query('SET @domi_is_root = 1');
      }

      const role = await roleRepository.findRoleById(roleId, connection);
      if (!role) {
        throw new NotFoundError('Rol no encontrado.');
      }

      if (role.is_system === 1) {
        await roleRepository.updateRoleDescription(roleId, description || role.description, connection);
      } else {
        await roleRepository.updateRoleNameAndDescription(roleId, name || role.name, description || role.description, connection);
      }

      if (permissionIds && Array.isArray(permissionIds)) {
        if (role.code === 'root') {
          throw new BusinessError('No se permite modificar los permisos del Super Administrador (root) para evitar auto-exclusiones.');
        }

        await roleRepository.deleteRolePermissions(roleId, connection);
        for (const permId of permissionIds) {
          await roleRepository.insertRolePermission(roleId, permId, connection);
        }
      }

      await logSecurityEvent(
        userContext.id,
        'EDIT_ROLE',
        'MEDIUM',
        req,
        { roleId, code: role.code },
        'role',
        Number(roleId)
      );

      await logSecurityEvent(
        userContext.id,
        'ROLE_PERMISSION_INVALIDATION',
        'HIGH',
        req,
        { roleId, code: role.code, reason: 'Masiva por edición de permisos de rol' },
        'role',
        Number(roleId)
      );

      await connection.commit();
      connection.release();

      sessionStampService.invalidateRoleUsersAsync(roleId);
      return true;
    } catch (error) {
      await connection.rollback();
      connection.release();
      if (error.sqlState === '45000') {
        throw new ForbiddenError(error.message);
      }
      throw error;
    }
  }

  async deleteRole(userContext, roleId, req) {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (userContext.roles?.includes('root')) {
        await connection.query('SET @domi_is_root = 1');
      }

      const role = await roleRepository.findRoleById(roleId, connection);
      if (!role) {
        throw new NotFoundError('Rol no encontrado.');
      }

      if (role.is_system === 1) {
        throw new BusinessError('No se pueden eliminar roles protegidos del sistema.');
      }

      const affectedUsers = await roleRepository.findAffectedUsers(roleId, connection);

      await roleRepository.deleteRole(roleId, connection);

      await logSecurityEvent(
        userContext.id,
        'DELETE_ROLE',
        'HIGH',
        req,
        { roleId, code: role.code },
        'role',
        Number(roleId)
      );

      await logSecurityEvent(
        userContext.id,
        'ROLE_PERMISSION_INVALIDATION',
        'HIGH',
        req,
        { roleId, code: role.code, reason: 'Masiva por eliminación de rol' },
        'role',
        Number(roleId)
      );

      await connection.commit();
      connection.release();

      sessionStampService.invalidateUsersAsync(affectedUsers);
      return true;
    } catch (error) {
      await connection.rollback();
      connection.release();
      if (error.sqlState === '45000') {
        throw new ForbiddenError(error.message);
      }
      throw error;
    }
  }

  async getUserRoles(userType, userId) {
    if (!['user', 'system_user', 'operator'].includes(userType)) {
      throw new BusinessError('Tipo de usuario inválido.');
    }
    return await roleRepository.findUserRoles(userType, userId);
  }

  async updateUserRoles(userContext, userId, data, req) {
    const { roleIds, userType } = data;
    const normalizedUserType = userType || 'user';

    if (!['user', 'system_user', 'operator'].includes(normalizedUserType)) {
      throw new BusinessError('Tipo de usuario inválido.');
    }

    if (!roleIds || !Array.isArray(roleIds)) {
      throw new BusinessError('Debe proporcionar un array de IDs de rol (roleIds).');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      if (userContext.roles?.includes('root')) {
        await connection.query('SET @domi_is_root = 1');
      }

      const isCurrentUserRoot = userContext.permissions && userContext.permissions.includes('withdraw_domis') && userContext.roles?.includes('root');
      
      const requestedRoles = await roleRepository.findRolesByIds(roleIds.length > 0 ? roleIds : [0], connection);
      const hasRootRole = requestedRoles.some(r => r.code === 'root');

      if (hasRootRole && !isCurrentUserRoot) {
        await logSecurityEvent(
          userContext.id,
          'PRIVILEGE_ESCALATION_ATTEMPT',
          'CRITICAL',
          req,
          {
            targetUserId: userId,
            targetUserType: normalizedUserType,
            attemptedRoles: requestedRoles.map(r => r.code)
          },
          'user',
          Number(userId)
        );
        throw new ForbiddenError('Seguridad: Solo un Super Administrador (root) puede asignar el rol root.');
      }

      await roleRepository.deleteUserRoles(normalizedUserType, userId, connection);

      for (const roleId of roleIds) {
        await roleRepository.insertUserRole(normalizedUserType, userId, roleId, connection);
      }

      await logSecurityEvent(
        userContext.id,
        'ASSIGN_USER_ROLES',
        'HIGH',
        req,
        {
          targetUserId: userId,
          targetUserType: normalizedUserType,
          assignedRoleIds: roleIds
        },
        'user',
        Number(userId)
      );

      await logSecurityEvent(
        userContext.id,
        'USER_ROLE_INVALIDATION',
        'HIGH',
        req,
        {
          targetUserId: userId,
          targetUserType: normalizedUserType,
          reason: 'Individual por reasignación de roles'
        },
        'user',
        Number(userId)
      );

      await connection.commit();
      connection.release();

      await sessionStampService.invalidateUser(normalizedUserType, userId);
      return true;
    } catch (error) {
      await connection.rollback();
      connection.release();
      if (error.sqlState === '45000') {
        throw new ForbiddenError(error.message);
      }
      throw error;
    }
  }
}

module.exports = new RoleService();
