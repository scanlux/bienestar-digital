const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionÃ³ un token.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'f3a1d9c2e4b6a8d0c2e4f6a8d0c2e4b6');
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token invÃ¡lido' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
};

module.exports = { auth, adminOnly };
