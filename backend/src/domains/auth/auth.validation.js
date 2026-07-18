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
  celular: { type: 'string', required: true }
};

const activateDriverSchema = {
  aceptar_terminos: { type: 'boolean', required: true }
};

const driverStatusSchema = {
  activo: { type: 'boolean', required: true }
};

module.exports = {
  loginSchema,
  tokenSyncSchema,
  mobileRegisterSchema,
  mobileRegisterFullSchema,
  activateDriverSchema,
  driverStatusSchema
};
