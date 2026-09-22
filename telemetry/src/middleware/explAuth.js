const crypto = require('crypto');

const SESSION_SECRET = process.env.EXPL_SESSION_SECRET || 'bienestar_expl_secure_session_key_2026';
const EXPECTED_SESSION_HASH = crypto.createHmac('sha256', SESSION_SECRET)
  .update('Olmedo:Fghju/6tGhjU7y6TgFr&y7u(I')
  .digest('hex');

const getExplSessionToken = (req) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const parts = c.trim().split('=');
    if (parts.length >= 2) {
      const k = parts[0];
      const v = parts.slice(1).join('=');
      cookies[k] = decodeURIComponent(v);
    }
  });
  return cookies['expl_session'];
};

const explAuthMiddleware = (req, res, next) => {
  if (req.path === '/login' || req.path === '/logout') return next();

  const token = getExplSessionToken(req);
  if (token && token === EXPECTED_SESSION_HASH) {
    return next();
  }

  // Si viene con Basic Auth en headers (API/curl)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');
      const [user, pass] = credentials.split(':');
      if (user === 'Olmedo' && pass === 'Fghju/6tGhjU7y6TgFr&y7u(I') {
        return next();
      }
    } catch (e) {}
  }

  return res.redirect('/expl/login');
};

module.exports = {
  getExplSessionToken,
  EXPECTED_SESSION_HASH,
  explAuthMiddleware
};
