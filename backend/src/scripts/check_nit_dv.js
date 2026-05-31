require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    console.log('--- Verificando columna nit_dv en commerces ---');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    try {
        const [columns] = await connection.query('SHOW COLUMNS FROM commerces LIKE "nit_dv"');
        if (columns.length > 0) {
            console.log('SUCCESS: La columna nit_dv EXISTE.');
            console.log('Detalles:', columns[0]);
        } else {
            console.log('ERROR: La columna nit_dv NO EXISTE.');
        }

        console.log('\n--- Verificando usuario bienestar_deployer ---');
        try {
            const [users] = await connection.query("SELECT User FROM mysql.user WHERE User = 'bienestar_deployer'");
            if (users.length > 0) {
                console.log('SUCCESS: El usuario bienestar_deployer EXISTE.');
            } else {
                console.log('ERROR: El usuario bienestar_deployer NO EXISTE.');
            }
        } catch (e) {
            console.log('WARNING: No se pudo verificar mysql.user (probablemente falta de permisos), pero intentaremos conectarnos como deployer.');
        }

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error en la verificación:', error);
        process.exit(1);
    }
}

check();
