const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { logSecurityEvent } = require('../utils/securityLogger');

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    // 1. Buscar usuario en la base de datos (incluyendo commerce_id)
    const [users] = await db.query('SELECT id, email, password_hash, nombres, apellidos, rol, estado, commerce_id FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (!user) {
      await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, reason: 'Usuario no encontrado' });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.estado !== 'activo') {
      await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, reason: 'Cuenta inactiva o bloqueada' });
      return res.status(403).json({ error: 'Cuenta inactiva o bloqueada' });
    }

    // 2. Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, reason: 'Contraseña incorrecta' });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3. Obtener permisos del usuario
    const [permissionsData] = await db.query(`
      SELECT p.name 
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ?
    `, [user.id]);
    
    const permissions = permissionsData.map(p => p.name);

    // Obtener sedes asignadas si es vendor
    let storeIds = [];
    if (user.rol === 'vendor') {
      const [assignedStores] = await db.query('SELECT store_id FROM user_stores WHERE user_id = ?', [user.id]);
      storeIds = assignedStores.map(s => s.store_id);
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('[CRITICAL] JWT_SECRET no está configurada en las variables de entorno.');
    }

    // 4. Generar JWT (con commerceId y storeIds)
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, permissions, commerceId: user.commerce_id, storeIds },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logSecurityEvent(user.id, 'SUCCESSFUL_LOGIN', 'LOW', req);

    // 5. Responder con data segura
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: `${user.nombres} ${user.apellidos || ''}`.trim(),
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
        permissions,
        commerceId: user.commerce_id,
        storeIds
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// @route   POST /api/auth/mobile/token-sync
// @desc    Sync Firebase UID and return signed Backend JWT
router.post('/mobile/token-sync', async (req, res) => {
  const { email, firebaseUid } = req.body;

  if (!email || !firebaseUid) {
    return res.status(400).json({ error: 'Email y UID son obligatorios' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Falta configurar JWT_SECRET en el servidor' });
  }

  try {
    const [users] = await db.query(
      'SELECT id, email, password_hash, nombres, apellidos, rol, estado, commerce_id FROM users WHERE email = ?',
      [email]
    );
    const user = users[0];

    if (!user) {
      await logSecurityEvent(null, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, type: 'mobile_sync', reason: 'Usuario no encontrado' });
      return res.status(404).json({ error: 'Usuario no sincronizado en base de datos local' });
    }

    if (user.estado !== 'activo') {
      await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { email, type: 'mobile_sync', reason: 'Cuenta inactiva o bloqueada' });
      return res.status(403).json({ error: 'Cuenta inactiva o bloqueada' });
    }

    // El firebaseUid se usa como contraseña en MariaDB para los usuarios móviles
    const isMatch = await bcrypt.compare(firebaseUid, user.password_hash);
    if (!isMatch) {
      await logSecurityEvent(user.id, 'FAILED_LOGIN_ATTEMPT', 'HIGH', req, { email, type: 'mobile_sync', reason: 'Fallo de autenticación del token móvil' });
      return res.status(401).json({ error: 'Fallo de autenticación del token móvil' });
    }

    // Obtener permisos del usuario
    const [permissionsData] = await db.query(`
      SELECT p.name 
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ?
    `, [user.id]);
    const permissions = permissionsData.map(p => p.name);

    // Obtener sedes asignadas si es vendor
    let storeIds = [];
    if (user.rol === 'vendor') {
      const [assignedStores] = await db.query('SELECT store_id FROM user_stores WHERE user_id = ?', [user.id]);
      storeIds = assignedStores.map(s => s.store_id);
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, permissions, commerceId: user.commerce_id, storeIds },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    await logSecurityEvent(user.id, 'SUCCESSFUL_LOGIN', 'LOW', req, { type: 'mobile_sync' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: `${user.nombres} ${user.apellidos || ''}`.trim(),
        rol: user.rol,
        commerceId: user.commerce_id,
        storeIds
      }
    });

  } catch (error) {
    console.error('Token sync error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// @route   POST /api/auth/mobile/register
// @desc    Sync Firebase user to MariaDB
router.post('/mobile/register', async (req, res) => {
  const { email, nombre, firebaseUid } = req.body;

  if (!email || !firebaseUid) {
    return res.status(400).json({ error: 'Email y UID son obligatorios' });
  }

  try {
    // Verificar si ya existe
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(200).json({ message: 'Usuario ya sincronizado', user: existing[0] });
    }

    // Separar nombre en nombres y apellidos
    const parts = (nombre || 'Usuario Focnius').trim().split(/\s+/);
    const nombres = parts.slice(0, -1).join(' ') || parts[0];
    const apellidos = parts.length > 1 ? parts[parts.length - 1] : '';

    // Insertar con rol customer y un password hash dummy ya que Firebase maneja la auth real
    const dummyHash = await bcrypt.hash(firebaseUid, 10);
    const [result] = await db.query(
      'INSERT INTO users (email, password_hash, nombres, apellidos, rol, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [email, dummyHash, nombres, apellidos, 'customer', 'activo']
    );

    res.status(201).json({
      message: 'Usuario sincronizado exitosamente',
      user: { id: result.insertId, email, rol: 'customer' }
    });
  } catch (error) {
    console.error('Mobile Register error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// @route   GET /api/auth/mobile/check-user
// @desc    Check if a user exists by email
router.get('/mobile/check-user', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email es obligatorio' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(200).json({ exists: true });
    }
    return res.status(200).json({ exists: false });
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// @route   POST /api/auth/mobile/register-full
// @desc    Sync or create user and insert their first address
router.post('/mobile/register-full', async (req, res) => {
  const { email, nombres, apellidos, nombre, cedula, celular, firebaseUid, password, direccion, latitud, longitud } = req.body;

  if (!email || !direccion || !celular) {
    return res.status(400).json({ error: 'Faltan datos obligatorios del perfil' });
  }

  if (!firebaseUid && !password) {
    return res.status(400).json({ error: 'Debe proveer firebaseUid o contraseña' });
  }

  // Lógica de separación de nombres y apellidos como contingencia robusta
  let dbNombres = nombres;
  let dbApellidos = apellidos;

  if (!dbNombres && nombre) {
    const parts = nombre.trim().split(/\s+/);
    dbNombres = parts.slice(0, -1).join(' ') || parts[0];
    dbApellidos = parts.length > 1 ? parts[parts.length - 1] : '';
  }

  dbNombres = dbNombres || 'Usuario';
  dbApellidos = dbApellidos || 'Focnius';

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verificar si ya existe el usuario
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    let userId;

    if (existing.length > 0) {
      userId = existing[0].id;
      // Actualizar celular y cédula si vienen
      await connection.query('UPDATE users SET celular = ?, cedula_numero = ? WHERE id = ?', [celular, cedula, userId]);
    } else {
      // 2. Insertar nuevo usuario
      let hash;
      if (firebaseUid) {
        hash = await bcrypt.hash(firebaseUid, 10);
      } else {
        hash = await bcrypt.hash(password, 10);
      }

      const [result] = await connection.query(
        'INSERT INTO users (email, password_hash, nombres, apellidos, celular, cedula_numero, rol, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [email, hash, dbNombres, dbApellidos, celular, cedula, 'customer', 'activo']
      );
      userId = result.insertId;
    }

    // 3. Insertar la dirección
    await connection.query(
      'INSERT INTO user_addresses (user_id, label, direccion, latitud, longitud, is_default) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, 'Casa', direccion, latitud || null, longitud || null, true]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Perfil completado exitosamente',
      user: {
        id: userId,
        email,
        nombre: `${dbNombres} ${dbApellidos}`.trim(),
        nombres: dbNombres,
        apellidos: dbApellidos,
        celular,
        cedula_numero: cedula,
        rol: 'customer'
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Register Full error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

module.exports = router;
