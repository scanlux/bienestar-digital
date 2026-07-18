/**
 * db_backup.js
 * Crea un respaldo de la base de datos local en formato SQL.
 */
'use strict';

require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'bienestar_admin_prod';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME || 'marketplace_db';

const backupDir = path.join(__dirname, '..', '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
const backupFile = path.join(backupDir, `backup_${DB_NAME}_${timestamp}.sql`);

console.log(`Iniciando backup de la base de datos ${DB_NAME}...`);

// Usamos mysqldump
const mysqldumpCmd = `mysqldump --host=${DB_HOST} --user=${DB_USER} --password="${DB_PASSWORD}" ${DB_NAME} > "${backupFile}"`;

exec(mysqldumpCmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error al ejecutar mysqldump: ${error.message}`);
    process.exit(1);
  }
  if (stderr && stderr.trim().length > 0 && !stderr.includes('password on the command line interface can be insecure')) {
    console.warn(`Advertencia: ${stderr}`);
  }
  console.log(`¡Backup creado con éxito!`);
  console.log(`Guardado en: ${backupFile}`);
  console.log(`Tamaño: ${fs.statSync(backupFile).size} bytes`);
  process.exit(0);
});
