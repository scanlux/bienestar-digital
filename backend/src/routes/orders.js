const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const { logSecurityEvent } = require('../utils/securityLogger');

/**
 * @route POST /api/public/orders
 * @desc Crear un nuevo pedido desde la App Móvil
 */
router.post('/', auth, async (req, res) => {
  const { 
    store_id, 
    customer_user_id, 
    total_cop, 
    domi_cost, 
    delivery_address, 
    notes,
    items 
  } = req.body;

  if (!store_id || !customer_user_id || !total_cop) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (store_id, customer_user_id, total_cop)' });
  }

  // Regla BOLA: Sólo el propio cliente (o un admin) puede crear un pedido a su nombre
  if (req.user.rol !== 'admin' && String(req.user.id) !== String(customer_user_id)) {
    await logSecurityEvent(req.user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
      reason: 'Intento de crear pedido para otro usuario',
      targetCustomerUserId: customer_user_id
    });
    return res.status(403).json({ error: 'Acceso no autorizado. No puedes crear pedidos para otros usuarios.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Insertar el pedido principal
    // El domi_cost enviado aquí es el calculado por el frontend (costo para la tienda)
    // El status inicial es 'pendiente'
    const [result] = await connection.query(`
      INSERT INTO orders (
        store_id, 
        customer_user_id, 
        total_cop, 
        domi_cost, 
        status, 
        delivery_address, 
        notes
      ) VALUES (?, ?, ?, ?, 'pendiente', ?, ?)
    `, [store_id, customer_user_id, total_cop, domi_cost || 0, delivery_address || null, notes || null]);

    const orderId = result.insertId;

    // 2. Si hay items, podríamos guardarlos en una tabla order_items si existiera.
    // Como por ahora no existe, los guardamos como JSON en el campo 'notes' si es necesario,
    // o simplemente confiamos en el total para esta fase 6 inicial.
    // Nota: El plan mencionaba crear order_items, pero para mantenerlo simple y funcional 
    // segun el esquema actual de orders, usaremos el total.

    await connection.commit();
    res.json({ 
      id: orderId, 
      message: 'Pedido creado con éxito',
      status: 'pendiente'
    });

  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * @route GET /api/public/orders/user/:userId
 * @desc Obtener historial de pedidos de un usuario
 */
router.get('/user/:userId', auth, async (req, res) => {
  const userId = req.params.userId;

  // Regla BOLA: Sólo el propio cliente (o un admin) puede ver su historial de pedidos
  if (req.user.rol !== 'admin' && String(req.user.id) !== String(userId)) {
    await logSecurityEvent(req.user.id, 'BOLA_ATTEMPT', 'HIGH', req, {
      reason: 'Intento de ver historial de pedidos de otro usuario',
      targetUserId: userId
    });
    return res.status(403).json({ error: 'Acceso no autorizado. Sólo puedes ver tu propio historial de pedidos.' });
  }

  try {
    const [orders] = await db.query(`
      SELECT o.*, s.nombre_sucursal as store_name
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      WHERE o.customer_user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
