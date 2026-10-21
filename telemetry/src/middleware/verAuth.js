const { verifyVerSessionToken } = require('../services/verAuthService');

const parseCookies = (req) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const parts = c.trim().split('=');
    if (parts.length >= 2) {
      const k = parts[0];
      const v = parts.slice(1).join('=');
      cookies[k] = decodeURIComponent(v);
    }
  });
  return cookies;
};

const verAuthMiddleware = (req, res, next) => {
  // Rutas públicas dentro de /expl/ver y /api/ver
  if (req.path === '/login' || req.path === '/logout' || req.path === '/unlock' || req.path.startsWith('/share/')) {
    return next();
  }

  const cookies = parseCookies(req);
  const token = cookies['ver_session'];
  const deviceId = cookies['ver_device'];
  const username = cookies['ver_user'];

  if (token && deviceId && username) {
    if (verifyVerSessionToken(token, deviceId, username)) {
      req.verUser = { deviceId, username };
      return next();
    }
  }

  return res.redirect('/expl/ver/login');
};

module.exports = {
  verAuthMiddleware,
  parseCookies
};
