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

module.exports = {
  createAdminSchema,
  updateAdminSchema,
  updateAdminStatusSchema
};
