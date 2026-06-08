const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly, systemOnly, systemOrAdmin, rootOnly, hasPermission } = require('../middleware/auth');
const { isStoreCurrentlyOpen } = require('../utils/timeUtils');
const domiEngine = require('../services/domiEngine');
const { logSecurityEvent } = require('../utils/securityLogger');

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Aplicar middleware de autenticación a todas las rutas de este archivo
router.use(auth);

// Helper check for Commerce Manager or Admin
const isCommerceManagerOrAdmin = (req, res, next) => {
  const isSystem = req.user.actorType === 'system_user';
  const isCommerceAdmin = req.user.rol === 'admin' && req.user.adminType === 'commerce';
  if (isSystem || isCommerceAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador o Gerente de Comercio.' });
  }
};

// --- ENDPOINTS PARA GERENTE DE COMERCIO Y ADMIN ---

// Obtener mis sedes (las sedes del comercio del gerente o todas si es admin)
router.get('/my-stores', isCommerceManagerOrAdmin, async (req, res) => {
  try {
    let query = 'SELECT * FROM stores';
    const params = [];
    
    const isSystem = req.user.actorType === 'system_user';
    if (!isSystem) {
      query += ' WHERE commerce_id = ?';
      params.push(req.user.commerceId);
    } else if (req.query.commerceId) {
      query += ' WHERE commerce_id = ?';
      params.push(req.query.commerceId);
    }
    
    const [stores] = await db.query(query, params);
    for (let store of stores) {
      const [schedule] = await db.query('SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', [store.id]);
      store.schedule = schedule;
      store.is_currently_open = isStoreCurrentlyOpen(store.estado, schedule);
    }
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener administradores de sede de mi comercio
router.get('/store-admins', isCommerceManagerOrAdmin, async (req, res) => {
  try {
    let query = `
      SELECT u.id, u.email, u.rol, u.estado, 
             p.nombres, p.apellidos, p.telefono,
             c.id AS commerce_id
      FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN commerces c ON c.usuario_id = u.id
      WHERE u.rol = 'admin'
    `;
    const params = [];

    const isSystem = req.user.actorType === 'system_user';
    if (!isSystem) {
      query += ' AND c.id = ?';
      params.push(req.user.commerceId);
    }

    const [users] = await db.query(query, params);

    // Mapear y adjuntar storeIds asignados
    const mappedAdmins = [];
    for (const u of users) {
      if (u.id === req.user.id) continue;

      const [assignedStores] = await db.query('SELECT store_id FROM user_stores WHERE user_id = ?', [u.id]);
      const storeIds = assignedStores.map(s => s.store_id);

      mappedAdmins.push({
        id: u.id,
        email: u.email,
        nombre: `${u.nombres || ''} ${u.apellidos || ''}`.trim() || 'Administrador',
        nombres: u.nombres,
        apellidos: u.apellidos,
        telefono: u.telefono,
        rol: u.rol,
        estado: u.estado,
        commerce_id: u.commerce_id,
        storeIds
      });
    }

    res.json(mappedAdmins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear administrador de sede
router.post('/store-admins', isCommerceManagerOrAdmin, async (req, res) => {
  const { email, password, nombres, apellidos, celular, storeIds } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  let commerce_id = isSystem ? req.body.commerce_id : req.user.commerceId;

  if (!email || !password || !nombres || !commerce_id) {
    return res.status(400).json({ error: 'Email, contraseña, nombres y commerce_id son obligatorios.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar si el usuario ya existe
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Insertar usuario base
    const [result] = await connection.query(
      'INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, "admin", "activo")',
      [email, passwordHash]
    );
    const newUserId = result.insertId;

    // 2. Insertar perfil (mapeando celular de la petición a telefono en profiles)
    await connection.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
      [
        newUserId,
        nombres,
        apellidos || null,
        `REG_ADM_${newUserId}`,
        celular || `300${String(newUserId).padStart(7, '0')}`
      ]
    );

    // 3. Vincular el usuario administrador al comercio si no está asignado
    const [commerces] = await connection.query('SELECT usuario_id FROM commerces WHERE id = ?', [commerce_id]);
    if (commerces.length > 0 && commerces[0].usuario_id === null) {
      await connection.query('UPDATE commerces SET usuario_id = ? WHERE id = ?', [newUserId, commerce_id]);
    }

    // 4. Insertar relaciones user_stores
    if (storeIds && Array.isArray(storeIds) && storeIds.length > 0) {
      // Validar que las sedes pertenecen al comercio
      const [validStores] = await connection.query(
        'SELECT id FROM stores WHERE id IN (?) AND commerce_id = ?',
        [storeIds, commerce_id]
      );
      const validStoreIds = validStores.map(s => s.id);

      if (validStoreIds.length > 0) {
        const values = validStoreIds.map(sid => [newUserId, sid]);
        await connection.query('INSERT INTO user_stores (user_id, store_id) VALUES ?', [values]);
      }
    }

    await logSecurityEvent(
      req.user.id,
      'CREATE_STORE_ADMIN',
      'HIGH',
      req,
      { adminUserId: newUserId, email, storeIds },
      'user',
      newUserId
    );

    await connection.commit();
    res.status(201).json({ id: newUserId, message: 'Administrador de sede creado con éxito.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Actualizar administrador de sede
router.put('/store-admins/:id', isCommerceManagerOrAdmin, async (req, res) => {
  const adminId = req.params.id;
  const { nombres, apellidos, celular, storeIds, password } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar existencia
    const [existingUsers] = await connection.query('SELECT id, rol FROM users WHERE id = ? AND rol = "admin"', [adminId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'Administrador de sede no encontrado.' });
    }

    // Obtener el comercio del administrador a modificar
    const [commerces] = await connection.query('SELECT id FROM commerces WHERE usuario_id = ?', [adminId]);
    const adminCommerceId = commerces.length > 0 ? commerces[0].id : null;

    const isSystem = req.user.actorType === 'system_user';
    if (!isSystem && adminCommerceId !== req.user.commerceId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este administrador.' });
    }

    // Actualizar contraseña si viene
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, adminId]);
    }

    // Actualizar datos de perfil (mapeando celular a telefono en profiles)
    await connection.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos), telefono = VALUES(telefono)',
      [
        adminId,
        nombres,
        apellidos || null,
        `REG_ADM_${adminId}`,
        celular || `300${String(adminId).padStart(7, '0')}`
      ]
    );

    // Actualizar relaciones user_stores
    await connection.query('DELETE FROM user_stores WHERE user_id = ?', [adminId]);

    if (storeIds && Array.isArray(storeIds) && storeIds.length > 0) {
      const isSystem = req.user.actorType === 'system_user';
      const targetCommerce = isSystem ? adminCommerceId : req.user.commerceId;
      const [validStores] = await connection.query(
        'SELECT id FROM stores WHERE id IN (?) AND commerce_id = ?',
        [storeIds, targetCommerce]
      );
      const validStoreIds = validStores.map(s => s.id);

      if (validStoreIds.length > 0) {
        const values = validStoreIds.map(sid => [adminId, sid]);
        await connection.query('INSERT INTO user_stores (user_id, store_id) VALUES ?', [values]);
      }
    }

    await connection.commit();
    res.json({ message: 'Administrador de sede actualizado con éxito.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Cambiar estado (activo/inactivo) de un administrador de sede
router.put('/store-admins/:id/status', isCommerceManagerOrAdmin, async (req, res) => {
  const adminId = req.params.id;
  const { estado } = req.body;

  if (!['activo', 'inactivo'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser activo o inactivo.' });
  }

  try {
    const [existingUsers] = await db.query('SELECT id FROM users WHERE id = ? AND rol = "admin"', [adminId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'Administrador de sede no encontrado.' });
    }

    const [commerces] = await db.query('SELECT id FROM commerces WHERE usuario_id = ?', [adminId]);
    const adminCommerceId = commerces.length > 0 ? commerces[0].id : null;

    const isSystem = req.user.actorType === 'system_user';
    if (!isSystem && adminCommerceId !== req.user.commerceId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este administrador.' });
    }

    await db.query('UPDATE users SET estado = ? WHERE id = ?', [estado, adminId]);

    await logSecurityEvent(
      req.user.id,
      'CHANGE_STORE_ADMIN_STATUS',
      'MEDIUM',
      req,
      { targetUserId: parseInt(adminId), newStatus: estado },
      'user',
      parseInt(adminId)
    );

    res.json({ message: `Administrador de sede actualizado a estado: ${estado}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Comprar/renovar plan empresarial debitando DOMIs
router.post('/plans/subscribe', isCommerceManagerOrAdmin, async (req, res) => {
  const { storeId } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = isSystem ? req.body.commerceId : req.user.commerceId;

  if (!storeId || !commerceId) {
    return res.status(400).json({ error: 'storeId y commerceId son requeridos.' });
  }

  try {
    // 1. Validar que la sede pertenece al comercio
    const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
    if (stores.length === 0) {
      return res.status(403).json({ error: 'La sede especificada no pertenece al comercio autorizado.' });
    }

    // 2. Debitar 50 DOMIs usando el motor de cobros
    try {
      await domiEngine.chargeStoreSubscription(commerceId, storeId, 50.00);
    } catch (engineErr) {
      if (engineErr.message.includes('Saldo insuficiente')) {
        return res.status(402).json({ error: engineErr.message });
      }
      throw engineErr;
    }

    // 3. Crear vigencia en la tabla de planes (30 días)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);

    const [planResult] = await db.query(`
      INSERT INTO commerce_plans (commerce_id, plan_type, status, price_paid_domis, start_date, end_date, payment_ref)
      VALUES (?, 'Empresarial', 'active', 50.00, ?, ?, ?)
    `, [commerceId, startDate, endDate, `DOMI-SUB-${storeId}-${Date.now()}`]);

    // 4. Actualizar tipo de comercio a Empresarial
    await db.query('UPDATE commerces SET type = "Empresarial" WHERE id = ?', [commerceId]);

    await logSecurityEvent(
      req.user.id,
      'SUBSCRIBE_PLAN',
      'HIGH',
      req,
      { storeId, commerceId, planId: planResult.insertId },
      'store',
      parseInt(storeId)
    );

    res.json({
      success: true,
      message: 'Suscripción mensual al plan Empresarial activada con éxito.',
      planId: planResult.insertId,
      startDate,
      endDate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar el modo de aceptación de pedidos de una sede
router.patch('/stores/:storeId/order-acceptance', isCommerceManagerOrAdmin, async (req, res) => {
  const { storeId } = req.params;
  const { acceptanceMode } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = isSystem ? req.body.commerceId : req.user.commerceId;

  if (!acceptanceMode || !['automatico', 'manual'].includes(acceptanceMode)) {
    return res.status(400).json({ error: 'acceptanceMode es requerido y debe ser "automatico" o "manual".' });
  }

  try {
    // Validar pertenencia de la sede al comercio
    const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
    if (stores.length === 0) {
      return res.status(403).json({ error: 'La sede especificada no pertenece al comercio autorizado o no existe.' });
    }

    // Actualizar el modo de aceptación
    await db.query('UPDATE stores SET acceptance_mode = ? WHERE id = ?', [acceptanceMode, storeId]);

    await logSecurityEvent(
      req.user.id,
      'CHANGE_ORDER_ACCEPTANCE',
      'LOW',
      req,
      { storeId: parseInt(storeId), acceptanceMode },
      'store',
      parseInt(storeId)
    );

    res.json({
      success: true,
      message: `Modo de aceptación de pedidos configurado en: ${acceptanceMode}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar un nuevo video para subir
router.post('/videos', isCommerceManagerOrAdmin, async (req, res) => {
  const { title, description } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = isSystem ? req.body.commerceId : req.user.commerceId;

  if (!title || !commerceId) {
    return res.status(400).json({ error: 'title y commerceId son requeridos.' });
  }

  try {
    // 1. Validar que el comercio es Empresarial
    const [commerces] = await db.query('SELECT type FROM commerces WHERE id = ?', [commerceId]);
    if (commerces.length === 0) {
      return res.status(404).json({ error: 'Comercio no encontrado.' });
    }

    if (commerces[0].type !== 'Empresarial') {
      return res.status(403).json({ error: 'Solo los comercios con plan Empresarial activo pueden subir videos.' });
    }

    // 2. Registrar el video
    const [result] = await db.query(`
      INSERT INTO commerce_videos (commerce_id, title, description, status)
      VALUES (?, ?, ?, 'uploading')
    `, [commerceId, title, description || null]);

    await logSecurityEvent(
      req.user.id,
      'CREATE_VIDEO',
      'LOW',
      req,
      { videoId: result.insertId, commerceId, title },
      'commerce',
      commerceId
    );

    res.status(201).json({
      success: true,
      videoId: result.insertId,
      message: 'Registro de video creado. Proceda a subir los archivos.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activar video una vez codificado
router.patch('/videos/:id/active', isCommerceManagerOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { url_high, url_low, url_mid } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = isSystem ? req.body.commerceId : req.user.commerceId;

  if (!url_high) {
    return res.status(400).json({ error: 'url_high es requerida para activar el video.' });
  }

  try {
    // Validar pertenencia del video al comercio del usuario
    const [videos] = await db.query('SELECT id, commerce_id FROM commerce_videos WHERE id = ?', [id]);
    if (videos.length === 0) {
      return res.status(404).json({ error: 'Video no encontrado.' });
    }

    if (!isSystem && videos[0].commerce_id !== commerceId) {
      return res.status(403).json({ error: 'No autorizado para modificar este video.' });
    }

    // Actualizar urls y estado a active
    await db.query(`
      UPDATE commerce_videos 
      SET url_high = ?, url_low = ?, url_mid = ?, status = 'active'
      WHERE id = ?
    `, [url_high, url_low || null, url_mid || null, id]);

    res.json({
      success: true,
      message: 'Video activado con éxito en la plataforma.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un video
router.delete('/videos/:id', isCommerceManagerOrAdmin, async (req, res) => {
  const { id } = req.params;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = isSystem ? req.body.commerceId : req.user.commerceId;

  try {
    const [videos] = await db.query('SELECT id, commerce_id FROM commerce_videos WHERE id = ?', [id]);
    if (videos.length === 0) {
      return res.status(404).json({ error: 'Video no encontrado.' });
    }

    if (!isSystem && videos[0].commerce_id !== commerceId) {
      return res.status(403).json({ error: 'No autorizado para eliminar este video.' });
    }

    // Marcar como deleted
    await db.query("UPDATE commerce_videos SET status = 'deleted' WHERE id = ?", [id]);

    await logSecurityEvent(
      req.user.id,
      'DELETE_VIDEO',
      'MEDIUM',
      req,
      { videoId: parseInt(id), commerceId: videos[0].commerce_id },
      'commerce',
      videos[0].commerce_id
    );

    res.json({
      success: true,
      message: 'Video eliminado con éxito.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- SECCIÓN SOLICITUDES DE REGISTRO (SYSTEM ONLY) ---

// Obtener todas las solicitudes de registro
router.get('/requests', systemOnly, async (req, res) => {
  const { estado } = req.query;
  try {
    let query = 'SELECT * FROM registration_requests';
    const params = [];
    if (estado) {
      query += ' WHERE estado = ?';
      params.push(estado);
    }
    query += ' ORDER BY created_at DESC';
    const [requests] = await db.query(query, params);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rechazar solicitud de registro
router.post('/requests/:id/reject', systemOnly, async (req, res) => {
  const { id } = req.params;
  const { notas_system } = req.body;
  try {
    const [existing] = await db.query('SELECT estado FROM registration_requests WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }
    if (existing[0].estado !== 'pendiente') {
      return res.status(400).json({ error: `La solicitud no se puede rechazar porque su estado es: ${existing[0].estado}` });
    }

    await db.query(
      'UPDATE registration_requests SET estado = "rechazado", notas_system = ? WHERE id = ?',
      [notas_system || null, id]
    );

    await logSecurityEvent(
      req.user.id,
      'REJECT_REGISTRATION_REQUEST',
      'MEDIUM',
      req,
      { requestId: id, notas_system },
      'request',
      parseInt(id)
    );

    res.json({ success: true, message: 'Solicitud rechazada con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar solicitud de registro (Creación atómica de negocio)
router.post('/requests/:id/approve', systemOnly, async (req, res) => {
  const { id } = req.params;
  const { notas_system } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener la solicitud
    const [requests] = await connection.query('SELECT * FROM registration_requests WHERE id = ? FOR UPDATE', [id]);
    const request = requests[0];
    if (!request) {
      connection.release();
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    if (request.estado !== 'pendiente') {
      connection.release();
      return res.status(400).json({ error: `La solicitud ya no está pendiente. Estado actual: ${request.estado}` });
    }

    // 2. Verificar que el correo no esté ocupado en users
    const [existingUsers] = await connection.query('SELECT id FROM users WHERE email = ?', [request.email_contacto]);
    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'El correo electrónico del contacto ya se encuentra registrado.' });
    }

    // 3. Crear usuario admin
    const defaultPasswordHash = await bcrypt.hash('admin123', 10);
    const [userResult] = await connection.query(
      'INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, "admin", "activo")',
      [request.email_contacto, defaultPasswordHash]
    );
    const newUserId = userResult.insertId;

    // 4. Crear perfil de usuario
    await connection.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
      [
        newUserId,
        request.nombres_contacto,
        request.apellidos_contacto,
        request.nit, // Usamos nit como cédula de contacto inicial
        request.celular_contacto
      ]
    );

    // 5. Crear la entidad de negocio respectiva
    if (request.tipo_solicitud === 'commerce') {
      await connection.query(
        'INSERT INTO commerces (usuario_id, nombre, nit, status, email) VALUES (?, ?, ?, "active", ?)',
        [newUserId, request.razon_social, request.nit, request.email_contacto]
      );
    } else if (request.tipo_solicitud === 'delivery_company') {
      await connection.query(
        'INSERT INTO delivery_companies (usuario_id, nit, razon_social, estado) VALUES (?, ?, ?, "activo")',
        [newUserId, request.nit, request.razon_social]
      );
    }

    // 6. Actualizar el estado de la solicitud
    await connection.query(
      'UPDATE registration_requests SET estado = "aprobado", notas_system = ? WHERE id = ?',
      [notas_system || null, id]
    );

    await connection.commit();

    await logSecurityEvent(
      req.user.id,
      'APPROVE_REGISTRATION_REQUEST',
      'HIGH',
      req,
      { requestId: id, tipo: request.tipo_solicitud, razon_social: request.razon_social },
      'request',
      parseInt(id)
    );

    res.json({ success: true, message: 'Solicitud aprobada y negocio creado exitosamente.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error approving request:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Obtener logs de auditoría de seguridad (exclusivo para Root de sistema)
router.get('/security-logs', rootOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const eventType = req.query.eventType;
    const severity = req.query.severity;
    const resourceType = req.query.resourceType;
    const resourceId = req.query.resourceId;
    const actorType = req.query.actorType;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    
    let query = `
      SELECT s.*, 
             COALESCE(u.email, su.email) AS actor_email,
             COALESCE(p.nombres, su.nombres) AS actor_nombre 
      FROM security_audit_logs s
      LEFT JOIN users u ON s.actor_type = 'user' AND s.actor_id = u.id
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN system_users su ON s.actor_type = 'system_user' AND s.actor_id = su.id
    `;
    const params = [];
    const conditions = [];

    if (eventType) {
      conditions.push('s.event_type = ?');
      params.push(eventType);
    }
    if (severity) {
      conditions.push('s.severity = ?');
      params.push(severity);
    }
    if (resourceType) {
      conditions.push('s.resource_type = ?');
      params.push(resourceType);
    }
    if (resourceId) {
      conditions.push('s.resource_id = ?');
      params.push(parseInt(resourceId, 10));
    }
    if (actorType) {
      conditions.push('s.actor_type = ?');
      params.push(actorType);
    }
    if (dateFrom) {
      conditions.push('s.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('s.created_at <= ?');
      params.push(dateTo);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [logs] = await db.query(query, params);

    // Obtener total para paginación
    let countQuery = 'SELECT COUNT(*) as total FROM security_audit_logs s';
    const countParams = [];
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
      countParams.push(...params.slice(0, -2)); // excluir limit/offset
    }
    const [[{ total }]] = await db.query(countQuery, countParams);

    res.json({ logs, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SECCIÓN SYSTEM OR ADMIN ---
router.use(systemOrAdmin);

// --- CATÁLOGO DE PAGOS ---

router.get('/payment-platforms', async (req, res) => {
  try {
    const [platforms] = await db.query('SELECT * FROM payment_platforms ORDER BY nombre ASC');
    res.json(platforms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- COMERCIOS (COMMERCES) ---

// Obtener todos los comercios (con filtro de status)
router.get('/commerces', async (req, res) => {
  const { status } = req.query;
  try {
    let query = 'SELECT * FROM commerces';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY orden ASC';
    
    const [commerces] = await db.query(query, params);
    res.json(commerces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un comercio por ID
router.get('/commerces/:id', async (req, res) => {
  try {
    const [commerces] = await db.query('SELECT * FROM commerces WHERE id = ?', [req.params.id]);
    if (commerces.length === 0) return res.status(404).json({ error: 'Comercio no encontrado' });
    res.json(commerces[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas globales para el dashboard
router.get('/stats', async (req, res) => {
  try {
    const [[{ commercesCount }]] = await db.query("SELECT COUNT(*) as commercesCount FROM commerces WHERE status = 'active'");
    const [[{ pendingCount }]] = await db.query("SELECT COUNT(*) as pendingCount FROM registration_requests WHERE estado = 'pendiente'");
    const [[{ storesCount }]] = await db.query("SELECT COUNT(*) as storesCount FROM stores");
    const [[{ productsCount }]] = await db.query("SELECT COUNT(*) as productsCount FROM products");
    // Mocking orders for now, will implement real count when table exists
    const ordersCount = 0; 

    res.json({
      activeCommerces: commercesCount,
      pendingRequests: pendingCount,
      totalStores: storesCount,
      totalProducts: productsCount,
      totalOrders: ordersCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo comercio
router.post('/commerces', async (req, res) => {
  const { nombre, nit, nit_dv, telefono, ciudad, direccion, descripcion, logo_url, type, orden, usuario_id, admin_nombres, admin_apellidos } = req.body;
  
  try {
    // Validar si el usuario ya tiene un comercio asignado
    if (usuario_id) {
      const [existing] = await db.query('SELECT id FROM commerces WHERE usuario_id = ?', [usuario_id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Este usuario ya tiene un comercio asignado.' });
      }
    }

    // Validar si el NIT ya está registrado
    if (nit) {
      const [existingNit] = await db.query('SELECT id FROM commerces WHERE nit = ?', [nit]);
      if (existingNit.length > 0) {
        return res.status(400).json({ error: 'El NIT provisto ya se encuentra registrado.' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO commerces (nombre, nit, nit_dv, telefono, ciudad, direccion, descripcion, logo_url, type, orden, usuario_id, admin_nombres, admin_apellidos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, nit, nit_dv || null, telefono, ciudad, direccion, descripcion, logo_url, type || 'horizontal', orden || 0, usuario_id || null, admin_nombres || null, admin_apellidos || null]
    );
    const commerceId = result.insertId;

    await logSecurityEvent(
      req.user.id,
      'CREATE_COMMERCE',
      'HIGH',
      req,
      { commerceId, nombre, nit },
      'commerce',
      commerceId
    );

    res.json({ id: commerceId, message: 'Comercio creado con éxito' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Llave duplicada: El NIT o el Administrador ya están asociados a otro comercio.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un comercio
router.put('/commerces/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, nit, nit_dv, telefono, ciudad, direccion, descripcion, logo_url, type, orden, usuario_id, admin_nombres, admin_apellidos } = req.body;
  try {
    // Validar si el usuario ya tiene otro comercio asignado
    if (usuario_id) {
      const [existing] = await db.query('SELECT id FROM commerces WHERE usuario_id = ? AND id <> ?', [usuario_id, id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Este usuario ya tiene otro comercio asignado.' });
      }
    }

    // Validar si el NIT ya está registrado en otro comercio
    if (nit) {
      const [existingNit] = await db.query('SELECT id FROM commerces WHERE nit = ? AND id <> ?', [nit, id]);
      if (existingNit.length > 0) {
        return res.status(400).json({ error: 'El NIT provisto ya se encuentra registrado en otro comercio.' });
      }
    }

    await db.query(
      'UPDATE commerces SET nombre=?, nit=?, nit_dv=?, telefono=?, ciudad=?, direccion=?, descripcion=?, logo_url=?, type=?, orden=?, usuario_id=?, admin_nombres=?, admin_apellidos=? WHERE id=?',
      [nombre, nit, nit_dv || null, telefono, ciudad, direccion, descripcion, logo_url, type, orden, usuario_id || null, admin_nombres || null, admin_apellidos || null, id]
    );

    await logSecurityEvent(
      req.user.id,
      'EDIT_COMMERCE',
      'MEDIUM',
      req,
      { commerceId: id, nombre, nit },
      'commerce',
      parseInt(id)
    );

    res.json({ message: 'Comercio actualizado con éxito' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Llave duplicada: El NIT o el Administrador ya están asociados a otro comercio.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Actualizar solo el estado de un comercio (Aprobación)
router.patch('/commerces/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (!['pending', 'active', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }
    await db.query('UPDATE commerces SET status = ? WHERE id = ?', [status, id]);

    await logSecurityEvent(
      req.user.id,
      'CHANGE_COMMERCE_STATUS',
      'HIGH',
      req,
      { commerceId: id, newStatus: status },
      'commerce',
      parseInt(id)
    );

    res.json({ message: `Comercio actualizado a estado: ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SEDES (STORES) ---

// Obtener sedes de un comercio (incluye horario resumido o completo)
router.get('/stores/:commerceId', async (req, res) => {
  try {
    const [stores] = await db.query('SELECT * FROM stores WHERE commerce_id = ?', [req.params.commerceId]);
    
    // Obtener horarios para todas las sedes encontradas
    for (let store of stores) {
      const [schedule] = await db.query('SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', [store.id]);
      store.schedule = schedule;
      // Inyectar estado en tiempo real
      store.is_currently_open = isStoreCurrentlyOpen(store.estado, schedule);
    }
    
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear o actualizar una sede (incluye gestión de horario semanal y cuentas bancarias)
router.post('/stores', async (req, res) => {
  const { id, commerce_id, nombre_sucursal, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, image_url, schedule, accounts, fecha_regreso, usuario_id, matricula, admin_nombres, admin_apellidos, admin_email, admin_password } = req.body;
  
  const isSystem = req.user.actorType === 'system_user';

  // Validación de permisos de creación
  if (!id) {
    if (!isSystem && !req.user.permissions?.includes('create_store')) {
      return res.status(403).json({ error: 'No tienes permisos para crear una sede.' });
    }
  }

  // Limpieza: Si es operativo, forzamos fecha_regreso a null
  const cleanFecha = fecha_regreso ? fecha_regreso.split('T')[0] : null;
  const finalFechaRegreso = (estado === 'operativo' || !cleanFecha) ? null : cleanFecha;

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let finalUserId = usuario_id;

    // A. Si es una SEDE NUEVA, creamos su administrador único de forma obligatoria
    if (!id) {
      if (!admin_email || !admin_password) {
        connection.release();
        return res.status(400).json({ error: 'Para crear una sede, debes definir su correo y contraseña de administrador único.' });
      }

      // Validar que el correo no esté ocupado
      const [existingUsers] = await connection.query('SELECT id FROM users WHERE email = ?', [admin_email]);
      if (existingUsers.length > 0) {
        connection.release();
        return res.status(400).json({ error: 'El correo electrónico del administrador ya está registrado.' });
      }

      // Crear usuario admin
      const passwordHash = await bcrypt.hash(admin_password, 10);
      const [userResult] = await connection.query(
        'INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, "admin", "activo")',
        [admin_email, passwordHash]
      );
      finalUserId = userResult.insertId;

      // Crear perfil
      await connection.query(
        'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
        [
          finalUserId,
          admin_nombres || 'Admin',
          admin_apellidos || 'Sede',
          matricula || `REG_STORE_${finalUserId}`,
          telefono || `300${String(finalUserId).padStart(7, '0')}`
        ]
      );
    } else {
      // B. Si estamos ACTUALIZANDO, realizamos BOLA check y validaciones de campos atómicos
      const [existingStores] = await connection.query('SELECT * FROM stores WHERE id = ?', [id]);
      if (existingStores.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Sede no encontrada.' });
      }
      const store = existingStores[0];

      // BOLA/IDOR Check
      if (!isSystem && store.commerce_id !== req.user.commerceId) {
        await logSecurityEvent(
          req.user.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: parseInt(id), action: 'edit_store' },
          'store',
          parseInt(id)
        );
        connection.release();
        return res.status(403).json({ error: 'Acceso no autorizado sobre la sede especificada.' });
      }

      // Eliminar imagen anterior si se subió una nueva
      const getFileName = (url) => {
        if (!url) return '';
        const parts = url.split('/');
        return parts[parts.length - 1];
      };

      if (store.image_url && image_url && getFileName(store.image_url) !== getFileName(image_url)) {
        try {
          const oldUrl = store.image_url;
          if (oldUrl.includes('/uploads/stores/')) {
            const parts = oldUrl.split('/uploads/stores/');
            const oldFileName = parts[parts.length - 1];
            
            // 1. Eliminar localmente
            const localPath = path.join(__dirname, '../../uploads/stores', oldFileName);
            if (fs.existsSync(localPath)) {
              fs.unlinkSync(localPath);
              console.log(`[FILE_CLEANUP] Imagen local de la sede eliminada: ${localPath}`);
            }
            
            // 2. Si es producción, enviar petición de borrado al servidor de medios
            if (process.env.NODE_ENV === 'production') {
              const mediaServerUrl = process.env.MEDIA_SERVER_URL || 'https://trendy-telemetry.sytes.net';
              console.log(`[MEDIA_CLEANUP] Solicitando eliminación de ${oldFileName} en servidor de medios...`);
              await fetch(`${mediaServerUrl}/api/media/delete/store/${oldFileName}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': req.header('Authorization') || ''
                }
              }).catch(err => console.error('[MEDIA_CLEANUP_ERROR] Fallo al borrar en Bogotá:', err.message));
            }
          }
        } catch (cleanupError) {
          console.error('[CLEANUP_ERROR] Error al limpiar imagen antigua:', cleanupError.message);
        }
      }

      // Detectar cambios en campos avanzados
      let hasAdvancedChanges = false;
      if (nombre_sucursal !== undefined && nombre_sucursal !== store.nombre_sucursal) hasAdvancedChanges = true;
      if (direccion !== undefined && direccion !== store.direccion) hasAdvancedChanges = true;
      if (latitud !== undefined && String(latitud) !== String(store.latitud)) hasAdvancedChanges = true;
      if (longitud !== undefined && String(longitud) !== String(store.longitud)) hasAdvancedChanges = true;
      if (matricula !== undefined && matricula !== store.matricula) hasAdvancedChanges = true;
      if (usuario_id !== undefined && usuario_id !== store.usuario_id) hasAdvancedChanges = true;
      if (admin_nombres !== undefined && admin_nombres !== store.admin_nombres) hasAdvancedChanges = true;
      if (admin_apellidos !== undefined && admin_apellidos !== store.admin_apellidos) hasAdvancedChanges = true;

      // Comparación avanzada de cuentas bancarias
      if (accounts && Array.isArray(accounts)) {
        const [existingAccounts] = await connection.query(
          'SELECT platform_id, numero_cuenta, titular_nombre, es_principal FROM store_accounts WHERE store_id = ?',
          [id]
        );
        const normalize = acc => ({
          platform_id: Number(acc.platform_id),
          numero_cuenta: String(acc.numero_cuenta),
          titular_nombre: String(acc.titular_nombre || ''),
          es_principal: acc.es_principal ? 1 : 0
        });
        const normExisting = existingAccounts.map(normalize);
        const normIncoming = accounts.map(normalize);

        if (normExisting.length !== normIncoming.length) {
          hasAdvancedChanges = true;
        } else {
          const sortedExisting = [...normExisting].sort((a, b) => a.numero_cuenta.localeCompare(b.numero_cuenta));
          const sortedIncoming = [...normIncoming].sort((a, b) => a.numero_cuenta.localeCompare(b.numero_cuenta));
          for (let i = 0; i < sortedExisting.length; i++) {
            if (JSON.stringify(sortedExisting[i]) !== JSON.stringify(sortedIncoming[i])) {
              hasAdvancedChanges = true;
              break;
            }
          }
        }
      }

      // Validar permisos atómicos según el tipo de cambio
      if (!isSystem) {
        if (hasAdvancedChanges) {
          if (!req.user.permissions?.includes('edit_store_advanced')) {
            await logSecurityEvent(
              req.user.id,
              'UNAUTHORIZED_FIELD_MODIFICATION',
              'HIGH',
              req,
              { storeId: parseInt(id), reason: 'Falta permiso edit_store_advanced' },
              'store',
              parseInt(id)
            );
            connection.release();
            return res.status(403).json({ error: 'No tienes permisos avanzados para modificar estos campos de la sede.' });
          }
        } else {
          if (!req.user.permissions?.includes('edit_store_basic') && !req.user.permissions?.includes('edit_store_advanced')) {
            await logSecurityEvent(
              req.user.id,
              'UNAUTHORIZED_FIELD_MODIFICATION',
              'HIGH',
              req,
              { storeId: parseInt(id), reason: 'Falta permiso edit_store_basic' },
              'store',
              parseInt(id)
            );
            connection.release();
            return res.status(403).json({ error: 'No tienes permisos para modificar los datos básicos de la sede.' });
          }
        }
      }

      // Validar que no reasignen el gerente a uno ocupado
      if (finalUserId) {
        const [existing] = await connection.query(
          'SELECT id FROM stores WHERE usuario_id = ? AND id <> ?',
          [finalUserId, id]
        );
        if (existing.length > 0) {
          connection.release();
          return res.status(400).json({ error: 'Este usuario ya está asignado como gerente de otra sede.' });
        }
      }
    }

    // 2. Validaciones de integridad para matrícula única
    if (matricula) {
      const [existingMatricula] = await connection.query(
        'SELECT id FROM stores WHERE matricula = ?' + (id ? ' AND id <> ?' : ''),
        id ? [matricula, id] : [matricula]
      );
      if (existingMatricula.length > 0) {
        connection.release();
        return res.status(400).json({ error: 'La matrícula mercantil provista ya está registrada en otra sede.' });
      }
    }

    let storeId = id;
    const finalContactoDirecto = `${admin_nombres || ''} ${admin_apellidos || ''}`.trim() || contacto_directo;

    if (id) {
      // Actualizar sede existente
      await connection.query(
        'UPDATE stores SET nombre_sucursal=?, contacto_directo=?, telefono=?, telefono_domicilio=?, direccion=?, latitud=?, longitud=?, estado=?, fecha_regreso=?, image_url=?, usuario_id=?, matricula=?, admin_nombres=?, admin_apellidos=? WHERE id=?',
        [nombre_sucursal, finalContactoDirecto || null, telefono || null, telefono_domicilio || null, direccion, latitud || null, longitud || null, estado || 'abierto', finalFechaRegreso, image_url || null, finalUserId || null, matricula || null, admin_nombres || null, admin_apellidos || null, id]
      );
    } else {
      // Crear nueva sede
      const [result] = await connection.query(
        'INSERT INTO stores (commerce_id, nombre_sucursal, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, fecha_regreso, image_url, usuario_id, matricula, admin_nombres, admin_apellidos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [commerce_id, nombre_sucursal, finalContactoDirecto || null, telefono || null, telefono_domicilio || null, direccion, latitud || null, longitud || null, estado || 'abierto', finalFechaRegreso, image_url || null, finalUserId || null, matricula || null, admin_nombres || null, admin_apellidos || null]
      );
      storeId = result.insertId;

      // Relación user_stores obligatoria
      await connection.query(
        'INSERT INTO user_stores (user_id, store_id) VALUES (?, ?)',
        [finalUserId, storeId]
      );
    }

    // Procesar horario semanal si se proporciona
    if (schedule && Array.isArray(schedule)) {
      for (const day of schedule) {
        // UPSERT para cada día
        await connection.query(`
          INSERT INTO store_operating_hours 
          (store_id, day_index, status, open_time, close_time, is_24h)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          status=VALUES(status), open_time=VALUES(open_time), close_time=VALUES(close_time), is_24h=VALUES(is_24h)
        `, [storeId, day.day_index, day.status, day.open_time, day.close_time, day.is_24h]);
      }
    }

    // Procesar cuentas bancarias si se proporcionan
    if (accounts && Array.isArray(accounts)) {
      // Limpiamos las cuentas anteriores para este storeId (reemplazo total)
      await connection.query('DELETE FROM store_accounts WHERE store_id = ?', [storeId]);
      
      if (accounts.length > 0) {
        // Insertamos las nuevas cuentas enviadas desde el frontend
        const values = accounts.map(acc => [
          storeId, 
          acc.platform_id, 
          acc.tipo_cuenta || 'Ahorros', 
          acc.numero_cuenta, 
          acc.llave || null,
          acc.titular_nombre || null, 
          acc.titular_documento || null, 
          acc.detalle || null, 
          acc.vencimiento_tarjeta || null,
          acc.es_principal === true || acc.es_principal === 1 || acc.es_principal === 'true' ? 1 : 0
        ]);
        
        await connection.query(`
          INSERT INTO store_accounts 
          (store_id, platform_id, tipo_cuenta, numero_cuenta, llave, titular_nombre, titular_documento, detalle, vencimiento_tarjeta, es_principal) 
          VALUES ?
        `, [values]);
      }
    }

    if (id) {
      await logSecurityEvent(
        req.user.id,
        'EDIT_STORE',
        'MEDIUM',
        req,
        { storeId: id, nombre_sucursal },
        'store',
        parseInt(id)
      );
    } else {
      await logSecurityEvent(
        req.user.id,
        'CREATE_STORE',
        'HIGH',
        req,
        { storeId, commerceId: commerce_id, nombre_sucursal },
        'store',
        storeId
      );
    }

    await connection.commit();
    connection.release();

    res.json({ id: storeId, message: id ? 'Sede actualizada con éxito' : 'Sede creada con éxito' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Llave duplicada: El administrador o la matrícula ya están asociados a otra sede.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Obtener detalle de una sola sede
router.get('/store/:id', async (req, res) => {
  try {
    const [stores] = await db.query('SELECT s.*, c.nombre as commerce_nombre FROM stores s LEFT JOIN commerces c ON s.commerce_id = c.id WHERE s.id = ?', [req.params.id]);
    if (stores.length === 0) return res.status(404).json({ error: 'Store not found' });
    
    // Obtener las cuentas bancarias asociadas a esta sede con el join al catálogo
    const [accounts] = await db.query(`
      SELECT sa.*, pp.nombre as banco_nombre, pp.tipo_entidad 
      FROM store_accounts sa 
      LEFT JOIN payment_platforms pp ON sa.platform_id = pp.id 
      WHERE sa.store_id = ?
    `, [req.params.id]);
    
    // Obtener el horario semanal
    const [schedule] = await db.query('SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', [req.params.id]);
    
    const storeData = stores[0];
    storeData.accounts = accounts;
    storeData.schedule = schedule;
    
    // Inyectar estado en tiempo real
    storeData.is_currently_open = isStoreCurrentlyOpen(storeData.estado, schedule);
    
    res.json(storeData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MENUS ---

// Obtener menús de un comercio
router.get('/menus/:commerceId', hasPermission('view_catalog'), async (req, res) => {
  try {
    const [menus] = await db.query('SELECT * FROM menus WHERE commerce_id = ? ORDER BY orden ASC', [req.params.commerceId]);
    res.json(menus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear o actualizar un menú
router.post('/menus', hasPermission('write_catalog'), async (req, res) => {
  const { id, commerce_id, nombre, descripcion, orden } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  try {
    if (!isSystem) {
      if (id) {
        const [existing] = await db.query('SELECT commerce_id FROM menus WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Menú no encontrado' });
        if (existing[0].commerce_id !== req.user.commerceId) {
          return res.status(403).json({ error: 'No autorizado para modificar este menú.' });
        }
      } else if (Number(commerce_id) !== Number(req.user.commerceId)) {
        return res.status(403).json({ error: 'No autorizado para crear un menú en otro comercio.' });
      }
    }
    if (id) {
      await db.query('UPDATE menus SET nombre=?, descripcion=?, orden=? WHERE id=?',
        [nombre, descripcion, orden, id]);
      res.json({ id, message: 'Menú actualizado' });
    } else {
      const [result] = await db.query(
        'INSERT INTO menus (commerce_id, nombre, descripcion, orden) VALUES (?, ?, ?, ?)',
        [commerce_id, nombre, descripcion, orden || 0]
      );
      res.json({ id: result.insertId, message: 'Menú creado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CATEGORIAS ---

// Obtener categorias de un menu
router.get('/categorias/:menuId', hasPermission('view_catalog'), async (req, res) => {
  try {
    const [categorias] = await db.query('SELECT * FROM categorias WHERE menu_id = ? ORDER BY orden_visual ASC', [req.params.menuId]);
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear o actualizar una categoria
router.post('/categorias', hasPermission('write_catalog'), async (req, res) => {
  const { id, menu_id, nombre, descripcion, orden_visual } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  try {
    if (!isSystem) {
      if (id) {
        const [existing] = await db.query(`
          SELECT m.commerce_id 
          FROM categorias c 
          JOIN menus m ON c.menu_id = m.id 
          WHERE c.id = ?
        `, [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
        if (existing[0].commerce_id !== req.user.commerceId) {
          return res.status(403).json({ error: 'No autorizado para modificar esta categoría.' });
        }
      } else {
        const [menu] = await db.query('SELECT commerce_id FROM menus WHERE id = ?', [menu_id]);
        if (menu.length === 0) return res.status(404).json({ error: 'Menú asociado no encontrado' });
        if (menu[0].commerce_id !== req.user.commerceId) {
          return res.status(403).json({ error: 'No autorizado para crear una categoría bajo este menú.' });
        }
      }
    }
    if (id) {
        await db.query('UPDATE categorias SET nombre=?, descripcion=?, orden_visual=? WHERE id=?', [nombre, descripcion, orden_visual, id]);
        res.json({ message: 'CategorÃ­a actualizada' });
    } else {
        const [result] = await db.query(
          'INSERT INTO categorias (menu_id, nombre, descripcion, orden_visual) VALUES (?, ?, ?, ?)',
          [menu_id, nombre, descripcion, orden_visual || 0]
        );
        res.json({ id: result.insertId, message: 'CategorÃ­a creada' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { generateProductTags } = require('../utils/tagger');

// --- PRODUCTOS ---

// Obtener productos (opcionalmente filtrados por menú)
router.get('/products', hasPermission('view_catalog'), async (req, res) => {
  const { commerceId, menuId } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (commerceId) {
    query += ' AND commerce_id = ?';
    params.push(commerceId);
  }
  if (menuId) {
    query += ' AND menu_id = ?';
    params.push(menuId);
  }

  try {
    const [products] = await db.query(query, params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update product
router.post('/products', hasPermission('write_catalog'), async (req, res) => {
  const { id, commerce_id, categoria_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano, ingredientes, manual_tags, tags } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  
  if (!isSystem) {
    if (id) {
      const [existing] = await db.query('SELECT commerce_id FROM products WHERE id = ?', [id]);
      if (existing.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
      if (existing[0].commerce_id !== req.user.commerceId) {
        return res.status(403).json({ error: 'No autorizado para modificar este producto.' });
      }
    } else if (Number(commerce_id) !== Number(req.user.commerceId)) {
      return res.status(403).json({ error: 'No autorizado para crear un producto en otro comercio.' });
    }
  }
  
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Lógica de Auto-Tagging Unificada
    // Extraemos el nombre de la categoría y del comercio para el motor semántico
    let categoryName = '';
    let commerceName = '';

    if (categoria_id) {
      const [cats] = await connection.query('SELECT nombre FROM categorias WHERE id = ?', [categoria_id]);
      if (cats.length > 0) categoryName = cats[0].nombre;
    }

    if (commerce_id) {
      const [coms] = await connection.query('SELECT nombre FROM commerces WHERE id = ?', [commerce_id]);
      if (coms.length > 0) commerceName = coms[0].nombre;
    } else if (id) {
      // Si es un update y no viene commerce_id, lo buscamos en el producto
      const [prods] = await connection.query('SELECT c.nombre FROM products p JOIN commerces c ON p.commerce_id = c.id WHERE p.id = ?', [id]);
      if (prods.length > 0) commerceName = prods[0].nombre;
    }

    // El motor ahora mezcla nombre + descripción (corta y larga) + categoría + etiquetas manuales/semánticas previas
    // Esto limpia ruidos (stop words) y asegura que TODO sea minúscula y único.
    const [stopWordsRows] = await connection.query('SELECT word FROM stop_words');
    const stopWordsList = stopWordsRows.map(r => r.word);

    const inputTags = manual_tags !== undefined ? manual_tags : (tags || '');
    const fullDesc = `${descripcion_larga || ''}`;
    
    // Con catálogo maestro por comercio, no buscamos branchName para los productos a nivel maestro
    let branchName = '';

    const finalTags = generateProductTags(nombre, fullDesc, categoryName, inputTags, stopWordsList, !!es_vegetariano, commerceName, branchName);

    let productId = id;

    if (id) {
      // Update
      await connection.query(
        'UPDATE products SET categoria_id=?, nombre=?, descripcion_larga=?, precio_base=?, tiempo_prep_estimado=?, image_url=?, disponible=?, es_vegetariano=?, tags=? WHERE id=?',
        [categoria_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano, finalTags, id]
      );
    } else {
      // Create
      const [result] = await connection.query(
        'INSERT INTO products (commerce_id, categoria_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [commerce_id, categoria_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible !== undefined ? disponible : true, es_vegetariano || false, finalTags]
      );
      productId = result.insertId;
    }

    // Process ingredients if provided (an array of ingredient IDs)
    if (ingredientes && Array.isArray(ingredientes)) {
       // Clear old relationships
       await connection.query('DELETE FROM product_ingredients WHERE product_id = ?', [productId]);
       // Insert new ones
       if (ingredientes.length > 0) {
           const values = ingredientes.map(ingId => [productId, ingId]);
           await connection.query('INSERT INTO product_ingredients (product_id, ingredient_id) VALUES ?', [values]);
       }
    }

    await connection.commit();
    connection.release();

    res.json({ id: productId, message: id ? 'Producto actualizado' : 'Producto creado' });
  } catch (error) {
    if (connection) {
       await connection.rollback();
       connection.release();
    }
    res.status(500).json({ error: error.message });

  }
});

// --- INGREDIENTES ---
router.get('/ingredients', hasPermission('view_catalog'), async (req, res) => {
    try {
        const [ingredients] = await db.query('SELECT * FROM ingredients');
        res.json(ingredients);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/ingredients', hasPermission('write_catalog'), async (req, res) => {
    const { id, nombre, es_alergeno } = req.body;
    try {
        if(id){
            await db.query('UPDATE ingredients SET nombre=?, es_alergeno=? WHERE id=?', [nombre, es_alergeno, id]);
            res.json({ message: 'Ingrediente actualizado' });
        } else {
            const [result] = await db.query('INSERT INTO ingredients (nombre, es_alergeno) VALUES (?, ?)', [nombre, es_alergeno || false]);
            res.json({ id: result.insertId, message: 'Ingrediente creado' });
        }
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});


/**
 * @route GET /api/management/analytics/popularity
 * @desc Ver el ranking actual de popularidad
 */
router.get('/analytics/popularity', async (req, res) => {
  try {
    const [ranking] = await db.query(`
      SELECT 
        p.id, p.nombre, p.image_url, pp.sales_count, pp.last_update,
        com.nombre as commerce_name
      FROM product_popularity pp
      JOIN products p ON pp.product_id = p.id
      JOIN commerces com ON p.commerce_id = com.id
      ORDER BY pp.sales_count DESC
      LIMIT 100
    `);
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/management/analytics/trigger
 * @desc Ejecutar manualmente el cálculo de popularidad
 */
router.post('/analytics/trigger', async (req, res) => {
  try {
    const [sales] = await db.query(`
      SELECT product_id, SUM(quantity) as total_sales
      FROM order_items
      GROUP BY product_id
    `);

    for (const sale of sales) {
      await db.query(`
        INSERT INTO product_popularity (product_id, sales_count, last_update)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE sales_count = VALUES(sales_count), last_update = NOW()
      `, [sale.product_id, sale.total_sales]);
    }

    res.json({ message: 'Ranking actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- STOP WORDS (LISTA NEGRA) ---

router.get('/intelligence/stop-words', async (req, res) => {
  try {
    const [words] = await db.query('SELECT * FROM stop_words ORDER BY word ASC');
    res.json(words);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/intelligence/stop-words', async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'Palabra requerida' });
  try {
    // Dividir por espacios, comas o puntos y coma, filtrar vacíos
    const wordsToProcess = word.split(/[ ,;]+/).filter(w => w.trim().length > 0);
    
    if (wordsToProcess.length === 0) return res.status(400).json({ error: 'No se detectaron palabras válidas' });

    // Preparar valores para inserción masiva (bulk insert)
    const values = wordsToProcess.map(w => [w.toLowerCase().trim()]);
    
    await db.query('INSERT IGNORE INTO stop_words (word) VALUES ?', [values]);
    res.json({ message: `${wordsToProcess.length} palabras procesadas correctamente` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/intelligence/stop-words/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM stop_words WHERE id = ?', [req.params.id]);
    res.json({ message: 'Palabra eliminada de la lista negra' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/manage/intelligence/generate-tags
 * @desc Generación masiva de tags semánticos por lotes (soporta progreso)
 */
router.post('/intelligence/generate-tags', async (req, res) => {
  const { limit = 20, offset = 0 } = req.body;
  
  try {
    // 1. Obtener total para cálculo de progreso en el front
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM products');

    // 2. Obtener lista negra de la DB
    const [stopWordsRows] = await db.query('SELECT word FROM stop_words');
    const stopWordsList = stopWordsRows.map(r => r.word);

    // 3. Obtener el lote actual
    const [products] = await db.query(`
      SELECT p.id, p.nombre, p.descripcion_larga, p.tags as existing_tags, p.es_vegetariano, 
             c.nombre as categoria_nombre, com.nombre as commerce_nombre
      FROM products p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN commerces com ON p.commerce_id = com.id
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    let updatedCount = 0;
    for (const product of products) {
      const { id, nombre, descripcion_larga, categoria_nombre, commerce_nombre, existing_tags, es_vegetariano } = product;
      const fullDesc = `${descripcion_larga || ''}`;
      
      const newTags = generateProductTags(nombre, fullDesc, categoria_nombre || '', existing_tags || '', stopWordsList, !!es_vegetariano, commerce_nombre || '', '');
      
      if (newTags !== existing_tags) {
        await db.query('UPDATE products SET tags = ? WHERE id = ?', [newTags, id]);
        updatedCount++;
      }
    }

    res.json({ 
      processed: products.length, 
      updated: updatedCount,
      total,
      nextOffset: parseInt(offset) + products.length,
      isFinished: (parseInt(offset) + products.length) >= total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CATALOGO POR SEDE (TABLAS PIVOTE) ---

// Obtener menus habilitados para una sede
router.get('/store-menus/:storeId', hasPermission('view_catalog'), async (req, res) => {
  const { storeId } = req.params;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = req.user.commerceId;

  try {
    // BOLA Check
    if (!isSystem) {
      const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
      if (stores.length === 0) {
        await logSecurityEvent(
          req.user.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: parseInt(storeId), action: 'get_store_menus' },
          'store',
          parseInt(storeId)
        );
        return res.status(403).json({ error: 'Acceso no autorizado sobre la sede especificada.' });
      }
    }

    const [rows] = await db.query(`
      SELECT sm.*, m.nombre as menu_nombre, m.orden
      FROM store_menus sm
      JOIN menus m ON sm.menu_id = m.id
      WHERE sm.store_id = ?
      ORDER BY m.orden ASC
    `, [storeId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle menu en una sede
router.post('/store-menus', hasPermission('enable_store_catalog'), async (req, res) => {
  const { store_id, menu_id, disponible } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = req.user.commerceId;

  if (!store_id || !menu_id) {
    return res.status(400).json({ error: 'store_id y menu_id son requeridos.' });
  }

  try {
    // BOLA Check
    if (!isSystem) {
      const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [store_id, commerceId]);
      if (stores.length === 0) {
        await logSecurityEvent(
          req.user.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: parseInt(store_id), menuId: parseInt(menu_id), action: 'toggle_store_menu' },
          'store',
          parseInt(store_id)
        );
        return res.status(403).json({ error: 'Acceso no autorizado sobre la sede especificada.' });
      }
    }

    await db.query(`
      INSERT INTO store_menus (store_id, menu_id, disponible) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE disponible = ?
    `, [store_id, menu_id, disponible, disponible]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener categorias habilitadas para una sede (de un menu especifico)
router.get('/store-categories/:storeId/:menuId', hasPermission('view_catalog'), async (req, res) => {
  const { storeId, menuId } = req.params;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = req.user.commerceId;

  try {
    // BOLA Check
    if (!isSystem) {
      const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
      if (stores.length === 0) {
        await logSecurityEvent(
          req.user.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: parseInt(storeId), action: 'get_store_categories' },
          'store',
          parseInt(storeId)
        );
        return res.status(403).json({ error: 'Acceso no autorizado sobre la sede especificada.' });
      }
    }

    const [rows] = await db.query(`
      SELECT c.*, 
             COALESCE(sc.disponible, 0) as habilitada,
             sc.id as store_category_id
      FROM categorias c
      LEFT JOIN store_categories sc ON sc.categoria_id = c.id AND sc.store_id = ?
      WHERE c.menu_id = ?
      ORDER BY c.orden_visual ASC
    `, [storeId, menuId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle categoria en una sede
router.post('/store-categories', hasPermission('enable_store_catalog'), async (req, res) => {
  const { store_id, categoria_id, disponible } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = req.user.commerceId;

  if (!store_id || !categoria_id) {
    return res.status(400).json({ error: 'store_id y categoria_id son requeridos.' });
  }

  try {
    // BOLA Check
    if (!isSystem) {
      const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [store_id, commerceId]);
      if (stores.length === 0) {
        await logSecurityEvent(
          req.user.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: parseInt(store_id), categoriaId: parseInt(categoria_id), action: 'toggle_store_category' },
          'store',
          parseInt(store_id)
        );
        return res.status(403).json({ error: 'Acceso no autorizado sobre la sede especificada.' });
      }
    }

    await db.query(`
      INSERT INTO store_categories (store_id, categoria_id, disponible) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE disponible = ?
    `, [store_id, categoria_id, disponible, disponible]);

    await logSecurityEvent(
      req.user.id,
      'MASS_CATALOG_CHANGE',
      'LOW',
      req,
      { storeId: store_id, categoriaId: categoria_id, disponible },
      'store',
      store_id
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener productos de una categoria con estado de habilitacion por sede
router.get('/store-products/:storeId/:categoriaId', hasPermission('view_catalog'), async (req, res) => {
  const { storeId, categoriaId } = req.params;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = req.user.commerceId;

  try {
    // BOLA Check
    if (!isSystem) {
      const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
      if (stores.length === 0) {
        await logSecurityEvent(
          req.user.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: parseInt(storeId), action: 'get_store_products' },
          'store',
          parseInt(storeId)
        );
        return res.status(403).json({ error: 'Acceso no autorizado sobre la sede especificada.' });
      }
    }

    const [rows] = await db.query(`
      SELECT p.*, 
             COALESCE(sp.disponible, 0) as habilitado,
             sp.precio_local,
             sp.tiempo_prep_local,
             COALESCE(sp.precio_local, p.precio_base) as precio_efectivo,
             COALESCE(sp.tiempo_prep_local, p.tiempo_prep_estimado) as tiempo_efectivo,
             sp.id as store_product_id
      FROM products p
      LEFT JOIN store_products sp ON sp.product_id = p.id AND sp.store_id = ?
      WHERE p.categoria_id = ?
      ORDER BY p.nombre ASC
    `, [storeId, categoriaId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle producto en una sede + precio/tiempo local
router.post('/store-products', hasPermission('write_catalog'), async (req, res) => {
  const { store_id, product_id, precio_local, tiempo_prep_local, disponible } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = req.user.commerceId;

  if (!store_id || !product_id) {
    return res.status(400).json({ error: 'store_id y product_id son requeridos.' });
  }

  try {
    // BOLA Check
    if (!isSystem) {
      const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [store_id, commerceId]);
      if (stores.length === 0) {
        await logSecurityEvent(
          req.user.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { storeId: parseInt(store_id), productId: parseInt(product_id), action: 'toggle_store_product' },
          'store',
          parseInt(store_id)
        );
        return res.status(403).json({ error: 'Acceso no autorizado sobre la sede especificada.' });
      }
    }

    await db.query(`
      INSERT INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE precio_local = ?, tiempo_prep_local = ?, disponible = ?
    `, [store_id, product_id, precio_local, tiempo_prep_local, disponible,
        precio_local, tiempo_prep_local, disponible]);

    await logSecurityEvent(
      req.user.id,
      'MASS_CATALOG_CHANGE',
      'LOW',
      req,
      { storeId: store_id, productId: product_id, disponible, precio_local, tiempo_prep_local },
      'store',
      store_id
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Obtener los pedidos de las sedes del comercio
router.get('/orders', isCommerceManagerOrAdmin, async (req, res) => {
  try {
    let storesQuery = 'SELECT id FROM stores';
    const storesParams = [];
    
    const isSystem = req.user.actorType === 'system_user';
    if (!isSystem) {
      storesQuery += ' WHERE commerce_id = ?';
      storesParams.push(req.user.commerceId);
    }
    
    const [stores] = await db.query(storesQuery, storesParams);
    if (stores.length === 0) {
      return res.json([]);
    }
    
    const storeIds = stores.map(s => s.id);
    
    // Obtener pedidos de estas sedes
    const [orders] = await db.query(`
      SELECT o.*, s.nombre_sucursal as store_name, p.nombres as customer_nombres, p.apellidos as customer_apellidos
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      LEFT JOIN users u ON o.customer_user_id = u.id
      LEFT JOIN profiles p ON p.usuario_id = u.id
      WHERE o.store_id IN (?)
      ORDER BY o.created_at DESC
    `, [storeIds]);
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Actualizar el estado de un pedido (por ejemplo, aceptar pedido -> 'preparando')
router.patch('/orders/:orderId/status', isCommerceManagerOrAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const isSystem = req.user.actorType === 'system_user';
  const commerceId = req.user.commerceId;

  if (!status || !['pendiente', 'preparando', 'listo_para_envio', 'en_camino', 'entregado', 'cancelado'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido o no provisto.' });
  }

  try {
    // 1. Obtener la sede asociada al pedido para validar propiedad
    const [orderRows] = await db.query('SELECT store_id FROM orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }
    const storeId = orderRows[0].store_id;

    // 2. Validar que la sede pertenezca al comercio del usuario
    if (!isSystem) {
      const [stores] = await db.query('SELECT id FROM stores WHERE id = ? AND commerce_id = ?', [storeId, commerceId]);
      if (stores.length === 0) {
        await logSecurityEvent(
          req.user.id,
          'BOLA_ATTEMPT',
          'HIGH',
          req,
          { orderId: parseInt(orderId), action: 'change_order_status', targetStoreId: storeId },
          'store',
          storeId
        );
        return res.status(403).json({ error: 'No tienes autorización sobre la sede de este pedido.' });
      }
    }

    // 3. Actualizar el estado
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

    await logSecurityEvent(
      req.user.id,
      'CHANGE_ORDER_STATUS',
      'LOW',
      req,
      { orderId: parseInt(orderId), status },
      'store',
      storeId
    );

    res.json({ success: true, message: `Estado del pedido actualizado a: ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ELIMINACIÓN DE ELEMENTOS DE CATÁLOGO (CON BOLA CHECK) ---

// Eliminar un menú
router.delete('/menus/:id', hasPermission('delete_catalog'), async (req, res) => {
  const { id } = req.params;
  const isSystem = req.user.actorType === 'system_user';
  try {
    if (!isSystem) {
      const [menus] = await db.query('SELECT commerce_id FROM menus WHERE id = ?', [id]);
      if (menus.length > 0 && menus[0].commerce_id !== req.user.commerceId) {
        return res.status(403).json({ error: 'No autorizado para eliminar este menú.' });
      }
    }
    await db.query('DELETE FROM menus WHERE id = ?', [id]);
    res.json({ success: true, message: 'Menú eliminado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar una categoría
router.delete('/categorias/:id', hasPermission('delete_catalog'), async (req, res) => {
  const { id } = req.params;
  const isSystem = req.user.actorType === 'system_user';
  try {
    if (!isSystem) {
      const [cats] = await db.query(`
        SELECT m.commerce_id 
        FROM categorias c 
        JOIN menus m ON c.menu_id = m.id 
        WHERE c.id = ?
      `, [id]);
      if (cats.length > 0 && cats[0].commerce_id !== req.user.commerceId) {
        return res.status(403).json({ error: 'No autorizado para eliminar esta categoría.' });
      }
    }
    await db.query('DELETE FROM categorias WHERE id = ?', [id]);
    res.json({ success: true, message: 'Categoría eliminada con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un producto
router.delete('/products/:id', hasPermission('delete_catalog'), async (req, res) => {
  const { id } = req.params;
  const isSystem = req.user.actorType === 'system_user';
  try {
    if (!isSystem) {
      const [prods] = await db.query('SELECT commerce_id FROM products WHERE id = ?', [id]);
      if (prods.length > 0 && prods[0].commerce_id !== req.user.commerceId) {
        return res.status(403).json({ error: 'No autorizado para eliminar este producto.' });
      }
    }
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true, message: 'Producto eliminado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

