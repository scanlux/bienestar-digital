const mysql = require('mysql2/promise');
async function run() {
  try {
    const conn = await mysql.createConnection({
      host: '100.127.144.125',
      user: 'bienestar_admin_prod',
      password: '7hda}rGb_yuX2@pL9*qN4!zB1vM8',
      database: 'marketplace_db'
    });
    const [cols] = await conn.query('DESCRIBE products');
    console.log(cols);
  } catch (e) { console.error(e); } finally { process.exit(); }
}
run();
