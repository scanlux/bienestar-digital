const db = require('./src/config/db');
require('dotenv').config();

async function check() {
    const [wallets] = await db.query("SELECT owner_type, owner_id, balance_custody, balance_utility FROM wallets");
    console.log('--- REPORTE FINAL DE BILLETERAS ---');
    console.table(wallets);
    process.exit(0);
}
check();
