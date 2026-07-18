const fs = require('fs');
const path = require('path');
const fsPromises = fs.promises;

const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, 'combined.log');
const securityFile = path.join(logDir, 'security.log');

// Garantizar que exista el directorio de logs
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Lista de llaves sensibles para sanitizacion
const SENSITIVE_KEYS = [
  'password', 'token', 'jwt', 'authorization', 'authorization_header',
  'numero_cuenta', 'cvv', 'numero_tarjeta', 'card_number', 'cvv2',
  'contraseña', 'clave'
];

/**
 * Sanitiza recursivamente objetos y arreglos eliminando informacion sensible.
 */
function sanitize(val) {
  if (val === null || val === undefined) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sanitize);
  }
  if (typeof val === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(val)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some(k => lowerKey.includes(k));
      if (isSensitive) {
        cleaned[key] = '[MASKED]';
      } else {
        cleaned[key] = sanitize(value);
      }
    }
    return cleaned;
  }
  return val;
}

/**
 * Da formato y sanitiza el mensaje, soportando objetos y strings.
 */
function formatMessage(message) {
  if (message === null || message === undefined) {
    return '';
  }
  if (typeof message === 'object') {
    return JSON.stringify(sanitize(message));
  }
  if (typeof message === 'string') {
    try {
      if (message.startsWith('{') || message.startsWith('[')) {
        const parsed = JSON.parse(message);
        return JSON.stringify(sanitize(parsed));
      }
    } catch (e) {
      // Ignorar error de parseo y retornar el string original
    }
  }
  return message;
}

// Colas de escritura para evitar condiciones de carrera en la rotacion de archivos
const queues = {};

/**
 * Encola la escritura de logs y maneja la rotacion si excede 10MB
 */
function enqueueWrite(filePath, logMessage) {
  if (!queues[filePath]) {
    queues[filePath] = Promise.resolve();
  }
  
  queues[filePath] = queues[filePath].then(async () => {
    try {
      let shouldRotate = false;
      try {
        const stats = await fsPromises.stat(filePath);
        if (stats.size >= 10 * 1024 * 1024) { // 10 MB
          shouldRotate = true;
        }
      } catch (err) {
        // El archivo no existe, no requiere rotacion
      }

      if (shouldRotate) {
        // Rotar archivos secuencialmente (maximo 5)
        for (let i = 5; i >= 1; i--) {
          const currentPath = i === 1 ? filePath : `${filePath}.${i - 1}`;
          const nextPath = `${filePath}.${i}`;
          try {
            if (fs.existsSync(currentPath)) {
              if (i === 5) {
                await fsPromises.unlink(nextPath).catch(() => {});
              }
              await fsPromises.rename(currentPath, nextPath);
            }
          } catch (err) {
            console.error(`Error rotando log ${currentPath} a ${nextPath}:`, err.message);
          }
        }
      }

      await fsPromises.appendFile(filePath, logMessage);
    } catch (err) {
      console.error('Fallo al escribir log en el archivo:', err.message);
    }
  });
  
  return queues[filePath];
}

/**
 * Escribe log en combined.log
 */
function writeLog(level, message) {
  const sanitizedMsg = formatMessage(message);
  const timestamp = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().replace('Z', '');
  const logMessage = `[${timestamp}] [${level}] ${sanitizedMsg}\n`;
  
  const colors = {
    INFO: '\x1b[32m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    RESET: '\x1b[0m'
  };
  
  const consoleMessage = `${colors[level] || ''}[${level}] [${timestamp}]${colors.RESET} ${sanitizedMsg}`;
  
  if (level === 'ERROR') {
    console.error(consoleMessage);
  } else if (level === 'WARN') {
    console.warn(consoleMessage);
  } else {
    console.log(consoleMessage);
  }
  
  enqueueWrite(logFile, logMessage);
}

/**
 * Escribe log en security.log
 */
function writeSecurityLog(message) {
  const sanitizedMsg = formatMessage(message);
  const timestamp = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().replace('Z', '');
  const logMessage = `[${timestamp}] [SECURITY] ${sanitizedMsg}\n`;

  if (process.env.NODE_ENV !== 'production') {
    const consoleMessage = `\x1b[33m[SECURITY] [${timestamp}]\x1b[0m ${sanitizedMsg}`;
    console.warn(consoleMessage);
  }

  enqueueWrite(securityFile, logMessage);
}

module.exports = {
  info: (msg) => writeLog('INFO', msg),
  warn: (msg) => writeLog('WARN', msg),
  error: (msg) => writeLog('ERROR', msg),
  security: (msg) => writeSecurityLog(msg)
};
