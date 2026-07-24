const jwt = require('jsonwebtoken');
const { logSecurityEvent } = require('../utils/securityLogger');
const userRepository = require('../domains/user/user.repository');
const sessionStampService = require('../services/sessionStampService');
const redisClient = require('../config/redis');
const appLogger = require('../utils/appLogger');
const db = require('../config/db');


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
    const verified = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    
    // Validacion de revocacion global de sesiones (Boot Lock / Reinicio)
    const globalRevocationEpochStr = await redisClient.get('system:global_revocation_epoch');
    if (globalRevocationEpochStr) {
      const globalRevocationEpoch = parseInt(globalRevocationEpochStr, 10);
      if (verified.iat && verified.iat < globalRevocationEpoch && verified.actorType !== 'system_user') {
        appLogger.warn(`[AUTH] Token rechazado por reinicio de servicios. Usuario: ${verified.id} (${verified.actorType})`);
        return res.status(440).json({ code: 'SESSION_INVALIDATED', error: 'Sesion expirada por reinicio o mantenimiento del sistema.' });
      }
    }

    // Validacion de revocacion critica (Boton de Panico)
    const criticalRevocationEpochStr = await redisClient.get('system:critical_revocation_epoch');
    if (criticalRevocationEpochStr) {
      const criticalRevocationEpoch = parseInt(criticalRevocationEpochStr, 10);
      if (verified.iat && verified.iat < criticalRevocationEpoch) {
        appLogger.warn(`[AUTH] Token rechazado por revocacion critica (Boton de Panico). Usuario: ${verified.id} (${verified.actorType})`);
        return res.status(440).json({ code: 'SESSION_INVALIDATED', error: 'Sesión invalidada por emergencia de seguridad.' });
      }
    }
    
    if (!verified.session_stamp) {
      appLogger.warn(`[AUTH] Token rechazado: falta session_stamp en payload. Usuario: ${verified.id} (${verified.actorType})`);
      return res.status(440).json({ code: 'SESSION_INVALIDATED', error: 'Sesión invalidada. Por favor inicie sesión de nuevo.' });
    }

    const currentStamp = await sessionStampService.getStamp(verified.actorType, verified.id);
    if (currentStamp === null) {
      appLogger.warn(`[AUTH] Fail-closed: stamp no encontrado en Redis. Usuario: ${verified.id} (${verified.actorType}).`);
      return res.status(440).json({ 
        code: 'SESSION_INVALIDATED', 
        error: 'Sesión no verificable. Por favor, vuelva a iniciar sesión.' 
      });
    }
    if (currentStamp !== verified.session_stamp) {
      appLogger.warn(`[AUTH] Token rechazado: mismatch de session_stamp. Esperado: ${currentStamp}, recibido: ${verified.session_stamp}. Usuario: ${verified.id} (${verified.actorType})`);
      return res.status(440).json({ code: 'SESSION_INVALIDATED', error: 'Sesión invalidada por cambios en la cuenta o permisos.' });
    }

    req.user = verified;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(440).json({ code: 'SESSION_INVALIDATED', error: 'Token inválido' });
    }
    console.error('[AUTH ERROR]', error);
    res.status(500).json({ error: 'Error interno del servidor al autenticar.' });
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
    const userId = req.user ? req.user.id : null;
    await logSecurityEvent(userId, 'PERMISSION_CHECK_ERROR', 'HIGH', req, { error: error.message });
    appLogger.error(`Error al validar permisos en tiempo real para usuario ${userId}: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor al verificar autorización.' });
  }
};

const hasAnyPermission = (permissionNames) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Acceso denegado. Usuario no autenticado.' });
  }

  try {
    if (req.user.actorType === 'system_user' && req.user.rol === 'root') {
      return next();
    }

    for (const permissionName of permissionNames) {
      const has = await userRepository.checkUserPermission(req.user.actorType, req.user.id, permissionName);
      if (has) {
        return next();
      }
    }

    const userId = req.user.id;
    await logSecurityEvent(userId, 'UNAUTHORIZED_ROUTE_ACCESS', 'HIGH', req, {
      reason: `Intento de acceder a ruta protegida con alguno de los siguientes permisos: ${permissionNames.join(', ')} (Validación en tiempo real fallida)`,
      userType: req.user.actorType
    });
    res.status(403).json({ error: `Acceso denegado: permisos insuficientes.` });
  } catch (error) {
    const userId = req.user ? req.user.id : null;
    await logSecurityEvent(userId, 'PERMISSION_CHECK_ERROR', 'HIGH', req, { error: error.message });
    appLogger.error(`Error al validar permisos múltiples en tiempo real para usuario ${userId}: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor al verificar autorización.' });
  }
};

