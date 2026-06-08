const jwt = require('jsonwebtoken');
const { logSecurityEvent } = require('../utils/securityLogger');
const db = require('../config/db');


if (!process.env.JWT_SECRET) {
  console.error('[CRITICAL] JWT_SECRET no está configurada en las variables de entorno.');
  process.exit(1);
}

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token inválido' });
  }
};

const adminOnly = async (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next();
  } else {
    const userId = req.user ? req.user.id : null;
    await logSecurityEvent(userId, 'UNAUTHORIZED_ROUTE_ACCESS', 'MEDIUM', req, {
      reason: 'Intento de acceder a ruta exclusiva de administrador',
      userRol: req.user ? req.user.rol : null
    });
    res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
};

const systemOnly = async (req, res, next) => {
  if (req.user && req.user.actorType === 'system_user') {
    next();
  } else {
    const userId = req.user ? req.user.id : null;
    await logSecurityEvent(userId, 'UNAUTHORIZED_ROUTE_ACCESS', 'HIGH', req, {
      reason: 'Intento de acceder a ruta exclusiva de sistema (casa matriz)',
      actorType: req.user ? req.user.actorType : null
    });
    res.status(403).json({ error: 'Acceso restringido a usuarios de sistema' });
  }
};

const systemOrAdmin = async (req, res, next) => {
  if (req.user && (req.user.actorType === 'system_user' || req.user.rol === 'admin')) {
    next();
  } else {
    const userId = req.user ? req.user.id : null;
    await logSecurityEvent(userId, 'UNAUTHORIZED_ROUTE_ACCESS', 'HIGH', req, {
      reason: 'Intento de acceder a ruta exclusiva de sistema o administrador',
      actorType: req.user ? req.user.actorType : null,
      userRol: req.user ? req.user.rol : null
    });
    res.status(403).json({ error: 'No autorizado. Acceso restringido a administradores o personal del sistema.' });
  }
};

const rootOnly = async (req, res, next) => {
  if (req.user && req.user.actorType === 'system_user' && req.user.rol === 'root') {
    next();
  } else {
    const userId = req.user ? req.user.id : null;
    await logSecurityEvent(userId, 'UNAUTHORIZED_ROUTE_ACCESS', 'CRITICAL', req, {
      reason: 'Intento de acceder a ruta exclusiva de Root del sistema',
      actorType: req.user ? req.user.actorType : null,
      userRol: req.user ? req.user.rol : null
    });
    res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de Root del sistema.' });
  }
};

const hasPermission = (permissionName) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Acceso denegado. Usuario no autenticado.' });
  }

  try {
    // Si el usuario es de tipo sistema y tiene rol root, omitimos consultas de base de datos
    if (req.user.actorType === 'system_user' && req.user.rol === 'root') {
      return next();
    }

    // Consultar permisos activos del usuario en tiempo real desde la DB
    const [permissionsData] = await db.query(`
      SELECT 1
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_type = ? AND ur.user_id = ? AND p.name = ?
    `, [req.user.actorType, req.user.id, permissionName]);

    if (permissionsData.length > 0) {
      next();
    } else {
      const userId = req.user.id;
      await logSecurityEvent(userId, 'UNAUTHORIZED_ROUTE_ACCESS', 'HIGH', req, {
        reason: `Intento de acceder a ruta protegida con permiso: ${permissionName} (Validación en tiempo real fallida)`,
        userType: req.user.actorType
      });
      res.status(403).json({ error: `Acceso denegado: permiso '${permissionName}' insuficiente.` });
    }
  } catch (error) {
    console.error('Error al validar permisos en tiempo real:', error);
    res.status(500).json({ error: 'Error interno del servidor al verificar autorización.' });
  }
};

module.exports = { auth, adminOnly, systemOnly, systemOrAdmin, rootOnly, hasPermission };
