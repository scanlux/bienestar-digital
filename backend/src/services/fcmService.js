const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const appLogger = require('../utils/appLogger');

let fcmInitialized = false;

try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    const resolvedPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(__dirname, '../../', serviceAccountPath);

    if (fs.existsSync(resolvedPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      fcmInitialized = true;
      appLogger.info('[FCM] Firebase Admin SDK inicializado correctamente.');
    } else {
      appLogger.warn(`[FCM] Archivo de credenciales no encontrado en: ${resolvedPath}. Las notificaciones Push se simularán.`);
    }
  } else {
    appLogger.warn('[FCM] FIREBASE_SERVICE_ACCOUNT_PATH no definida en el .env. Las notificaciones Push se simularán.');
  }
} catch (error) {
  appLogger.error(`[FCM INIT ERROR] Fallo al iniciar Firebase Admin: ${error.message}`);
}

async function sendPush(token, payload) {
  if (!fcmInitialized) {
    appLogger.info(`[FCM SIMULATION] Enviando push a token: ${token} - Payload:`, payload);
    return { success: true, simulated: true };
  }

  try {
    const message = {
      token: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        notification: {
          sound: 'default',
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    appLogger.info(`[FCM] Notificación Push enviada correctamente: ${response}`);
    return { success: true, response };
  } catch (error) {
    appLogger.error(`[FCM ERROR] Error al enviar notificación Push: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPush };
