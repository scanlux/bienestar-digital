const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function run() {
  const value = process.argv[2] === '0' ? 0 : 1;
  console.log(`Setting withdrawals_enabled to ${value}...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await connection.query('SET @domi_is_root = 1');
    await connection.query('SET @domi_bypass_security = 1');
    const [result] = await connection.query('UPDATE system_financial_flags SET enabled = ? WHERE `key` = "withdrawals_enabled"', [value]);
    console.log('Update result:', result);
    await connection.end();
  } catch (error) {
    console.error('Error updating flag:', error);
    await connection.end();
  }
}

run();
