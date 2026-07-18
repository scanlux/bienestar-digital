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
        financial_pin_locked: u.financial_pin_locked,
        financial_pin_attempts: u.financial_pin_attempts,
        permissions,
        roles,
        roleIds
      });
    }
    return mappedUsers;
  }

  async setFinancialPin(userContext, data, req) {
    const { currentPassword, financialPin } = data;
    if (!currentPassword || !financialPin) {
      throw new BusinessError('La contraseña actual y el nuevo PIN financiero de 6 dígitos son obligatorios.');
    }

    if (!/^\d{6}$/.test(String(financialPin))) {
      throw new BusinessError('El PIN financiero debe ser un código numérico exacto de 6 dígitos.');
    }

    const user = await userRepository.findUserWithPinHash(userContext.id);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    // Validar contraseña
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordMatch) {
      await logSecurityEvent(userContext.id, 'FINANCIAL_PIN_SETUP_FAIL', 'MEDIUM', req, {
        reason: 'Contraseña incorrecta al intentar configurar el PIN financiero'
      });
      throw new ForbiddenError('La contraseña ingresada es incorrecta.');
    }

    // Generar hash bcrypt del PIN
    const pinHash = await bcrypt.hash(String(financialPin), 10);
    await userRepository.updateUserFinancialPin(userContext.id, pinHash);

    await logSecurityEvent(userContext.id, 'FINANCIAL_PIN_UPDATED', 'HIGH', req, {
      message: 'PIN financiero configurado o actualizado exitosamente.'
    });

    return { success: true, message: 'PIN financiero guardado con éxito.' };
  }

  async unlockFinancialPin(userContext, targetUserId, req) {
    // Verificar que el usuario en sesión sea administrador
    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && userContext.rol !== 'admin') {
      throw new ForbiddenError('No tienes privilegios para desbloquear cuentas de operadores.');
    }

    const targetUser = await userRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Usuario a desbloquear no encontrado.');
    }

    await userRepository.resetFinancialPinAttempts(targetUserId);

    await logSecurityEvent(userContext.id, 'FINANCIAL_PIN_UNLOCKED', 'HIGH', req, {
      message: `El administrador desbloqueó el PIN del usuario id ${targetUserId}`,
      targetUserEmail: targetUser.email
    });

    return { success: true, message: 'PIN financiero desbloqueado con éxito.' };
  }

  async generateResetPinLink(userContext, targetUserId, req) {
    const isSystem = userContext.actorType === 'system_user';
    if (!isSystem && userContext.rol !== 'admin') {
      throw new ForbiddenError('No tienes privilegios para restablecer cuentas de operadores.');
    }

    const targetUser = await userRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    // Generamos un token temporal
    const token = require('crypto').randomBytes(20).toString('hex');
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-pin?token=${token}&userId=${targetUserId}`;

    // Simulamos el envío por correo escribiéndolo en logs por seguridad y auditoría
    const emailService = require('../../services/emailService');
    await emailService.sendMail({
      to: targetUser.email,
      subject: 'Restablecimiento de PIN Financiero - Bienestar Digital',
      text: `Se ha generado un enlace para restablecer tu PIN financiero.\n\nEnlace: ${resetUrl}\n\nSi no solicitaste esto, contacta de inmediato al administrador de seguridad.`,
      html: `
        <div style="font-family: sans-serif; padding: 2rem; color: #1e293b;">
          <h2>Restablecimiento de PIN Financiero</h2>
          <p>Un administrador ha generado un enlace para que configures nuevamente tu PIN financiero de 6 dígitos.</p>
          <p style="margin: 2rem 0;">
            <a href="${resetUrl}" style="background-color: #10b981; color: #000; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Restablecer mi PIN
            </a>
          </p>
          <p style="font-size: 0.8rem; color: #64748b;">Si el botón no funciona, copia y pega esta URL en tu navegador: <br/> ${resetUrl}</p>
        </div>
      `
    });

    await logSecurityEvent(userContext.id, 'FINANCIAL_PIN_RESET_LINK_SENT', 'HIGH', req, {
      message: `Enlace de restablecimiento de PIN generado para usuario id ${targetUserId}`,
      targetUserEmail: targetUser.email
    });

    return { success: true, message: 'Enlace de restablecimiento enviado exitosamente.', resetUrl };
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
        const roleRepository = require('../role/role.repository');
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

  async sendStoreAdminRecoveryEmail(userContext, id, req) {
    const targetUserId = Number(id);
    const isSystem = userContext.actorType === 'system_user';

    // Obtener información del usuario y su comercio asociado
    const [userRows] = await db.query(`
      SELECT u.id, u.email, p.nombres, p.apellidos, c.id AS commerce_id
      FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN commerces c ON c.usuario_id = u.id
      WHERE u.id = ? AND u.rol = 'admin'
    `, [targetUserId]);

    const adminUser = userRows[0];
    if (!adminUser) {
      throw new NotFoundError('Administrador de sede no encontrado.');
    }

    // BOLA Check: si no es sistema, verificar que pertenezca al mismo comercio
    if (!isSystem && adminUser.commerce_id !== userContext.commerceId) {
      await logSecurityEvent(
        userContext.id,
        'BOLA_ATTEMPT',
        'HIGH',
        req,
        { targetUserId, action: 'send_recovery_email' },
        'user',
        targetUserId
      );
      throw new ForbiddenError('No está autorizado para enviar correos de recuperación a este usuario.');
    }

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    // Guardar en Redis por 10 minutos (600 segundos)
    const redisClient = require('../../config/redis');
    await redisClient.set(`password_reset:${token}`, targetUserId.toString(), { EX: 600 });

    // Obtener la plantilla de correo
    const [templateRows] = await db.query(
      'SELECT * FROM email_templates WHERE name = ?',
      ['store_admin_password_recovery']
    );
    const template = templateRows[0];
    if (!template) {
      throw new BusinessError('Plantilla de correo de recuperación no configurada.');
    }

    const host = process.env.FRONTEND_URL || 'http://localhost:3000';
    const recoveryUrl = `${host}/login/reset-password?token=${token}`;
    const adminName = `${adminUser.nombres || ''} ${adminUser.apellidos || ''}`.trim() || 'Administrador';

    let html = template.html_body;
    html = html.replace(/\{\{admin_name\}\}/g, adminName);
    html = html.replace(/\{\{recovery_url\}\}/g, recoveryUrl);
    html = html.replace(/\{\{year\}\}/g, new Date().getFullYear().toString());

    // Enviar el correo
    const emailService = require('../../services/emailService');
    await emailService.sendMail({
      to: adminUser.email,
      subject: template.subject,
      html,
      text: `Hola ${adminName}, utiliza este enlace para restablecer tu contraseña: ${recoveryUrl}`
    });

    // Registrar en auditoría
    await logSecurityEvent(
      userContext.id,
      'REQUESTED_PASSWORD_RESET',
      'MEDIUM',
      req,
      { targetUserId, email: adminUser.email },
      'user',
      targetUserId
    );

    return { success: true, message: 'Correo de recuperación enviado con éxito.' };
  }
}

module.exports = new UserService();
