class BusinessError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ForbiddenError extends BusinessError {
  constructor(message = 'Acceso no autorizado.') {
    super(message, 403);
  }
}

class NotFoundError extends BusinessError {
  constructor(message = 'Recurso no encontrado.') {
    super(message, 404);
  }
}

class ValidationError extends BusinessError {
  constructor(message) {
    super(message, 400);
  }
}

const handleControllerError = (res, error) => {
  console.error(`[ERROR] ${error.name || 'Error'}: ${error.message}`);
  
  if (error instanceof BusinessError) {
    return res.status(error.status).json({ error: error.message });
  }
  
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ error: 'Llave duplicada: El recurso o parte de sus campos ya están asociados a otra entidad.' });
  }
  
  res.status(500).json({ error: error.message || 'Error interno del servidor.' });
};

module.exports = {
  BusinessError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  handleControllerError
};
