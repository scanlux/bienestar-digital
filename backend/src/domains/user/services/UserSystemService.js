const db = require('../../../config/db');
const userRepository = require('../user.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../../utils/errors');
const { logSecurityEvent } = require('../../../utils/securityLogger');
const bcrypt = require('bcryptjs');

class UserSystemService {
  constructor(userService) {
    this.userService = userService;
  }

  async getUsers(userContext) {
    const users = await userRepository.findSystemAndAdminUsers();
    
    const mappedUsers = [];
    for (const u of users) {
      const { permissions, roles, roleIds } = await userRepository.findUserRolesAndPermissions(u.id);
      mappedUsers.push({
        id: u.id,
        email: u.email,
        nombre: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || 'Administrador',
        nombres: u.nombres,
        apellidos: u.apellidos,
        rol: u.rol,
        estado: u.estado,
        financial_pin_locked: u.financial_pin_locked,
        financial_pin_attempts: u.financial_pin_attempts,
        permissions,
        roles,
        roleIds
      });
    }
    return mappedUsers;
  }

  async getSystemUsers(userContext) {
    const users = await userRepository.findSystemUsers();
    
    const mappedUsers = [];
    for (const u of users) {
      const { permissions, roles, roleIds } = await userRepository.findUserRolesAndPermissions(u.id, 'system_user');
      mappedUsers.push({
        id: u.id,
        email: u.email,
        nombre: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || 'Usuario de Sistema',
        nombres: u.nombres,
        apellidos: u.apellidos,
        rol: u.nivel,
        nivel: u.nivel,
        estado: u.estado,
        password_locked: u.password_locked,
        permissions,
        roles,
        roleIds
      });
    }
    return mappedUsers;
  }

  async createSystemUser(userContext, data, req) {
    const { email, password, nombres, apellidos, nivel, roleIds } = data;

    if (!email || !password || !nombres || !apellidos) {
      throw new BusinessError('Email, contraseña, nombres y apellidos son requeridos.');
    }

    const assignedNivel = nivel || 'system';
    if (!['system', 'root'].includes(assignedNivel)) {
      throw new BusinessError('Nivel de sistema inválido.');
    }

    // Si el nivel asignado es root, el creador debe ser root
    const isCreatorRoot = userContext.roles?.includes('root');
    if (assignedNivel === 'root' && !isCreatorRoot) {
      throw new ForbiddenError('Seguridad: Solo un Super Administrador (root) puede crear usuarios de nivel root.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar si el correo ya existe en system_users
      const [existing] = await connection.query('SELECT id FROM system_users WHERE email = ?', [email]);
      if (existing.length > 0) {
        throw new BusinessError('El correo electrónico ya está registrado en el sistema.');
      }

      // Hash de contraseña
      const passwordHash = await bcrypt.hash(password, 10);

      // Crear usuario de sistema
      const newUserId = await userRepository.createSystemUser(email, passwordHash, nombres, apellidos, assignedNivel, connection);

      // Asignar roles si se pasaron
      if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
        const roleRepository = require('../../role/role.repository');
        // Validar si intentan asignar el rol root sin ser root
        const requestedRoles = await roleRepository.findRolesByIds(roleIds, connection);
        const hasRootRole = requestedRoles.some(r => r.code === 'root');
        if (hasRootRole && !isCreatorRoot) {
          throw new ForbiddenError('Seguridad: Solo un Super Administrador (root) puede asignar el rol root.');
        }

        for (const roleId of roleIds) {
          await roleRepository.insertUserRole('system_user', newUserId, roleId, connection);
        }
      }

      // Auditoría
      await logSecurityEvent(
        userContext.id,
        'CREATE_SYSTEM_USER',
        'HIGH',
        req,
        { email, level: assignedNivel, roleIds }
      );

      await connection.commit();
      connection.release();
      return newUserId;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async moderateUser(userContext, targetUserId, data, req) {
    const { action, reason, userType } = data;
    const targetId = Number(targetUserId);

    if (!['user', 'system_user'].includes(userType)) {
      throw new BusinessError('Tipo de usuario inválido.');
    }
    if (!['ban', 'unban', 'lock_password', 'unlock_password'].includes(action)) {
      throw new BusinessError('Acción de moderación inválida.');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      throw new BusinessError('Debe proporcionar un motivo/justificación de al menos 5 caracteres.');
    }

    // Evitar que el administrador se modere a sí mismo
    const isSelf = userContext.id === targetId && userContext.actorType === userType;
    if (isSelf) {
      throw new BusinessError('No puedes aplicarte acciones de moderación a ti mismo.');
    }

    // Obtener datos del usuario afectado
    let targetUser = null;
    if (userType === 'system_user') {
      const [rows] = await db.query('SELECT id, email, nivel, estado, password_locked FROM system_users WHERE id = ?', [targetId]);
      targetUser = rows[0] || null;
    } else {
      targetUser = await userRepository.findUserById(targetId);
    }

    if (!targetUser) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    // Si el usuario destino es root, solo otro root puede moderarlo
    const isCreatorRoot = userContext.roles?.includes('root');
    const isTargetRoot = (userType === 'system_user' && targetUser.nivel === 'root') || (userType === 'user' && targetUser.rol === 'root');
    if (isTargetRoot && !isCreatorRoot) {
      throw new ForbiddenError('Seguridad: Solo un Super Administrador (root) puede moderar a un usuario root.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Aplicar acción
      if (action === 'ban') {
        if (userType === 'system_user') {
          await userRepository.updateSystemUserStatus(targetId, 'inactivo');
        } else {
          await userRepository.updateUserStatus(targetId, 'baneado');
        }
      } else if (action === 'unban') {
        if (userType === 'system_user') {
          await userRepository.updateSystemUserStatus(targetId, 'activo');
        } else {
          await userRepository.updateUserStatus(targetId, 'activo');
        }
      } else if (action === 'lock_password') {
        if (userType === 'system_user') {
          await userRepository.updateSystemUserPasswordLock(targetId, 1);
        } else {
          await userRepository.updateUserPasswordLock(targetId, 1);
        }
      } else if (action === 'unlock_password') {
        if (userType === 'system_user') {
          await userRepository.updateSystemUserPasswordLock(targetId, 0);
        } else {
          await userRepository.updateUserPasswordLock(targetId, 0);
        }
      }

      // Insertar bitácora
      await userRepository.insertModerationLog(userType, targetId, action, reason, userContext.actorType, userContext.id, connection);

      // Auditoría de seguridad general
      await logSecurityEvent(
        userContext.id,
        'USER_MODERATED',
        'HIGH',
        req,
        { targetUserId: targetId, targetUserType: userType, action, reason }
      );

      await connection.commit();
      connection.release();
      return true;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async getModerationHistory(userContext, targetUserId, targetUserType) {
    const targetId = Number(targetUserId);
    if (!['user', 'system_user'].includes(targetUserType)) {
      throw new BusinessError('Tipo de usuario inválido.');
    }
    return await userRepository.findModerationLogs(targetUserType, targetId);
  }
}

module.exports = UserSystemService;
