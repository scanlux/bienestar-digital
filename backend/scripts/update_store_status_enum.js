require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'marketplace_db'
    });

    try {
        console.log('--- Actualizando ENUM de estados en tabla stores ---');
        
        // 1. Mapear valores actuales a los nuevos temporales (si es necesario)
        // Pero como vamos a cambiar el ENUM, MySQL puede dar problemas si los valores actuales no están en el nuevo.
        // Primero ampliamos el ENUM para incluir todos (viejos y nuevos)
        await connection.query(`
            ALTER TABLE stores MODIFY COLUMN estado ENUM('abierto', 'cerrado', 'mantenimiento', 'operativo', 'vacaciones', 'no_disponible') DEFAULT 'abierto'
        `);

        // 2. Ejecutar el mapeo de datos
        console.log('Mapeando: abierto -> operativo, cerrado -> no_disponible');
        await connection.query("UPDATE stores SET estado = 'operativo' WHERE estado = 'abierto'");
        await connection.query("UPDATE stores SET estado = 'no_disponible' WHERE estado = 'cerrado'");

        // 3. Establecer el ENUM definitivo con el nuevo default
        console.log('Estableciendo ENUM definitivo y DEFAULT no_disponible');
        await connection.query(`
            ALTER TABLE stores MODIFY COLUMN estado ENUM('operativo', 'mantenimiento', 'vacaciones', 'no_disponible') DEFAULT 'no_disponible'
        `);

        console.log('Migración exitosa.');

    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await connection.end();
    }
}

migrate();
