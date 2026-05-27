const db = require('../config/db');

async function migrate() {
    console.log('--- Iniciando Migración: Columna Tags ---');
    
    try {
        await db.query(`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS tags TEXT;
        `);
        console.log('✅ Columna "tags" añadida o ya existente en la tabla products.');
        
        console.log('--- Migración Finalizada ---');
    } catch (error) {
        // En MariaDB/MySQL ALTER TABLE ... ADD COLUMN IF NOT EXISTS no es estándar en todas las versiones
        // Si falla por ya existir, lo ignoramos.
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ La columna "tags" ya existía.');
        } else {
            console.error('❌ Error durante la migración:', error);
        }
    } finally {
        process.exit();
    }
}

migrate();
