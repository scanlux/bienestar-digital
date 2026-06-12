const { ValidationError } = require('./errors');

/**
 * Middleware de validación declarativo y ligero.
 * @param {Object} schema - Esquema de validación con restricciones por campo.
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      for (const [key, rules] of Object.entries(schema)) {
        const value = req.body[key];
        
        // 1. Validar requeridos
        if (rules.required && (value === undefined || value === null || value === '')) {
          throw new ValidationError(`El campo '${key}' es requerido.`);
        }
        
        if (value !== undefined && value !== null && value !== '') {
          // 2. Validar tipos de datos
          if (rules.type === 'number' && isNaN(Number(value))) {
            throw new ValidationError(`El campo '${key}' debe ser numérico.`);
          }
          if (rules.type === 'string' && typeof value !== 'string') {
            throw new ValidationError(`El campo '${key}' debe ser texto.`);
          }
          if (rules.type === 'array' && !Array.isArray(value)) {
            throw new ValidationError(`El campo '${key}' debe ser una lista.`);
          }
          if (rules.type === 'boolean' && typeof value !== 'boolean' && value !== 0 && value !== 1 && value !== '0' && value !== '1') {
            throw new ValidationError(`El campo '${key}' debe ser booleano.`);
          }
          
          // 3. Validar patrones (Regex)
          if (rules.pattern && !rules.pattern.test(value)) {
            throw new ValidationError(`El campo '${key}' no tiene un formato válido.`);
          }
        }
      }
      next();
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  };
};

module.exports = { validateBody };
