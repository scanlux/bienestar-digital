const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDatasetDir, sanitizeDeviceId } = require('../utils/helpers');

const VER_SESSION_SECRET = process.env.VER_SESSION_SECRET || 'bienestar_ver_secure_session_key_2026';

function getCredentialsFilePath(safeDeviceId) {
  const targetDir = getDatasetDir();
  return path.join(targetDir, 'devices', safeDeviceId, 'credentials_ver.json');
}

function getCentralAccountsFilePath() {
  const targetDir = getDatasetDir();
  return path.join(targetDir, 'ver_accounts.json');
}

function generateSecurePassword(length = 8) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

/**
 * Obtiene o autogenera credenciales exclusivas para el módulo /expl/ver vinculadas a un dispositivo.
 */
function getOrCreateDeviceVerCredentials(rawDeviceId) {
  const safeId = sanitizeDeviceId(rawDeviceId);
  if (!safeId) return null;

  const targetDir = getDatasetDir();
  const deviceDir = path.join(targetDir, 'devices', safeId);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }

  const credPath = getCredentialsFilePath(safeId);
  if (fs.existsSync(credPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      if (data && data.username && data.password) {
        return data;
      }
    } catch (e) {
      console.warn(`[VER_AUTH] Error leyendo credenciales para ${safeId}: ${e.message}`);
    }
  }

  // Generar nuevas credenciales
  const username = `ver_${safeId.substring(0, 12)}`.toLowerCase();
  const password = generateSecurePassword(10);
  const now = new Date().toISOString();

  const credentials = {
    deviceId: safeId,
    username,
    password,
    createdAt: now,
    lastLoginAt: null
  };

  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2), 'utf8');

  // Registrar también en el índice central de cuentas para búsqueda rápida en login
  try {
    const centralPath = getCentralAccountsFilePath();
    let centralAccounts = {};
    if (fs.existsSync(centralPath)) {
      try {
        centralAccounts = JSON.parse(fs.readFileSync(centralPath, 'utf8'));
      } catch (e) {
        centralAccounts = {};
      }
    }
    centralAccounts[username] = {
      deviceId: safeId,
      password,
      updatedAt: now
    };
    fs.writeFileSync(centralPath, JSON.stringify(centralAccounts, null, 2), 'utf8');
  } catch (e) {
    console.warn(`[VER_AUTH] Error actualizando indice central: ${e.message}`);
  }

  console.log(`[VER_AUTH] Credenciales autogeneradas para /expl/ver (Dispositivo: ${safeId}): Usuario: ${username} | Password: ${password}`);
  return credentials;
}

/**
 * Valida credenciales de acceso para /expl/ver
 */
function authenticateVerUser(username, password) {
  if (!username || !password) return null;

  const cleanUser = String(username).trim().toLowerCase();
  const centralPath = getCentralAccountsFilePath();

  // 1. Buscar primero en índice central
  if (fs.existsSync(centralPath)) {
    try {
      const centralAccounts = JSON.parse(fs.readFileSync(centralPath, 'utf8'));
      if (centralAccounts[cleanUser] && centralAccounts[cleanUser].password === password) {
        return {
          username: cleanUser,
          deviceId: centralAccounts[cleanUser].deviceId
        };
      }
    } catch (e) {}
  }

  // 2. Si no está en el índice central, buscar en carpetas de dispositivos
  const targetDir = getDatasetDir();
  const devicesDir = path.join(targetDir, 'devices');
  if (fs.existsSync(devicesDir)) {
    try {
      const folders = fs.readdirSync(devicesDir);
      for (const folder of folders) {
        const credPath = path.join(devicesDir, folder, 'credentials_ver.json');
        if (fs.existsSync(credPath)) {
          try {
            const data = JSON.parse(fs.readFileSync(credPath, 'utf8'));
            if (data && data.username && data.username.toLowerCase() === cleanUser && data.password === password) {
              return {
                username: cleanUser,
                deviceId: data.deviceId || folder
              };
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Genera el token de sesión criptográfico para una cuenta validada
 */
function createVerSessionToken(deviceId, username) {
  return crypto.createHmac('sha256', VER_SESSION_SECRET)
    .update(`${deviceId}:${username}`)
    .digest('hex');
}

/**
 * Valida que un token corresponda al par deviceId/username
 */
function verifyVerSessionToken(token, deviceId, username) {
  if (!token || !deviceId || !username) return false;
  const expected = createVerSessionToken(deviceId, username);
  return token === expected;
}

module.exports = {
  getOrCreateDeviceVerCredentials,
  authenticateVerUser,
  createVerSessionToken,
  verifyVerSessionToken,
  VER_SESSION_SECRET
};
