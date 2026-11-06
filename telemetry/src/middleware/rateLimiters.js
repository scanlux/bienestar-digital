const rateLimit = require('express-rate-limit');
const { renderExplLoginPage } = require('../views/loginView');

const publicRequestsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de registro desde esta dirección IP. Por favor intente más tarde.' }
});

// Limitador optimizado de intentos de login en el explorador (10 intentos fallidos en 5 min)
const explLoginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // Máximo 10 intentos fallidos por ventana por IP
  skipSuccessfulRequests: true, // No cuenta logins exitosos
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429);
    if (req.accepts('html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(renderExplLoginPage('Demasiados intentos fallidos de inicio de sesión desde esta IP. Por favor intente más tarde (5 min).'));
    }
    return res.json({ error: 'Demasiados intentos fallidos de inicio de sesión. Por favor intente nuevamente en 5 minutos.' });
  }
});

// Limitador de tasa general para el explorador (120 req / min)
const explGeneralLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120, // 120 peticiones por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes recibidas. Por favor espere un momento antes de continuar.' }
});

module.exports = {
  publicRequestsLimiter,
  explLoginLimiter,
  explGeneralLimiter
};
