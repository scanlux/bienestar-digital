require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('=== EJECUTANDO MIGRACION DE PERMISOS DE MANTENIMIENTO (V14) ===');

  const sqlPath = path.join(__dirname, 'v14_system_maintenance_permissions.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error('ERROR: No se encuentra el archivo SQL v14_system_maintenance_permissions.sql.');
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log(`Conectando a base de datos...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db',
    multipleStatements: true
  });

  try {
    console.log('Aplicando sentencias SQL...');
    // Ejecutar todo el archivo con multipleStatements habilitado
    await connection.query(sqlContent);
    console.log('Migracion V14 aplicada exitosamente.');

    // Verificacion
    const [rows] = await connection.execute(
      "SELECT name, description FROM permissions WHERE name IN ('view_maintenance_status', 'manage_maintenance', 'view_system_logs')"
    );
    console.log('Permisos creados en base de datos:', rows);

  } catch (error) {
    console.error('Error durante la ejecucion de la migracion:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
