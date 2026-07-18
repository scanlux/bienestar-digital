const express = require('express');
const router = express.Router();

const userController = require('./user.controller');
const { auth, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { 
  createAdminSchema, 
  updateAdminSchema, 
  updateAdminStatusSchema, 
  createSystemUserSchema, 
  moderateUserSchema 
} = require('./user.validation');

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

// Enviar correo de recuperacion de contraseña a un administrador de sede
router.post('/store-admins/:id/recovery-email', hasPermission('manage_store_admins'), userController.sendStoreAdminRecoveryEmail);

// Obtener lista de usuarios y sus permisos (requiere privilegios de administracion RBAC)
router.get('/users', hasPermission('manage_rbac'), userController.getUsers);

// Obtener lista de usuarios de sistema
router.get('/system-users', hasPermission('manage_rbac'), userController.getSystemUsers);

// Crear usuario de sistema
router.post('/system-users', hasPermission('create_system_user'), validateBody(createSystemUserSchema), userController.createSystemUser);

// Moderar usuario (ban/unban, bloqueo de contraseña)
router.post('/users/:id/moderate', hasPermission('manage_rbac'), validateBody(moderateUserSchema), userController.moderateUser);

// Obtener historial de moderación de un usuario
router.get('/users/:id/moderation-history', hasPermission('manage_rbac'), userController.getModerationHistory);

// Configuración de PIN Financiero
router.post('/financial-pin', userController.setFinancialPin);

// Desbloqueo y generación de enlaces de PIN por administrador
router.post('/users/:id/unlock-pin', hasPermission('manage_rbac'), userController.unlockFinancialPin);
router.post('/users/:id/reset-pin-link', hasPermission('manage_rbac'), userController.generateResetPinLink);

module.exports = router;

