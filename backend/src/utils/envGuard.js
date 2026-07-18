const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function checkDatabaseResetAllowed() {
  if (process.env.ALLOW_DATABASE_RESET !== 'true') {
    console.error('\n[FATAL ERROR] Ejecución denegada: La variable ALLOW_DATABASE_RESET no está configurada como "true" en el archivo .env.');
    console.error('Esta es una medida de seguridad crítica para prevenir reseteos accidentales.\n');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('\n[FATAL ERROR] Ejecución denegada: No se permite realizar reseteos o limpiezas de base de datos en el entorno de producción (NODE_ENV=production).\n');
    process.exit(1);
  }

  // Verificar si el DB_HOST apunta a un host productivo
  const dbHost = process.env.DB_HOST || '';
  const prodIps = ['150.136.118.187', '193.122.218.203', '157.137.229.132', '10.0.0.39', '10.0.0.140', '10.0.0.158'];
  if (prodIps.includes(dbHost.trim())) {
    console.error(`\n[FATAL ERROR] Ejecución denegada: El DB_HOST configurado (${dbHost}) pertenece a una IP protegida de producción.\n`);
    process.exit(1);
  }
}

module.exports = { checkDatabaseResetAllowed };
