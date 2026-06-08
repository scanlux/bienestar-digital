const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly, rootOnly } = require('../middleware/auth');
const { logSecurityEvent } = require('../utils/securityLogger');

// @route   GET /api/manage/users
// @desc    Obtener lista de usuarios y sus permisos (solo admins)
router.get('/', auth, rootOnly, async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT u.id, u.email, u.rol, u.estado, 
             p.nombres, p.apellidos 
      FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      WHERE u.rol IN ('admin', 'system')
    `);
    
    // Mapear para mantener compatibilidad con dashboard
    const mappedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      nombre: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || 'Administrador',
      nombres: u.nombres,
      apellidos: u.apellidos,
      rol: u.rol,
      estado: u.estado
    }));

    // Obtener roles y permisos para todos bajo el nuevo esquema RBAC
    for (let user of mappedUsers) {
      const [permissionsData] = await db.query(`
        SELECT DISTINCT p.name 
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_type = 'user' AND ur.user_id = ?
      `, [user.id]);
      user.permissions = permissionsData.map(p => p.name);

      const [rolesData] = await db.query(`
        SELECT r.name, r.id
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_type = 'user' AND ur.user_id = ?
      `, [user.id]);
      user.roles = rolesData.map(r => r.name);
      user.roleIds = rolesData.map(r => r.id);
    }

    res.json(mappedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Final del router
module.exports = router;

