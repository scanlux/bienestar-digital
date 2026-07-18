const express = require('express');
const router = express.Router();
const notificationService = require('../../services/notificationService');
const { auth } = require('../../middleware/auth');

// Rutas protegidas por autenticación
router.use(auth);

// Obtener notificaciones no leídas del usuario
router.get('/', async (req, res) => {
  try {
    const result = await notificationService.getUnreadForUser(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar notificación específica como leída
router.patch('/:id/read', async (req, res) => {
  try {
    const success = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success, message: success ? 'Notificación marcada como leída.' : 'No se pudo marcar como leída.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marcar todas las notificaciones del usuario como leídas
router.patch('/read-all', async (req, res) => {
  try {
    const success = await notificationService.markAllAsRead(req.user.id);
    res.json({ success, message: success ? 'Todas las notificaciones marcadas como leídas.' : 'No había notificaciones por leer.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
