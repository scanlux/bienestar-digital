const mysql = require('mysql2/promise');

async function setup() {
  const c = await mysql.createConnection({
    host: '100.127.144.125',
    user: 'bienestar_admin_prod',
    password: '7hda}rGb_yuX2@pL9*qN4!zB1vM8',
    database: 'marketplace_db'
  });

  console.log('Conectado a la base de datos...');

  await c.query(`
    CREATE TABLE IF NOT EXISTS stop_words (
      id INT AUTO_INCREMENT PRIMARY KEY, 
      word VARCHAR(50) UNIQUE NOT NULL, 
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const initialWords = [
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 
    'con', 'de', 'del', 'para', 'por', 'en', 'y', 'e', 'o', 'u',
    'delicioso', 'rico', 'exquisito', 'mejor', 'calidad', 'fresco', 'frescos',
    'preparado', 'seleccionado', 'garantizar', 'nuestro', 'vuestra',
    'instante', 'ingredientes', 'preparados', 'casa', 'casero', 'especial',
    'sobre', 'entre', 'esta', 'este', 'estos', 'estas', 'desde', 'hasta'
  ];

  for (const w of initialWords) {
    await c.query('INSERT IGNORE INTO stop_words (word) VALUES (?)', [w]);
  }

  console.log('Tabla stop_words creada y poblada correctamente.');
  await c.end();
}

setup().catch(console.error);
