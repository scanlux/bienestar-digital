require('dotenv').config();
const db = require('./src/config/db');

async function check() {
    try {
        console.log('--- TRIGGERS EN MARKETPLACE_DB ---');
        const [triggers] = await db.query('SHOW TRIGGERS');
        console.table(triggers.map(t => ({ Tabla: t.Table, Evento: t.Event, Trigger: t.Trigger })));
        
        console.log('\n--- PERMISOS DEL USUARIO ACTUAL ---');
        const [grants] = await db.query('SHOW GRANTS FOR CURRENT_USER');
        console.log(grants);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
