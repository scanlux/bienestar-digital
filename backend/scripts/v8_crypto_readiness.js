require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('=== Iniciando Migración v8: DOMI Crypto-Readiness ===');
  const sqlFilePath = path.join(__dirname, 'v8_crypto_readiness.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Error: Archivo SQL no encontrado en ${sqlFilePath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Limpiar comentarios de una sola linea (-- ...) y comentarios de bloque (/* ... */)
  const cleanSql = sqlContent
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Dividir el archivo SQL en sentencias individuales limpias
  const statements = cleanSql
    .split(';')
    .map(st => st.trim())
    .filter(st => st.length > 0);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    console.log(`Cargadas ${statements.length} sentencias SQL para ejecución.`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const summary = stmt.substring(0, 80).replace(/\n/g, ' ') + '...';
      console.log(`Ejecutando sentencia [${i + 1}/${statements.length}]: ${summary}`);

      try {
        await conn.query(stmt);
        console.log(`  -> Éxito`);
      } catch (err) {
        // Ignorar errores comunes si las columnas o tablas ya existen (haciendo el script idempotente)
        const errorCode = err.code || err.errno;
        const message = err.message || '';
        
        const isIgnorable = [
          'ER_DUP_FIELDNAME',          // Columna duplicada
          'ER_DUP_KEYNAME',            // Indice duplicado
          'ER_DUP_CONSTRAINT_NAME',    // Restriccion FK duplicada
          'ER_TABLE_EXISTS_ERROR',     // Tabla ya existe
          '1060',                      // Duplicated column
          '1061',                      // Duplicate key name
          '1050',                      // Table already exists
          '1022'                       // Can't write; duplicate key in table
        ].some(code => String(errorCode).includes(code) || message.includes(code));

        if (isIgnorable) {
          console.warn(`  -> Ignorado (Ya aplicado previamente): ${message.split('\n')[0]}`);
        } else {
          console.error(`  -> ERROR crítico ejecutando sentencia:`);
          console.error(stmt);
          throw err;
        }
      }
    }

    await conn.commit();
    console.log('=== Migración v8 completada con éxito en la base de datos ===');
  } catch (error) {
    await conn.rollback();
    console.error('=== Migración v8 ABORTADA debido a un error crítico ===');
    console.error(error);
    process.exit(1);
  } finally {
    conn.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
