require("dotenv").config();
const mysql = require("mysql2/promise");
async function test() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
    console.log("DB Connected successfully to " + process.env.DB_HOST);
    await conn.end();
  } catch (e) {
    console.error("DB Error:", e.message);
  }
}
test();
