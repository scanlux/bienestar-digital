require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');
db.query("ALTER TABLE stores MODIFY COLUMN estado ENUM('operativo','mantenimiento','vacaciones','no_disponible','remodelacion') DEFAULT 'no_disponible'")
  .then(() => { console.log('Migration successful'); process.exit(); })
  .catch(e => { console.error(e); process.exit(1); });
