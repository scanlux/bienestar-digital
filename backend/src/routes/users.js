const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');
const { logSecurityEvent } = require('../utils/securityLogger');

// @route   GET /api/manage/users
// @desc    Obtener lista de usuarios y sus permisos (solo admins)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, email, nombres, apellidos, rol, estado FROM users WHERE rol = "admin" OR rol = "vendor"');
    
    // Mapear para mantener compatibilidad con dashboard
    const mappedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      nombre: `${u.nombres} ${u.apellidos || ''}`.trim(),
      nombres: u.nombres,
      apellidos: u.apellidos,
      rol: u.rol,
      estado: u.estado
    }));

    // Obtener permisos para todos
    for (let user of mappedUsers) {
      const [permissionsData] = await db.query(`
        SELECT p.name 
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = ?
      `, [user.id]);
      user.permissions = permissionsData.map(p => p.name);
    }

    res.json(mappedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// @route   PUT /api/manage/users/:id/permissions
// @desc    Actualizar permisos de un usuario
router.put('/:id/permissions', auth, adminOnly, async (req, res) => {
  const userId = req.params.id;
  const { permissions } = req.body; // Array de strings (nombres de permisos)

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'permissions debe ser un arreglo' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Borrar permisos actuales
    await connection.query('DELETE FROM user_permissions WHERE user_id = ?', [userId]);

    // 2. Insertar nuevos permisos
    if (permissions.length > 0) {
      for (const permName of permissions) {
        // Buscar el ID del permiso
        const [permRows] = await connection.query('SELECT id FROM permissions WHERE name = ?', [permName]);
        if (permRows.length > 0) {
          await connection.query('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)', [userId, permRows[0].id]);
        }
      }
    }

    await connection.commit();

    // Registrar evento de seguridad crítico
    await logSecurityEvent(req.user.id, 'USER_PERMISSIONS_UPDATED', 'HIGH', req, {
      targetUserId: userId,
      newPermissions: permissions
    });

    res.json({ message: 'Permisos actualizados exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

module.exports = router;

