const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const db = require('../config/db');
const { logSecurityEvent } = require('../utils/securityLogger');

async function getUserRolesAndPermissions(userType, userId) {
  const [permissionsData] = await db.query(`
    SELECT DISTINCT p.name
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_type = ? AND ur.user_id = ?
  `, [userType, userId]);
  
  const [rolesData] = await db.query(`
    SELECT r.code
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_type = ? AND ur.user_id = ?
  `, [userType, userId]);
  
  return {
    permissions: permissionsData.map(p => p.name),
    roles: rolesData.map(r => r.code)
  };
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'domi-app-usr'
  });
}

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    // 1. Buscar usuario en la base de datos (con JOIN a profiles, commerces, stores y delivery_companies)
    const [users] = await db.query(`
      SELECT u.id, u.email, u.password_hash, u.rol, u.estado, 
             u.es_repartidor, u.repartidor_activo,
             p.nombres, p.apellidos, p.telefono,
             c.id AS commerce_id,
             s.id AS store_id,
             s.commerce_id AS store_commerce_id,
             dc.id AS delivery_company_id
      FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN commerces c ON c.usuario_id = u.id
      LEFT JOIN stores s ON s.usuario_id = u.id
      LEFT JOIN delivery_companies dc ON dc.usuario_id = u.id
      WHERE u.email = ?
    `, [email]);
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

    // 3. Obtener roles y permisos del usuario bajo el nuevo esquema RBAC
    const { permissions, roles } = await getUserRolesAndPermissions('user', user.id);

    // 4. Resolver tipo de admin e identificadores de negocio
    let commerceId = null;
    let storeIds = [];
    let deliveryCompanyId = null;
    let adminType = null;

    if (user.rol === 'admin') {
      if (user.commerce_id) {
        adminType = 'commerce';
        commerceId = user.commerce_id;
        // Obtener todas las sedes del comercio
        const [stores] = await db.query('SELECT id FROM stores WHERE commerce_id = ?', [commerceId]);
        storeIds = stores.map(s => s.id);
      } else if (user.store_id) {
        adminType = 'store';
        commerceId = user.store_commerce_id;
        storeIds = [user.store_id];
      } else if (user.delivery_company_id) {
        adminType = 'delivery_company';
        deliveryCompanyId = user.delivery_company_id;
      }
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('[CRITICAL] JWT_SECRET no está configurada en las variables de entorno.');
    }

    // 5. Generar JWT (con metadata unificada de roles e identidades)
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        rol: user.rol, 
        actorType: 'user',
        adminType,
        es_repartidor: user.es_repartidor, 
        repartidor_activo: user.repartidor_activo,
        permissions, 
        roles,
        commerceId, 
        storeIds,
        deliveryCompanyId
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logSecurityEvent(user.id, 'SUCCESSFUL_LOGIN', 'LOW', req);

    // 6. Responder con data segura
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Usuario Focnius',
        nombres: user.nombres,
        apellidos: user.apellidos,
        telefono: user.telefono,
        rol: user.rol,
        actorType: 'user',
        adminType,
        es_repartidor: user.es_repartidor,
        repartidor_activo: user.repartidor_activo,
        permissions,
        commerceId,
        storeIds,
        deliveryCompanyId
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
  const { email, firebaseUid, firebaseIdToken } = req.body;

  if (!email || !firebaseUid) {
    return res.status(400).json({ error: 'Email y UID son obligatorios' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Falta configurar JWT_SECRET en el servidor' });
  }

  // Verify Firebase ID Token server-side to prevent identity spoofing
  if (process.env.BYPASS_FIREBASE_VERIFICATION !== 'true') {
    if (!firebaseIdToken) {
      return res.status(400).json({ error: 'Token de Firebase es obligatorio para la sincronización' });
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
      if (decodedToken.uid !== firebaseUid) {
        await logSecurityEvent(null, 'MALICIOUS_TOKEN_SYNC_ATTEMPT', 'CRITICAL', req, {
          email,
          reason: 'Firebase UID mismatch with ID token'
        });
        return res.status(401).json({ error: 'El UID del token de Firebase no coincide con el UID provisto' });
      }
    } catch (firebaseErr) {
      await logSecurityEvent(null, 'FAILED_TOKEN_SYNC', 'HIGH', req, {
        email,
        reason: 'Error al verificar token con Firebase: ' + firebaseErr.message
      });
      return res.status(401).json({ error: 'Token de Firebase inválido o expirado: ' + firebaseErr.message });
    }
  }

  try {
    const [users] = await db.query(`
      SELECT u.id, u.email, u.password_hash, u.rol, u.estado, 
             u.es_repartidor, u.repartidor_activo,
             p.nombres, p.apellidos, p.telefono,
             c.id AS commerce_id,
             s.id AS store_id,
             s.commerce_id AS store_commerce_id,
             dc.id AS delivery_company_id
      FROM users u
      LEFT JOIN profiles p ON p.usuario_id = u.id
      LEFT JOIN commerces c ON c.usuario_id = u.id
      LEFT JOIN stores s ON s.usuario_id = u.id
      LEFT JOIN delivery_companies dc ON dc.usuario_id = u.id
      WHERE u.email = ?
    `, [email]);
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

    // Obtener roles y permisos del usuario bajo el nuevo esquema RBAC
    const { permissions, roles } = await getUserRolesAndPermissions('user', user.id);

    // Resolver tipo de admin e identificadores de negocio
    let commerceId = null;
    let storeIds = [];
    let deliveryCompanyId = null;
    let adminType = null;

    if (user.rol === 'admin') {
      if (user.commerce_id) {
        adminType = 'commerce';
        commerceId = user.commerce_id;
        const [stores] = await db.query('SELECT id FROM stores WHERE commerce_id = ?', [commerceId]);
        storeIds = stores.map(s => s.id);
      } else if (user.store_id) {
        adminType = 'store';
        commerceId = user.store_commerce_id;
        storeIds = [user.store_id];
      } else if (user.delivery_company_id) {
        adminType = 'delivery_company';
        deliveryCompanyId = user.delivery_company_id;
      }
    }

    // Generar JWT (incluyendo flags de repartidor y tipo de admin)
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        rol: user.rol, 
        actorType: 'user',
        adminType,
        es_repartidor: user.es_repartidor, 
        repartidor_activo: user.repartidor_activo,
        permissions, 
        roles,
        commerceId, 
        storeIds,
        deliveryCompanyId
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    await logSecurityEvent(user.id, 'SUCCESSFUL_LOGIN', 'LOW', req, { type: 'mobile_sync' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Usuario Focnius',
        rol: user.rol,
        actorType: 'user',
        adminType,
        es_repartidor: user.es_repartidor,
        repartidor_activo: user.repartidor_activo,
        permissions,
        roles,
        commerceId,
        storeIds,
        deliveryCompanyId
      }
    });

  } catch (error) {
    console.error('Token sync error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// @route   POST /api/auth/operator-login
// @desc    Authenticate store operator & get token
router.post('/operator-login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const [operators] = await db.query(
      'SELECT * FROM store_operators WHERE email = ?',
      [email]
    );
    const operator = operators[0];

    if (!operator) {
      await logSecurityEvent(null, 'FAILED_OPERATOR_LOGIN_ATTEMPT', 'MEDIUM', req, { email, reason: 'Operador no encontrado' });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (operator.estado !== 'activo') {
      await logSecurityEvent(null, 'FAILED_OPERATOR_LOGIN_ATTEMPT', 'MEDIUM', req, { email, reason: 'Cuenta de operador inactiva' });
      return res.status(403).json({ error: 'Cuenta inactiva' });
    }

    const isMatch = await bcrypt.compare(password, operator.password_hash);
    if (!isMatch) {
      await logSecurityEvent(null, 'FAILED_OPERATOR_LOGIN_ATTEMPT', 'MEDIUM', req, { email, reason: 'Contraseña incorrecta' });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Obtener roles y permisos del operador bajo el nuevo esquema RBAC
    const { permissions, roles } = await getUserRolesAndPermissions('operator', operator.id);

    // Generar JWT
    const token = jwt.sign(
      {
        id: operator.id,
        email: operator.email,
        rol: 'operator',
        actorType: 'operator',
        storeId: operator.store_id,
        storeIds: [operator.store_id],
        nombres: operator.nombres,
        apellidos: operator.apellidos,
        permissions,
        roles
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logSecurityEvent(null, 'SUCCESSFUL_OPERATOR_LOGIN', 'LOW', req, { operatorId: operator.id });

    res.json({
      token,
      user: {
        id: operator.id,
        email: operator.email,
        nombre: `${operator.nombres} ${operator.apellidos}`.trim(),
        nombres: operator.nombres,
        apellidos: operator.apellidos,
        rol: 'operator',
        actorType: 'operator',
        storeId: operator.store_id,
        storeIds: [operator.store_id],
        permissions,
        roles
      }
    });

  } catch (error) {
    console.error('Operator login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// @route   POST /api/auth/system-login
// @desc    Authenticate system or root user & get token
router.post('/system-login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const [systems] = await db.query(
      'SELECT * FROM system_users WHERE email = ?',
      [email]
    );
    const systemUser = systems[0];

    if (!systemUser) {
      await logSecurityEvent(null, 'FAILED_SYSTEM_LOGIN_ATTEMPT', 'HIGH', req, { email, reason: 'Usuario del sistema no encontrado' });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (systemUser.estado !== 'activo') {
      await logSecurityEvent(null, 'FAILED_SYSTEM_LOGIN_ATTEMPT', 'HIGH', req, { email, reason: 'Usuario del sistema inactivo' });
      return res.status(403).json({ error: 'Cuenta inactiva' });
    }

    const isMatch = await bcrypt.compare(password, systemUser.password_hash);
    if (!isMatch) {
      await logSecurityEvent(null, 'FAILED_SYSTEM_LOGIN_ATTEMPT', 'HIGH', req, { email, reason: 'Contraseña incorrecta' });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Obtener roles y permisos del usuario de sistema bajo el nuevo esquema RBAC
    const { permissions, roles } = await getUserRolesAndPermissions('system_user', systemUser.id);

    // Generar JWT
    const token = jwt.sign(
      {
        id: systemUser.id,
        email: systemUser.email,
        rol: systemUser.nivel, // 'root' o 'system'
        actorType: 'system_user',
        nivel: systemUser.nivel,
        nombres: systemUser.nombres,
        apellidos: systemUser.apellidos,
        permissions,
        roles
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logSecurityEvent(null, 'SUCCESSFUL_SYSTEM_LOGIN', 'LOW', req, { systemUserId: systemUser.id, nivel: systemUser.nivel });

    res.json({
      token,
      user: {
        id: systemUser.id,
        email: systemUser.email,
        nombre: `${systemUser.nombres} ${systemUser.apellidos}`.trim(),
        nombres: systemUser.nombres,
        apellidos: systemUser.apellidos,
        rol: systemUser.nivel,
        actorType: 'system_user',
        nivel: systemUser.nivel,
        permissions,
        roles
      }
    });

  } catch (error) {
    console.error('System login error:', error);
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

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar si ya existe
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      await connection.commit();
      return res.status(200).json({ message: 'Usuario ya sincronizado', user: existing[0] });
    }

    // Separar nombre en nombres y apellidos
    const parts = (nombre || 'Usuario Focnius').trim().split(/\s+/);
    const nombres = parts.slice(0, -1).join(' ') || parts[0];
    const apellidos = parts.length > 1 ? parts[parts.length - 1] : '';

    // Insertar con rol customer y un password hash dummy ya que Firebase maneja la auth real
    const dummyHash = await bcrypt.hash(firebaseUid, 10);
    const [result] = await connection.query(
      'INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, ?, ?)',
      [email, dummyHash, 'customer', 'activo']
    );
    const userId = result.insertId;

    // Crear el perfil básico correspondiente
    // Para cédula y teléfono en este paso rápido, generamos placeholders basados en el insertId
    await connection.query(
      'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
      [
        userId,
        nombres,
        apellidos,
        `REG_${userId}`,
        `300${String(userId).padStart(7, '0')}`
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Usuario sincronizado exitosamente',
      user: { id: userId, email, rol: 'customer' }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Mobile Register error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
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
      // Actualizar perfil del usuario en la tabla profiles
      await connection.query(
        'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos), cedula = VALUES(cedula), telefono = VALUES(telefono)',
        [userId, dbNombres, dbApellidos, cedula || `REG_${userId}`, celular]
      );
    } else {
      // 2. Insertar nuevo usuario (las credenciales de acceso base)
      let hash;
      if (firebaseUid) {
        hash = await bcrypt.hash(firebaseUid, 10);
      } else {
        hash = await bcrypt.hash(password, 10);
      }

      const [result] = await connection.query(
        'INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, ?, ?)',
        [email, hash, 'customer', 'activo']
      );
      userId = result.insertId;

      // Crear el perfil del usuario (los datos civiles)
      await connection.query(
        'INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
        [userId, dbNombres, dbApellidos, cedula || `REG_${userId}`, celular]
      );
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
        telefono: celular,
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

// Importar middleware de autenticación
const { auth } = require('../middleware/auth');

// @route   PATCH /api/auth/activate-driver
// @desc    Enable driver mode for a customer
router.patch('/activate-driver', auth, async (req, res) => {
  const { aceptar_terminos } = req.body;
  const userId = req.user.id;

  if (!aceptar_terminos) {
    return res.status(400).json({ error: 'Debe aceptar los términos y condiciones de repartidor.' });
  }

  try {
    // Validar que el rol sea customer
    const [users] = await db.query('SELECT rol FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const user = users[0];

    if (user.rol !== 'customer') {
      return res.status(400).json({ error: 'Solo los usuarios con rol customer pueden activar el modo repartidor.' });
    }

    // Actualizar en base de datos
    await db.query('UPDATE users SET es_repartidor = 1, repartidor_activo = 1 WHERE id = ?', [userId]);

    // Obtener los datos del perfil actualizados
    const [profiles] = await db.query('SELECT nombres, apellidos, telefono FROM profiles WHERE usuario_id = ?', [userId]);
    const profile = profiles[0] || {};

    // Obtener roles y permisos del usuario bajo el nuevo esquema RBAC
    const { permissions, roles } = await getUserRolesAndPermissions('user', userId);

    // Regenerar JWT con los nuevos flags
    const token = jwt.sign(
      { 
        id: userId, 
        email: req.user.email, 
        rol: 'customer', 
        es_repartidor: 1, 
        repartidor_activo: 1,
        permissions, 
        roles,
        commerceId: null, 
        storeIds: [] 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Modo repartidor activado exitosamente.',
      token,
      user: {
        id: userId,
        email: req.user.email,
        nombre: `${profile.nombres || ''} ${profile.apellidos || ''}`.trim() || 'Usuario Focnius',
        rol: 'customer',
        es_repartidor: 1,
        repartidor_activo: 1,
        permissions
      }
    });

  } catch (error) {
    console.error('Activate driver error:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// @route   PATCH /api/auth/driver-status
// @desc    Turn driver duty status on or off
router.patch('/driver-status', auth, async (req, res) => {
  const { activo } = req.body;
  const userId = req.user.id;

  if (activo === undefined) {
    return res.status(400).json({ error: 'Debe proveer el estado del turno (activo: true/false).' });
  }

  try {
    // Validar que el usuario tenga el modo repartidor habilitado
    const [users] = await db.query('SELECT es_repartidor FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const user = users[0];

    if (user.es_repartidor !== 1) {
      return res.status(400).json({ error: 'El usuario no tiene el modo repartidor habilitado.' });
    }

    // Actualizar el estado
    const statusVal = activo ? 1 : 0;
    await db.query('UPDATE users SET repartidor_activo = ? WHERE id = ?', [statusVal, userId]);

    res.json({
      message: `Turno de repartidor ${activo ? 'iniciado' : 'finalizado'} exitosamente.`,
      repartidor_activo: statusVal
    });

  } catch (error) {
    console.error('Driver status error:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// @route   POST /api/auth/refresh-session
// @desc    Refresh user token with updated roles and permissions
router.post('/refresh-session', auth, async (req, res) => {
  const { id: userId, actorType } = req.user;

  try {
    let userRecord = null;
    let permissions = [];
    let roles = [];
    let tokenPayload = {};

    // 1. Obtener roles y permisos actualizados
    const rbacData = await getUserRolesAndPermissions(actorType, userId);
    permissions = rbacData.permissions;
    roles = rbacData.roles;

    // 2. Resolver datos del usuario de acuerdo a su actorType
    if (actorType === 'user') {
      const [users] = await db.query(`
        SELECT u.id, u.email, u.rol, u.estado, u.es_repartidor, u.repartidor_activo,
               p.nombres, p.apellidos,
               c.id AS commerce_id,
               s.id AS store_id,
               s.commerce_id AS store_commerce_id,
               dc.id AS delivery_company_id
        FROM users u
        LEFT JOIN profiles p ON p.usuario_id = u.id
        LEFT JOIN commerces c ON c.usuario_id = u.id
        LEFT JOIN stores s ON s.usuario_id = u.id
        LEFT JOIN delivery_companies dc ON dc.usuario_id = u.id
        WHERE u.id = ?
      `, [userId]);
      userRecord = users[0];

      if (!userRecord || userRecord.estado !== 'activo') {
        return res.status(403).json({ error: 'Usuario inactivo o no encontrado.' });
      }

      let commerceId = null;
      let storeIds = [];
      let deliveryCompanyId = null;
      let adminType = null;

      if (userRecord.rol === 'admin') {
        if (userRecord.commerce_id) {
          adminType = 'commerce';
          commerceId = userRecord.commerce_id;
          const [stores] = await db.query('SELECT id FROM stores WHERE commerce_id = ?', [commerceId]);
          storeIds = stores.map(s => s.id);
        } else if (userRecord.store_id) {
          adminType = 'store';
          commerceId = userRecord.store_commerce_id;
          storeIds = [userRecord.store_id];
        } else if (userRecord.delivery_company_id) {
          adminType = 'delivery_company';
          deliveryCompanyId = userRecord.delivery_company_id;
        }
      }

      tokenPayload = {
        id: userRecord.id,
        email: userRecord.email,
        rol: userRecord.rol,
        actorType: 'user',
        adminType,
        es_repartidor: userRecord.es_repartidor,
        repartidor_activo: userRecord.repartidor_activo,
        permissions,
        roles,
        commerceId,
        storeIds,
        deliveryCompanyId
      };

    } else if (actorType === 'operator') {
      const [operators] = await db.query('SELECT * FROM store_operators WHERE id = ?', [userId]);
      userRecord = operators[0];

      if (!userRecord || userRecord.estado !== 'activo') {
        return res.status(403).json({ error: 'Operador inactivo o no encontrado.' });
      }

      tokenPayload = {
        id: userRecord.id,
        email: userRecord.email,
        rol: 'operator',
        actorType: 'operator',
        storeId: userRecord.store_id,
        storeIds: [userRecord.store_id],
        nombres: userRecord.nombres,
        apellidos: userRecord.apellidos,
        permissions,
        roles
      };

    } else if (actorType === 'system_user') {
      const [systems] = await db.query('SELECT * FROM system_users WHERE id = ?', [userId]);
      userRecord = systems[0];

      if (!userRecord || userRecord.estado !== 'activo') {
        return res.status(403).json({ error: 'Usuario de sistema inactivo o no encontrado.' });
      }

      tokenPayload = {
        id: userRecord.id,
        email: userRecord.email,
        rol: userRecord.nivel,
        actorType: 'system_user',
        nivel: userRecord.nivel,
        nombres: userRecord.nombres,
        apellidos: userRecord.apellidos,
        permissions,
        roles
      };
    } else {
      return res.status(400).json({ error: 'Tipo de actor inválido para refresco de sesión.' });
    }

    // 3. Firmar nuevo token
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        nombre: `${userRecord.nombres || ''} ${userRecord.apellidos || ''}`.trim() || 'Usuario Focnius',
        nombres: userRecord.nombres,
        apellidos: userRecord.apellidos,
        rol: tokenPayload.rol,
        actorType,
        permissions,
        roles,
        ...(actorType === 'user' ? {
          adminType: tokenPayload.adminType,
          commerceId: tokenPayload.commerceId,
          storeIds: tokenPayload.storeIds,
          deliveryCompanyId: tokenPayload.deliveryCompanyId
        } : {}),
        ...(actorType === 'operator' ? {
          storeId: userRecord.store_id,
          storeIds: [userRecord.store_id]
        } : {})
      }
    });

  } catch (error) {
    console.error('Refresh session error:', error);
    res.status(500).json({ error: 'Error interno del servidor al refrescar sesión.' });
  }
});

module.exports = router;
