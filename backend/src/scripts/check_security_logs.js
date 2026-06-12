require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    const [rows] = await db.query(
      'SELECT id, actor_type, actor_id, event_type, severity, details, created_at FROM security_audit_logs ORDER BY id DESC LIMIT 10'
    );
    console.log('--- RECENT SECURITY AUDIT LOGS ---');
    console.log(JSON.stringify(rows, null, 2));
    console.log('---------------------------------');
  } catch (err) {
    console.error('Error querying security_audit_logs:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
