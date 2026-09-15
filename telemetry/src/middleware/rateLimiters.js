const rateLimit = require('express-rate-limit');

const publicRequestsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Demasiadas solicitudes de registro desde esta dirección IP. Por favor intente más tarde.' }
});

module.exports = {
  publicRequestsLimiter
};
