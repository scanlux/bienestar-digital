const jwt = require('jsonwebtoken');
const { logSecurityEvent } = require('../utils/securityLogger');

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

module.exports = { auth, adminOnly };
