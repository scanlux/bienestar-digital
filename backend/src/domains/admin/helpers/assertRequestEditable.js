const { BusinessError } = require('../../../utils/errors');

/**
 * Valida si una solicitud de afiliación está en un estado editable (pendiente o en espera de información).
 * Lanza un error si ya está resuelta.
 */
function assertRequestEditable(request) {
  if (!request) {
    throw new BusinessError('La solicitud no existe.', 404);
  }
  const status = request.estado;
  if (status !== 'pendiente' && status !== 'espera_informacion') {
    throw new BusinessError(`La solicitud ya está resuelta. Estado actual: ${status}`, 400);
  }
}

module.exports = assertRequestEditable;