const verifyInternalKey = async (req, res, next) => {
  const internalKey = req.header('x-internal-key');
  if (!internalKey) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó la clave interna.' });
  }
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ error: 'Acceso denegado. Clave interna inválida.' });
  }
  next();
};

const validateFinancialPin = async (req, res, next) => {
  const { financialPin } = req.body;

  if (!financialPin) {
    return res.status(400).json({ error: 'El PIN financiero es requerido para autorizar esta operación.' });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Usuario no autenticado.' });
  }

  try {
    const user = await userRepository.findUserWithPinHash(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (!user.financial_pin_hash) {
      return res.status(403).json({ error: 'Debe configurar su PIN financiero antes de autorizar transacciones.' });
    }

    if (user.financial_pin_locked) {
      return res.status(403).json({ 
        code: 'PIN_LOCKED',
        error: 'Tu PIN financiero se encuentra bloqueado por seguridad debido a múltiples intentos fallidos. Contacta a seguridad.' 
      });
    }

    const isMatch = await bcrypt.compare(String(financialPin), user.financial_pin_hash);

    if (isMatch) {
      // Limpiar intentos fallidos si coincide
      await userRepository.resetFinancialPinAttempts(user.id);
      next();
    } else {
      // Incrementar intentos fallidos
      await userRepository.incrementFinancialPinAttempts(user.id);
      const updatedUser = await userRepository.findUserWithPinHash(user.id);
      const attemptsRemaining = 3 - updatedUser.financial_pin_attempts;

      if (attemptsRemaining <= 0) {
        await userRepository.lockFinancialPin(user.id);
        await logSecurityEvent(user.id, 'FINANCIAL_PIN_ATTACK', 'HIGH', req, {
          reason: 'Bloqueo de PIN financiero por exceder límite de 3 intentos fallidos consecutivos',
          email: user.email
        });
        return res.status(403).json({ 
          code: 'PIN_LOCKED',
          error: 'PIN incorrecto. Has superado el límite de 3 intentos. Tu cuenta de PIN financiero ha sido bloqueada por seguridad.' 
        });
      } else {
        await logSecurityEvent(user.id, 'FINANCIAL_PIN_FAIL', 'MEDIUM', req, {
          reason: 'Intento fallido de PIN financiero',
          attemptsRemaining
        });
        return res.status(403).json({ 
          error: `PIN financiero incorrecto. Intentos restantes: ${attemptsRemaining}` 
        });
      }
    }
  } catch (error) {
    console.error('[PIN VALIDATION ERROR]', error);
    res.status(500).json({ error: 'Error interno del servidor al validar el PIN financiero.' });
  }
};

const conditionalFinancialPin = async (req, res, next) => {
  const { amountCop } = req.body;
  if (!amountCop) {
    return next();
  }

  try {
    const [[rule]] = await db.query(
      "SELECT rule_value FROM protocol_rules WHERE rule_key = 'cash_income_pin_threshold_cop'"
    );
    const threshold = rule ? parseFloat(rule.rule_value) : 500000;
    
    if (parseFloat(amountCop) >= threshold) {
      return validateFinancialPin(req, res, next);
    }
    next();
  } catch (error) {
    console.error('[CONDITIONAL PIN ERROR]', error);
    res.status(500).json({ error: 'Error interno al evaluar el umbral del PIN financiero.' });
  }
};

const bcrypt = require('bcryptjs');

module.exports = { 
  auth, 
  rootOnly, 
  hasPermission, 
  hasAnyPermission, 
  verifyInternalKey, 
  validateFinancialPin,
  conditionalFinancialPin
};

