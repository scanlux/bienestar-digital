require('dotenv').config();
const db = require('./src/config/db');

async function run() {
  try {
    const [wallets] = await db.query(
      "SELECT id, owner_type, owner_id, balance_custody FROM wallets"
    );
    console.log("Wallets:");
    console.table(wallets);

    const [aliases] = await db.query(
      "SELECT * FROM wallet_aliases"
    );
    console.log("Aliases in DB:");
    console.table(aliases);
  } catch (error) {
    console.error("Error querying db:", error.message);
  } finally {
    process.exit();
  }
}
run();
