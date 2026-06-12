const createRoleSchema = {
  name: { type: 'string', required: true },
  code: { type: 'string', required: true },
  description: { type: 'string', required: false },
  permissionIds: { type: 'array', required: false }
};

const updateRoleSchema = {
  name: { type: 'string', required: false },
  description: { type: 'string', required: false },
  permissionIds: { type: 'array', required: false }
};

const updateUserRolesSchema = {
  roleIds: { type: 'array', required: true },
  userType: { type: 'string', required: true }
};

module.exports = {
  createRoleSchema,
  updateRoleSchema,
  updateUserRolesSchema
};
