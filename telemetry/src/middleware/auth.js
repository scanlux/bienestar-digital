const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

const apiAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token inválido' });
  }
};

const apiAdminOnly = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
};

const verifyInternalOrAdminKey = (req, res, next) => {
  const internalKey = req.header('x-internal-key');
  if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
    return next();
  }
  return apiAuth(req, res, () => {
    apiAdminOnly(req, res, next);
  });
};

const isCommerceManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.rol === 'admin' || (req.user.rol === 'vendor' && req.user.commerceId))) {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador o Gerente de Comercio.' });
  }
};

module.exports = {
  apiAuth,
  apiAdminOnly,
  verifyInternalOrAdminKey,
  isCommerceManagerOrAdmin
};
