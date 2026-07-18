const createAdminSchema = {
  email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: 'string', required: true },
  nombres: { type: 'string', required: true }
};

const updateAdminSchema = {
  nombres: { type: 'string', required: true }
};

const updateAdminStatusSchema = {
  estado: { type: 'string', required: true }
};

const createSystemUserSchema = {
  email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: 'string', required: true },
  nombres: { type: 'string', required: true },
  apellidos: { type: 'string', required: true },
  nivel: { type: 'string', required: false },
  roleIds: { type: 'array', required: false }
};

const moderateUserSchema = {
  userType: { type: 'string', required: true },
  action: { type: 'string', required: true },
  reason: { type: 'string', required: true }
};

module.exports = {
  createAdminSchema,
  updateAdminSchema,
  updateAdminStatusSchema,
  createSystemUserSchema,
  moderateUserSchema
};
