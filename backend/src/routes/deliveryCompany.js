const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// Middleware to restrict access to delivery company admins or system users
const isDeliveryCompanyAdminOrSystem = (req, res, next) => {
  const isSystem = req.user.actorType === 'system_user';
  const isDeliveryAdmin = req.user.rol === 'admin' && req.user.adminType === 'delivery_company';
  if (isSystem || isDeliveryAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requiere ser Administrador de Empresa de Delivery o Soporte.' });
  }
};

router.use(auth);
router.use(isDeliveryCompanyAdminOrSystem);

// @route   GET /api/delivery-company/drivers
// @desc    Obtener lista de repartidores afiliados a esta empresa
router.get('/drivers', async (req, res) => {
  const isSystem = req.user.actorType === 'system_user';
  const deliveryCompanyId = isSystem ? req.query.deliveryCompanyId : req.user.deliveryCompanyId;

  if (!deliveryCompanyId) {
    return res.status(400).json({ error: 'deliveryCompanyId es requerido.' });
  }

  try {
    const [drivers] = await db.query(`
      SELECT u.id, p.nombres, p.apellidos, p.cedula, p.telefono, u.repartidor_activo
      FROM users u
      JOIN profiles p ON p.usuario_id = u.id
      WHERE p.delivery_company_id = ? AND u.es_repartidor = 1
    `, [deliveryCompanyId]);

    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/delivery-company/drivers
// @desc    Afiliar a un repartidor por cédula
router.post('/drivers', async (req, res) => {
  const { cedula } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  const deliveryCompanyId = isSystem ? req.body.deliveryCompanyId : req.user.deliveryCompanyId;

  if (!cedula) {
    return res.status(400).json({ error: 'Cédula es requerida.' });
  }

  if (!deliveryCompanyId) {
    return res.status(400).json({ error: 'deliveryCompanyId es requerido.' });
  }

  try {
    // 1. Buscar al conductor por cédula
    const [drivers] = await db.query(`
      SELECT u.id, u.es_repartidor, p.delivery_company_id, p.nombres, p.apellidos
      FROM users u
      JOIN profiles p ON p.usuario_id = u.id
      WHERE p.cedula = ?
    `, [cedula]);

    const driver = drivers[0];
    if (!driver) {
      return res.status(404).json({ error: 'No se encontró ningún repartidor con la cédula provista.' });
    }

    if (driver.es_repartidor !== 1) {
      return res.status(400).json({ error: 'El usuario asociado a esta cédula no tiene habilitado el modo de repartidor.' });
    }

    if (driver.delivery_company_id !== null) {
      if (driver.delivery_company_id === parseInt(deliveryCompanyId, 10)) {
        return res.status(400).json({ error: 'El repartidor ya se encuentra afiliado a tu empresa.' });
      }
      return res.status(400).json({ error: 'El repartidor ya está afiliado a otra empresa de delivery.' });
    }

    // 2. Asociar repartidor
    await db.query(
      'UPDATE profiles SET delivery_company_id = ? WHERE usuario_id = ?',
      [deliveryCompanyId, driver.id]
    );

    res.json({ success: true, message: `Repartidor ${driver.nombres} ${driver.apellidos} afiliado exitosamente.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/delivery-company/drivers/:userId
// @desc    Desvincular a un repartidor de la empresa
router.delete('/drivers/:userId', async (req, res) => {
  const { userId } = req.params;
  const isSystem = req.user.actorType === 'system_user';
  const deliveryCompanyId = isSystem ? req.query.deliveryCompanyId : req.user.deliveryCompanyId;

  if (!deliveryCompanyId) {
    return res.status(400).json({ error: 'deliveryCompanyId es requerido.' });
  }

  try {
    // Verificar que el repartidor está afiliado a esta empresa
    const [profiles] = await db.query(
      'SELECT delivery_company_id FROM profiles WHERE usuario_id = ?',
      [userId]
    );

    const profile = profiles[0];
    if (!profile) {
      return res.status(404).json({ error: 'Perfil de repartidor no encontrado.' });
    }

    if (profile.delivery_company_id !== parseInt(deliveryCompanyId, 10) && !isSystem) {
      return res.status(403).json({ error: 'No tienes permiso para desafiliar a este repartidor.' });
    }

    // Desasociar repartidor
    await db.query(
      'UPDATE profiles SET delivery_company_id = NULL WHERE usuario_id = ?',
      [userId]
    );

    res.json({ success: true, message: 'Repartidor desafiliado exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
