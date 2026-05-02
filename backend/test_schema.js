require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');
db.query("SHOW COLUMNS FROM stores LIKE 'estado'")
  .then(r => { console.log(r[0]); process.exit(); })
  .catch(e => { console.error(e); process.exit(1); });
