require('dotenv').config();
const db = require('../src/config/db');

async function migrate() {
    console.log('--- Iniciando migración de horarios de sedes ---');
    
    try {
        // 1. Añadir columnas de horario estructuradas
        console.log('1. Añadiendo columnas open_time, close_time y is_24h a la tabla stores...');
        try {
            await db.query(`
                ALTER TABLE stores 
                ADD COLUMN open_time TIME NULL,
                ADD COLUMN close_time TIME NULL,
                ADD COLUMN is_24h TINYINT(1) DEFAULT 0
            `);
            console.log('✅ Columnas añadidas con éxito.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Las columnas ya existen.');
            } else {
                throw e;
            }
        }

        // 2. Opcional: Migrar datos existentes (heurística simple)
        // Por ahora lo dejamos en blanco para que el usuario las llene manualmente con los selectores premium.
        // Pero marcamos como realizado.

        console.log('--- Migración finalizada con éxito ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        process.exit(1);
    }
}

migrate();
