require('dotenv').config();
const mysql = require('mysql2/promise');

async function testDeployer() {
    console.log('--- Intentando conexión como bienestar_deployer ---');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: 'bienestar_deployer',
            password: process.env.DB_DEPLOYER_PASSWORD,
            database: process.env.DB_NAME
        });
        
        console.log('SUCCESS: Conexion EXITOSA como bienestar_deployer.');
        
        console.log('Verificando permisos en commerces...');
        const [grants] = await connection.query('SHOW GRANTS FOR CURRENT_USER');
        console.log(grants);
        
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('ERROR de conexion como bienestar_deployer:', error.message);
        process.exit(1);
    }
}

testDeployer();
