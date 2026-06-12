const jwt = require('jsonwebtoken');
const { logSecurityEvent } = require('../utils/securityLogger');
const userRepository = require('../domains/user/user.repository');
const sessionStampService = require('../services/sessionStampService');
const redisClient = require('../config/redis');


if (!process.env.JWT_SECRET) {
  console.error('[CRITICAL] JWT_SECRET no está configurada en las variables de entorno.');
  process.exit(1);
}

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validacion de revocacion global de sesiones (Boot Lock / Reinicio)
    const globalRevocationEpochStr = await redisClient.get('system:global_revocation_epoch');
    if (globalRevocationEpochStr) {
      const globalRevocationEpoch = parseInt(globalRevocationEpochStr, 10);
      if (verified.iat && verified.iat < globalRevocationEpoch && verified.actorType !== 'system_user') {
        console.warn(`[AUTH] Token rechazado por reinicio de servicios. Usuario: ${verified.id} (${verified.actorType})`);
        return res.status(440).json({ code: 'SESSION_INVALIDATED', error: 'Sesion expirada por reinicio o mantenimiento del sistema.' });
      }
    }

    // Validacion de revocacion critica (Boton de Panico)
    const criticalRevocationEpochStr = await redisClient.get('system:critical_revocation_epoch');
    if (criticalRevocationEpochStr) {
      const criticalRevocationEpoch = parseInt(criticalRevocationEpochStr, 10);
      if (verified.iat && verified.iat < criticalRevocationEpoch) {
        console.warn(`[AUTH] Token rechazado por revocacion critica (Boton de Panico). Usuario: ${verified.id} (${verified.actorType})`);
        return res.status(440).json({ code: 'SESSION_INVALIDATED', error: 'Sesión invalidada por emergencia de seguridad.' });
      }
    }
    
    if (!verified.session_stamp) {
      console.warn(`[AUTH] Token rechazado: falta session_stamp en payload. Usuario: ${verified.id} (${verified.actorType})`);
      return res.status(440).json({ code: 'SESSION_INVALIDATED', error: 'Sesión invalidada. Por favor inicie sesión de nuevo.' });
    }

    const currentStamp = await sessionStampService.getStamp(verified.actorType, verified.id);
    if (currentStamp && currentStamp !== verified.session_stamp) {
      console.warn(`[AUTH] Token rechazado: mismatch de session_stamp. Esperado: ${currentStamp}, recibido: ${verified.session_stamp}. Usuario: ${verified.id} (${verified.actorType})`);
      return res.status(440).json({ code: 'SESSION_INVALIDATED', error: 'Sesión invalidada por cambios en la cuenta o permisos.' });
    }

    req.user = verified;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token inválido' });
    }
    console.error('[AUTH ERROR]', error);
    res.status(500).json({ error: 'Error interno del servidor al autenticar.' });
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
    const hasPermission = await userRepository.checkUserPermission(req.user.actorType, req.user.id, permissionName);

    if (hasPermission) {
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
