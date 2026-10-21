const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  authenticateVerUser,
  createVerSessionToken
} = require('../services/verAuthService');
const { verAuthMiddleware } = require('../middleware/verAuth');
const { renderVerLoginView } = require('../views/ver/loginView');

const verLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos de acceso a Ver Media. Por favor intente más tarde.'
});

// GET /expl/ver/login
router.get('/expl/ver/login', (req, res) => {
  return res.send(renderVerLoginView());
});

// POST /expl/ver/login
router.post('/expl/ver/login', verLoginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const user = authenticateVerUser(username, password);

  if (!user) {
    return res.status(401).send(renderVerLoginView({
      error: 'Usuario o contraseña incorrectos para el módulo Ver.'
    }));
  }

  const sessionToken = createVerSessionToken(user.deviceId, user.username);
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  res.setHeader('Set-Cookie', [
    `ver_session=${sessionToken}; Path=/expl/ver; HttpOnly; ${isSecure ? 'Secure;' : ''} SameSite=Lax; Max-Age=2592000`, // 30 días
    `ver_device=${encodeURIComponent(user.deviceId)}; Path=/expl/ver; HttpOnly; ${isSecure ? 'Secure;' : ''} SameSite=Lax; Max-Age=2592000`,
    `ver_user=${encodeURIComponent(user.username)}; Path=/expl/ver; HttpOnly; ${isSecure ? 'Secure;' : ''} SameSite=Lax; Max-Age=2592000`
  ]);

  return res.redirect(303, '/expl/ver');
});

// GET /expl/ver/logout
router.get('/expl/ver/logout', (req, res) => {
  res.setHeader('Set-Cookie', [
    'ver_session=; Path=/expl/ver; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'ver_device=; Path=/expl/ver; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'ver_user=; Path=/expl/ver; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]);
  return res.redirect('/expl/ver/login');
});

// Proteger todas las rutas subsiguientes bajo /expl/ver con el middleware de autenticación
router.use('/expl/ver', verAuthMiddleware);

// GET /expl/ver - Placeholder de la vista del Feed que se conectará en Fases 2, 3 y 4
router.get('/expl/ver', (req, res) => {
  const user = req.verUser;
  return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Ver Media - Feed</title>
  <style>
    body { background:#000; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; padding:20px; }
    .card { background:#111827; border:1px solid #1f2937; border-radius:16px; padding:24px; max-width:400px; width:100%; }
    .badge { background:rgba(16,185,129,0.15); color:#10b981; padding:4px 10px; border-radius:8px; font-weight:700; font-size:0.8rem; display:inline-block; margin-bottom:12px; }
    a { color:#38bdf8; text-decoration:none; font-weight:600; display:inline-block; margin-top:16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Sesión Activa</div>
    <h2>Ver Media (/expl/ver)</h2>
    <p style="color:#9ca3af; font-size:0.9rem; margin-top:8px;">Dispositivo: <strong style="color:#fff;">${user.deviceId}</strong></p>
    <p style="color:#9ca3af; font-size:0.9rem;">Usuario: <strong style="color:#fff;">${user.username}</strong></p>
    <p style="color:#34d399; font-size:0.85rem; margin-top:14px;">Fase 1 completada con éxito. Próximo paso: Motor de recomendación algorítmica y Feed tipo Instagram.</p>
    <a href="/expl/ver/logout">Cerrar Sesión</a>
  </div>
</body>
</html>`);
});

module.exports = router;
