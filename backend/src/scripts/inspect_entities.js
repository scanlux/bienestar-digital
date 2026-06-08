require('dotenv').config();
const db = require('../config/db');

async function main() {
  try {
    console.log('--- ENROLLMENT INFO ---');
    
    console.log('\n--- COMMERCES ---');
    const [commerces] = await db.query('SELECT * FROM commerces');
    console.log(commerces);

    console.log('\n--- STORES ---');
    const [stores] = await db.query('SELECT * FROM stores');
    console.log(stores);

    console.log('\n--- ADMIN USERS ---');
    const [users] = await db.query('SELECT * FROM users WHERE rol = "admin" OR email LIKE "%admin%"');
    console.log(users);

    console.log('\n--- PERMISSION CATEGORIES ---');
    const [categories] = await db.query('SELECT * FROM permission_categories');
    console.log(categories);

    console.log('\n--- PERMISSIONS ---');
    const [permissions] = await db.query('SELECT id, category_id, name, description FROM permissions');
    console.log(permissions);

  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
    process.exit(0);
  }
}

main();
