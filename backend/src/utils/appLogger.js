const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, 'combined.log');

// Garantizar que exista el directorio de logs
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function writeLog(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  // Colores para consola (consola premium)
  const colors = {
    INFO: '\x1b[32m',  // Verde
    WARN: '\x1b[33m',  // Amarillo
    ERROR: '\x1b[31m', // Rojo
    RESET: '\x1b[0m'
  };
  
  const consoleMessage = `${colors[level] || ''}[${level}] [${timestamp}]${colors.RESET} ${message}`;
  
  if (level === 'ERROR') {
    console.error(consoleMessage);
  } else if (level === 'WARN') {
    console.warn(consoleMessage);
  } else {
    console.log(consoleMessage);
  }
  
  // Escritura asincrona en archivo
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('Fallo al escribir log en el archivo:', err.message);
    }
  });
}

module.exports = {
  info: (msg) => writeLog('INFO', msg),
  warn: (msg) => writeLog('WARN', msg),
  error: (msg) => writeLog('ERROR', msg)
};
