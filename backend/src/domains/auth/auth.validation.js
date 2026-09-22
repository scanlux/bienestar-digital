const loginSchema = {
  email: { type: 'string', required: true },
  password: { type: 'string', required: true }
};

const tokenSyncSchema = {
  email: { type: 'string', required: true },
  firebaseUid: { type: 'string', required: true },
  firebaseIdToken: { type: 'string', required: true }
};

const mobileRegisterSchema = {
  email: { type: 'string', required: true },
  firebaseUid: { type: 'string', required: true },
  firebaseIdToken: { type: 'string', required: true }
};

const mobileRegisterFullSchema = {
  email: { type: 'string', required: true },
  direccion: { type: 'string', required: true },
  celular: { type: 'string', required: true },
  direccion_nombre: { type: 'string', required: false },
  nombres: { type: 'string', required: false },
  apellidos: { type: 'string', required: false },
  nombre: { type: 'string', required: false },
  cedula: { type: 'string', required: false },
  latitud: { type: 'number', required: false },
  longitud: { type: 'number', required: false },
  firebaseUid: { type: 'string', required: false },
  password: { type: 'string', required: false }
};

const resetPasswordSchema = {
  token: { type: 'string', required: true },
  password: { type: 'string', required: true }
};

const activateDriverSchema = {
  aceptar_terminos: { type: 'boolean', required: true }
};

const driverStatusSchema = {
  activo: { type: 'boolean', required: true }
};

const createAddressSchema = {
  direccion: { type: 'string', required: true },
  latitud: { type: 'number', required: true },
  longitud: { type: 'number', required: true },
  label: { type: 'string', required: false },
  is_default: { type: 'boolean', required: false }
};

const updateAddressSchema = {
  direccion: { type: 'string', required: false },
  latitud: { type: 'number', required: false },
  longitud: { type: 'number', required: false },
  label: { type: 'string', required: false }
};

const reportSecurityEventSchema = {
  eventType: { type: 'string', required: true },
  severity: { type: 'string', required: true },
  details: { type: 'object', required: false },
  userId: { type: 'number', required: false }
};

const reportSecurityEventBatchSchema = {
  events: { type: 'array', required: true }
};

module.exports = {
  loginSchema,
  tokenSyncSchema,
  mobileRegisterSchema,
  mobileRegisterFullSchema,
  activateDriverSchema,
  driverStatusSchema,
  createAddressSchema,
  updateAddressSchema,
  resetPasswordSchema,
  reportSecurityEventSchema,
  reportSecurityEventBatchSchema
};
