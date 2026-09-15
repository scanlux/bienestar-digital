const crypto = require('crypto');

const getExplSessionToken = (req) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
    const [k, v] = c.trim().split('=');
    return [k, decodeURIComponent(v)];
  }));
  return cookies['expl_session'];
};

const EXPECTED_SESSION_HASH = crypto.createHash('sha256').update('Olmedo:Fghju/6tGhjU7y6TgFr&y7u(I').digest('hex');

const explAuthMiddleware = (req, res, next) => {
  if (req.path === '/login' || req.path === '/logout') return next();

  const token = getExplSessionToken(req);
  if (token === EXPECTED_SESSION_HASH) {
    return next();
  }

  // Si viene con Basic Auth en headers (API/curl)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Basic ')) {
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');
    const [user, pass] = credentials.split(':');
    if (user === 'Olmedo' && pass === 'Fghju/6tGhjU7y6TgFr&y7u(I') {
      return next();
    }
  }

  return res.redirect('/expl/login');
};

module.exports = {
  getExplSessionToken,
  EXPECTED_SESSION_HASH,
  explAuthMiddleware
};
