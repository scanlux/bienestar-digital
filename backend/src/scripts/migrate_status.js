const db = require('../config/db');

async function migrate() {
    console.log('Iniciando migraciÃ³n: AÃ±adiendo columna status a marcas...');
    
    try {
        // 1. AÃ±adir columna status
        try {
            await db.query(`
                ALTER TABLE brands 
                ADD COLUMN status ENUM('pending', 'active', 'rejected') DEFAULT 'pending'
            `);
            console.log('Columna status aÃ±adida (default pending).');
        } catch(e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('La columna status ya existe.');
            } else {
                throw e;
            }
        }

        // 2. Marcar marcas actuales como 'active'
        const [result] = await db.query("UPDATE brands SET status = 'active' WHERE status = 'pending'");
        console.log(`Actualizadas ${result.affectedRows} marcas a estado 'active'.`);

        console.log('MigraciÃ³n completada exitosamente.');
    } catch (error) {
        console.error('Error durante la migraciÃ³n:', error);
    } finally {
        process.exit();
    }
}

migrate();
