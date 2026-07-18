const express = require('express');
const router = express.Router();

const adminController = require('./admin.controller');
const { auth, rootOnly, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { processRequestSchema } = require('./admin.validation');

// Rutas protegidas por autenticación
router.use(auth);

// Solicitudes de registro
router.get('/requests', hasPermission('manage_registration_requests'), adminController.getRegistrationRequests);
router.post('/requests/invite', hasPermission('manage_registration_requests'), adminController.sendInvitation);
router.get('/requests/invitations', hasPermission('manage_registration_requests'), adminController.getInvitations);
router.post('/requests/:id/reject', hasPermission('manage_registration_requests'), validateBody(processRequestSchema), adminController.rejectRegistrationRequest);
router.post('/requests/:id/approve', hasPermission('manage_registration_requests'), validateBody(processRequestSchema), adminController.approveRegistrationRequest);
router.post('/requests/:id/info-token-preview', hasPermission('manage_registration_requests'), adminController.getInfoRequestPreview);
router.post('/requests/:id/send-info-request', hasPermission('manage_registration_requests'), adminController.sendInfoRequest);
router.get('/requests/:id/history', hasPermission('manage_registration_requests'), adminController.getRequestHistory);
router.patch('/requests/:id/verify-progress', hasPermission('manage_registration_requests'), adminController.updateRequestVerifiedFields);

// Logs de seguridad (rootOnly y permiso view_security_logs)
router.get('/security-logs', rootOnly, hasPermission('view_security_logs'), adminController.getSecurityLogs);

// Estadísticas globales
router.get('/stats', hasPermission('view_analytics'), adminController.getGlobalStats);

// Control de Mantenimiento del Sistema
router.use('/system/maintenance', require('./maintenance.router'));

// Interruptores Financieros del Sistema
router.get('/financial-flags', hasPermission('view_ledger'), adminController.getFinancialFlags);
router.patch('/financial-flags/:key', hasPermission('suspend_withdrawals'), adminController.updateFinancialFlag);

// Edicion de restriccion de interfaz de permisos
router.patch('/permissions/:id', hasPermission('manage_rbac'), adminController.updatePermissionUIMode);

// Plantillas de correo electronico
router.get('/email-templates', hasPermission('manage_email_templates'), adminController.getEmailTemplates);
router.post('/email-templates', hasPermission('manage_email_templates'), adminController.createEmailTemplate);
router.get('/email-templates/:name', hasPermission('manage_email_templates'), adminController.getEmailTemplate);
router.put('/email-templates/:name', hasPermission('manage_email_templates'), adminController.updateEmailTemplate);

// Parametros de protocolo
router.get('/system/parameters', hasPermission('manage_protocol_rules'), adminController.getSystemParameters);
router.patch('/system/parameters', hasPermission('manage_protocol_rules'), adminController.updateSystemParameters);

// Gestión de Menú Dinámico (Navegación del Sistema)
router.get('/system/navigation', hasPermission('manage_system_navigation'), adminController.getSystemNavigation);
router.put('/system/navigation/reorder', hasPermission('manage_system_navigation'), adminController.reorderSystemNavigation);
router.patch('/system/navigation/:id', hasPermission('manage_system_navigation'), adminController.updateSystemNavigationItem);

module.exports = router;

