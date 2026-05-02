require('dotenv').config();
const mysql = require('mysql2/promise');

async function testSecurity() {
    console.log('--- Probando seguridad del usuario Deployer ---');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: 'bienestar_deployer',
        password: 'D3pl0y3r_2026_Secure',
        database: process.env.DB_NAME
    });
    
    try {
        console.log('Intentando ALTER TABLE en domi_ledger (Debería fallar)...');
        await connection.query('ALTER TABLE domi_ledger ADD COLUMN test_hack VARCHAR(10)');
        console.error('¡FALLO DE SEGURIDAD! El deployer pudo alterar el Libro Mayor.');
        process.exit(1);
    } catch (error) {
        console.log('SEGURIDAD CONFIRMADA:', error.message);
        process.exit(0);
    }
}

testSecurity();
