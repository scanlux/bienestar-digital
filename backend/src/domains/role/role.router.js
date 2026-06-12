const express = require('express');
const router = express.Router();

const roleController = require('./role.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { createRoleSchema, updateRoleSchema, updateUserRolesSchema } = require('./role.validation');

// Todos los endpoints de este router requieren autenticación
router.use(auth);

// 1. GET /permission-categories
router.get('/permission-categories', hasPermission('manage_rbac'), roleController.getPermissionCategories);

// 2. GET /permissions
router.get('/permissions', hasPermission('manage_rbac'), roleController.getPermissions);

// 3. GET /roles
router.get('/roles', hasPermission('manage_rbac'), roleController.getRoles);

// 4. GET /permissions-analysis
router.get('/permissions-analysis', hasPermission('manage_rbac'), roleController.getPermissionsAnalysis);

// 5. POST /roles
router.post('/roles', hasPermission('manage_rbac'), validateBody(createRoleSchema), roleController.createRole);

// 6. PUT /roles/:id
router.put('/roles/:id', hasPermission('manage_rbac'), validateBody(updateRoleSchema), roleController.updateRole);

// 7. DELETE /roles/:id
router.delete('/roles/:id', hasPermission('manage_rbac'), roleController.deleteRole);

// 8. GET /users/:id/roles
router.get('/users/:id/roles', hasPermission('manage_rbac'), roleController.getUserRoles);

// 9. PUT /users/:id/roles
router.put('/users/:id/roles', hasPermission('manage_rbac'), validateBody(updateUserRolesSchema), roleController.updateUserRoles);

module.exports = router;
