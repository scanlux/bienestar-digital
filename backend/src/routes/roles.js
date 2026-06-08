const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, hasPermission } = require('../middleware/auth');
const { logSecurityEvent } = require('../utils/securityLogger');
const { permissionsAnalysis } = require('../utils/permissionsRegistry');

// Todos los endpoints de este router requieren autenticación
router.use(auth);

// 1. GET /api/manage/permission-categories
// Listar módulos con sus permisos agrupados
router.get('/permission-categories', hasPermission('manage_rbac'), async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM permission_categories ORDER BY name ASC');
    const [permissions] = await db.query('SELECT * FROM permissions ORDER BY name ASC');

    const result = categories.map(cat => {
      return {
        ...cat,
        permissions: permissions.filter(p => p.category_id === cat.id)
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching permission categories:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// 2. GET /api/manage/permissions
// Catálogo plano de todos los permisos
router.get('/permissions', hasPermission('manage_rbac'), async (req, res) => {
  try {
    const [permissions] = await db.query(`
      SELECT p.*, pc.name as category_name 
      FROM permissions p 
      JOIN permission_categories pc ON p.category_id = pc.id 
      ORDER BY p.name ASC
    `);
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// 3. GET /api/manage/roles
// Listar roles con sus permisos agrupados por módulo
router.get('/roles', hasPermission('manage_rbac'), async (req, res) => {
  try {
    const [roles] = await db.query('SELECT * FROM roles ORDER BY name ASC');
    const [rolePerms] = await db.query(`
      SELECT rp.role_id, p.id as permission_id, p.name as permission_name, pc.name as category_name
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN permission_categories pc ON p.category_id = pc.id
    `);

    const result = roles.map(role => {
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

    res.json(result);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/manage/permissions-analysis
// Obtener catálogo detallado y auditoría de permisos atómicos
router.get('/permissions-analysis', hasPermission('manage_rbac'), async (req, res) => {
  try {
    await logSecurityEvent(
      req.user.id,
      'VIEW_PRIVILEGE_ANALYSIS',
      'LOW',
      req
    );
    res.json(permissionsAnalysis);
  } catch (error) {
    console.error('Error in permissions-analysis:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// 4. POST /api/manage/roles
// Crear un nuevo rol personalizado
router.post('/roles', hasPermission('manage_rbac'), async (req, res) => {
  const { name, code, description, permissionIds } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'El nombre y el código de rol son requeridos.' });
  }

  const normalizedCode = code.toLowerCase().trim().replace(/\s+/g, '_');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Activar flag solo si el usuario autenticado es root de la app
    if (req.user.roles?.includes('root')) {
      await connection.query('SET @domi_is_root = 1');
    }

    // Verificar si ya existe (usar connection para mantener el contexto transaccional)
    const [existing] = await connection.query('SELECT id FROM roles WHERE code = ?', [normalizedCode]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ya existe un rol con ese código.' });
    }

    // Insertar rol
    const [result] = await connection.query(
      'INSERT INTO roles (name, code, description, is_system) VALUES (?, ?, ?, 0)',
      [name, normalizedCode, description || '']
    );
    const roleId = result.insertId;

    // Asociar permisos si vienen en el body
    if (permissionIds && Array.isArray(permissionIds)) {
      for (const permId of permissionIds) {
        await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
      }
    }

    await logSecurityEvent(
      req.user.id,
      'CREATE_ROLE',
      'MEDIUM',
      req,
      { roleId, code: normalizedCode },
      'role',
      roleId
    );

    await connection.commit();
    res.status(201).json({ message: 'Rol creado exitosamente.', roleId });
  } catch (error) {
    await connection.rollback();
    if (error.sqlState === '45000') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    connection.release();
  }
});

// 5. PUT /api/manage/roles/:id
// Editar nombre/descripción + sincronizar permisos de un rol
router.put('/roles/:id', hasPermission('manage_rbac'), async (req, res) => {
  const roleId = req.params.id;
  const { name, description, permissionIds } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Activar flag solo si el usuario autenticado es root de la app
    if (req.user.roles?.includes('root')) {
      await connection.query('SET @domi_is_root = 1');
    }

    const [roles] = await connection.query('SELECT * FROM roles WHERE id = ?', [roleId]);
    const role = roles[0];

    if (!role) {
      await connection.rollback();
      return res.status(404).json({ error: 'Rol no encontrado.' });
    }

    // Si es rol de sistema, se restringen ciertos cambios
    if (role.is_system === 1) {
      // El nombre y código de un rol de sistema NO se deberían cambiar para no romper integraciones
      await connection.query(
        'UPDATE roles SET description = ? WHERE id = ?',
        [description || role.description, roleId]
      );
    } else {
      await connection.query(
        'UPDATE roles SET name = ?, description = ? WHERE id = ?',
        [name || role.name, description || role.description, roleId]
      );
    }

    // Sincronizar permisos en role_permissions
    if (permissionIds && Array.isArray(permissionIds)) {
      // En roles de sistema con permisos críticos (ej. root), prevenir que el root actual se auto-restrinja permisos
      if (role.code === 'root') {
        await connection.rollback();
        return res.status(400).json({ error: 'No se permite modificar los permisos del Super Administrador (root) para evitar auto-exclusiones.' });
      }

      await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
      for (const permId of permissionIds) {
        await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, permId]);
      }
    }

    await logSecurityEvent(
      req.user.id,
      'EDIT_ROLE',
      'MEDIUM',
      req,
      { roleId, code: role.code },
      'role',
      parseInt(roleId)
    );

    await connection.commit();
    res.json({ message: 'Rol actualizado exitosamente.' });
  } catch (error) {
    await connection.rollback();
    if (error.sqlState === '45000') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    connection.release();
  }
});

// 6. DELETE /api/manage/roles/:id
// Eliminar rol (falla si is_system = 1)
router.delete('/roles/:id', hasPermission('manage_rbac'), async (req, res) => {
  const roleId = req.params.id;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Activar flag solo si el usuario autenticado es root de la app
    if (req.user.roles?.includes('root')) {
      await connection.query('SET @domi_is_root = 1');
    }

    const [roles] = await connection.query('SELECT * FROM roles WHERE id = ?', [roleId]);
    const role = roles[0];

    if (!role) {
      await connection.rollback();
      return res.status(404).json({ error: 'Rol no encontrado.' });
    }

    if (role.is_system === 1) {
      await connection.rollback();
      return res.status(400).json({ error: 'No se pueden eliminar roles protegidos del sistema.' });
    }

    await connection.query('DELETE FROM roles WHERE id = ?', [roleId]);

    await logSecurityEvent(
      req.user.id,
      'DELETE_ROLE',
      'HIGH',
      req,
      { roleId, code: role.code },
      'role',
      parseInt(roleId)
    );

    await connection.commit();
    res.json({ message: 'Rol eliminado exitosamente.' });
  } catch (error) {
    await connection.rollback();
    if (error.sqlState === '45000') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    connection.release();
  }
});

// 7. GET /api/manage/users/:id/roles
// Obtener los roles asignados a un usuario específico
router.get('/users/:id/roles', hasPermission('manage_rbac'), async (req, res) => {
  const userId = req.params.id;
  const userType = req.query.userType || 'user'; // 'user', 'system_user', 'operator'

  if (!['user', 'system_user', 'operator'].includes(userType)) {
    return res.status(400).json({ error: 'Tipo de usuario inválido.' });
  }

  try {
    const [userRoles] = await db.query(`
      SELECT ur.role_id, r.name, r.code, r.description 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_type = ? AND ur.user_id = ?
    `, [userType, userId]);

    res.json(userRoles);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// 8. PUT /api/manage/users/:id/roles
// Reemplazar roles de un usuario (antiescalación incluida)
router.put('/users/:id/roles', hasPermission('manage_rbac'), async (req, res) => {
  const userId = req.params.id;
  const { roleIds, userType } = req.body; // userType: 'user', 'system_user', 'operator'

  const normalizedUserType = userType || 'user';

  if (!['user', 'system_user', 'operator'].includes(normalizedUserType)) {
    return res.status(400).json({ error: 'Tipo de usuario inválido.' });
  }

  if (!roleIds || !Array.isArray(roleIds)) {
    return res.status(400).json({ error: 'Debe proporcionar un array de IDs de rol (roleIds).' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Activar flag solo si el usuario autenticado es root de la app
    if (req.user.roles?.includes('root')) {
      await connection.query('SET @domi_is_root = 1');
    }

    // 1. Antiescalación de Privilegios:
    // Un usuario de sistema NO puede asignar el rol 'root' a otro usuario a menos que el usuario logueado sea root
    const isCurrentUserRoot = req.user.permissions && req.user.permissions.includes('withdraw_domis') && req.user.roles?.includes('root');
    
    // Obtener los códigos de los roles solicitados (usando connection)
    const [requestedRoles] = await connection.query('SELECT code FROM roles WHERE id IN (?)', [roleIds.length > 0 ? roleIds : [0]]);
    const hasRootRole = requestedRoles.some(r => r.code === 'root');

    if (hasRootRole && !isCurrentUserRoot) {
      await logSecurityEvent(
        req.user.id,
        'PRIVILEGE_ESCALATION_ATTEMPT',
        'CRITICAL',
        req,
        {
          targetUserId: userId,
          targetUserType: normalizedUserType,
          attemptedRoles: requestedRoles.map(r => r.code)
        },
        'user',
        parseInt(userId)
      );
      await connection.rollback();
      return res.status(403).json({ error: 'Seguridad: Solo un Super Administrador (root) puede asignar el rol root.' });
    }

    // 2. Reemplazar los roles
    await connection.query('DELETE FROM user_roles WHERE user_type = ? AND user_id = ?', [normalizedUserType, userId]);

    for (const roleId of roleIds) {
      await connection.query(
        'INSERT INTO user_roles (user_type, user_id, role_id) VALUES (?, ?, ?)',
        [normalizedUserType, userId, roleId]
      );
    }

    await logSecurityEvent(
      req.user.id,
      'ASSIGN_USER_ROLES',
      'HIGH',
      req,
      {
        targetUserId: userId,
        targetUserType: normalizedUserType,
        assignedRoleIds: roleIds
      },
      'user',
      parseInt(userId)
    );

    await connection.commit();
    res.json({ message: 'Roles de usuario actualizados exitosamente.' });
  } catch (error) {
    await connection.rollback();
    if (error.sqlState === '45000') {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
