require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    console.log('--- Iniciando migración: nit_dv en commerces (Usando Deployer) ---');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: 'bienestar_deployer',
        password: 'D3pl0y3r_2026_Secure',
        database: process.env.DB_NAME
    });
    
    try {
        // Verificar si la columna ya existe
        const [columns] = await connection.query('SHOW COLUMNS FROM commerces LIKE "nit_dv"');
        
        if (columns.length === 0) {
            console.log('Agregando columna nit_dv a commerces...');
            await connection.query('ALTER TABLE commerces ADD COLUMN nit_dv VARCHAR(2) DEFAULT NULL AFTER nit');
            console.log('Columna agregada con éxito.');
        } else {
            console.log('La columna nit_dv ya existe.');
        }

        console.log('Migración completada.');
        process.exit(0);
    } catch (error) {
        console.error('Error en la migración:', error);
        process.exit(1);
    }
}

migrate();
