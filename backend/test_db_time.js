const db = require('./src/config/db');
db.query('SELECT open_time, close_time FROM store_operating_hours LIMIT 1')
  .then(r => { console.log(r[0]); process.exit(); })
  .catch(e => { console.error(e); process.exit(1); });
