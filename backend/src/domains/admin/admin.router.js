const express = require('express');
const router = express.Router();

const adminController = require('./admin.controller');
const { auth, rootOnly, hasPermission } = require('../../middleware/auth');
const { validateBody } = require('../../utils/validator');
const { processRequestSchema } = require('./admin.validation');

// Rutas protegidas por autenticación
router.use(auth);

// Solicitudes de registro
router.get('/requests', hasPermission('view_requests'), adminController.getRegistrationRequests);
router.post('/requests/:id/reject', hasPermission('reject_requests'), validateBody(processRequestSchema), adminController.rejectRegistrationRequest);
router.post('/requests/:id/approve', hasPermission('approve_requests'), validateBody(processRequestSchema), adminController.approveRegistrationRequest);

// Logs de seguridad (rootOnly y permiso view_security_logs)
router.get('/security-logs', rootOnly, hasPermission('view_security_logs'), adminController.getSecurityLogs);

// Estadísticas globales
router.get('/stats', hasPermission('view_analytics'), adminController.getGlobalStats);

// Control de Mantenimiento del Sistema
router.use('/system/maintenance', require('./maintenance.router'));

module.exports = router;

