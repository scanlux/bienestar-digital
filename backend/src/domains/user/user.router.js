const express = require('express');
const router = express.Router();

const userController = require('./user.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { createAdminSchema, updateAdminSchema, updateAdminStatusSchema } = require('./user.validation');

// Rutas protegidas por autenticación
router.use(auth);

// Obtener administradores de sede de mi comercio
router.get('/store-admins', hasPermission('view_store_admins'), userController.getStoreAdmins);

// Crear administrador de sede
router.post('/store-admins', hasPermission('manage_store_admins'), validateBody(createAdminSchema), userController.createStoreAdmin);

// Actualizar administrador de sede
router.put('/store-admins/:id', hasPermission('manage_store_admins'), validateBody(updateAdminSchema), userController.updateStoreAdmin);

// Cambiar estado (activo/inactivo) de un administrador de sede
router.put('/store-admins/:id/status', hasPermission('manage_store_admins'), validateBody(updateAdminStatusSchema), userController.updateStoreAdminStatus);

// Obtener lista de usuarios y sus permisos (requiere privilegios de administracion RBAC)
router.get('/users', hasPermission('manage_rbac'), userController.getUsers);

module.exports = router;

