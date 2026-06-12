const db = require('../../config/db');
const userRepository = require('./user.repository');
const { BusinessError, ForbiddenError, NotFoundError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const bcrypt = require('bcryptjs');

class UserService {
  async getStoreAdmins(userContext) {
    const isSystem = userContext.actorType === 'system_user';
    const users = await userRepository.findStoreAdmins(userContext.commerceId, isSystem);
    
    // Mapear y adjuntar los storeIds a cada admin, omitiendo el propio usuario en sesión
    const mappedAdmins = [];
    for (const u of users) {
      if (u.id === userContext.id) continue;
      
      const storeIds = await userRepository.findUserStoreIds(u.id);
      
      mappedAdmins.push({
        id: u.id,
        email: u.email,
        nombre: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || 'Administrador',
        nombres: u.nombres,
        apellidos: u.apellidos,
        telefono: u.telefono,
        rol: u.rol,
        estado: u.estado,
        commerce_id: u.commerce_id,
        storeIds
      });
    }
    
    return mappedAdmins;
  }

  async createStoreAdmin(userContext, data, req) {
    const { email, password, nombres, storeIds } = data;
    const isSystem = userContext.actorType === 'system_user';
    const commerceId = isSystem ? Number(data.commerce_id) : userContext.commerceId;

    if (!email || !password || !nombres || !commerceId) {
      throw new BusinessError('Email, contraseña, nombres y commerce_id son obligatorios.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar si el correo ya existe
      const emailExists = await userRepository.checkUserExistsByEmail(email, connection);
      if (emailExists) {
        throw new BusinessError('El correo electrónico ya está registrado.');
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(password, 10);

      // 1. Crear usuario admin base
      const newUserId = await userRepository.createUser(email, passwordHash, connection);

      // 2. Crear perfil de usuario
      await userRepository.createProfile(newUserId, data, connection);

      // 3. Vincular como gerente principal del comercio si el comercio no tiene uno asignado
      const commerce = await userRepository.findCommerceWithEmptyManager(commerceId, connection);
      if (commerce && commerce.usuario_id === null) {
        await userRepository.assignManagerToCommerce(commerceId, newUserId, connection);
      }

      // 4. Vincular sedes asociadas
      if (storeIds && Array.isArray(storeIds) && storeIds.length > 0) {
        const validStoreIds = await userRepository.findValidStoresForCommerce(storeIds, commerceId, connection);
        if (validStoreIds.length > 0) {
          const values = validStoreIds.map(sid => [newUserId, sid]);
          await userRepository.insertUserStores(values, connection);
        }
      }

      // Auditoría
      await logSecurityEvent(
        userContext.id,
        'CREATE_STORE_ADMIN',
        'HIGH',
        req,
        { adminUserId: newUserId, email, storeIds },
        'user',
        newUserId
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

  async updateStoreAdmin(userContext, id, data, req) {
    const adminId = Number(id);
    const { storeIds, password } = data;
    const isSystem = userContext.actorType === 'system_user';

    const user = await userRepository.findUserById(adminId);
    if (!user || user.rol !== 'admin') {
      throw new NotFoundError('Administrador de sede no encontrado.');
    }

    // BOLA Check: verificar que pertenezca al comercio
    const userCommerce = await userRepository.findCommerceByManagerId(adminId);
    const adminCommerceId = userCommerce ? userCommerce.id : null;

    if (!isSystem && adminCommerceId !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { targetUserId: adminId, action: 'update_store_admin' },
        'user',
        adminId
      );
      throw new ForbiddenError('No tienes permiso para modificar este administrador.');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Actualizar contraseña
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await userRepository.updateUserPassword(adminId, passwordHash, connection);
      }

      // 2. Actualizar datos de perfil
      await userRepository.updateProfile(adminId, data, connection);

      // 3. Actualizar relaciones de sedes
      await userRepository.deleteUserStores(adminId, connection);
      if (storeIds && Array.isArray(storeIds) && storeIds.length > 0) {
        const targetCommerceId = isSystem ? adminCommerceId : userContext.commerceId;
        const validStoreIds = await userRepository.findValidStoresForCommerce(storeIds, targetCommerceId, connection);
        if (validStoreIds.length > 0) {
          const values = validStoreIds.map(sid => [adminId, sid]);
          await userRepository.insertUserStores(values, connection);
        }
      }

      await connection.commit();
      connection.release();

      await logSecurityEvent(
        userContext.id,
        'EDIT_STORE_ADMIN',
        'MEDIUM',
        req,
        { targetUserId: adminId, storeIds },
        'user',
        adminId
      );

      return true;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  async updateStoreAdminStatus(userContext, id, estado, req) {
    const adminId = Number(id);
    const isSystem = userContext.actorType === 'system_user';

    const user = await userRepository.findUserById(adminId);
    if (!user || user.rol !== 'admin') {
      throw new NotFoundError('Administrador de sede no encontrado.');
    }

    // BOLA Check: verificar pertenencia al comercio
    const userCommerce = await userRepository.findCommerceByManagerId(adminId);
    const adminCommerceId = userCommerce ? userCommerce.id : null;

    if (!isSystem && adminCommerceId !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { targetUserId: adminId, action: 'update_store_admin_status' },
        'user',
        adminId
      );
      throw new ForbiddenError('No tienes permiso para modificar este administrador.');
    }

    await userRepository.updateUserStatus(adminId, estado);

    // Auditoría
    await logSecurityEvent(
      userContext.id,
      'CHANGE_STORE_ADMIN_STATUS',
      'MEDIUM',
      req,
      { targetUserId: adminId, newStatus: estado },
      'user',
      adminId
    );

    return true;
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
        permissions,
        roles,
        roleIds
      });
    }
    return mappedUsers;
  }
}

module.exports = new UserService();
