const mysql = require('mysql2/promise');

async function setup() {
    const rootPass = 'Kh#azr9b!yvP27_mQ*rT5x';
    const deployerPass = 'D3pl0y3r_2026_Secure';
    
    const connection = await mysql.createConnection({
        host: '100.127.144.125',
        user: 'root',
        password: rootPass,
        database: 'marketplace_db'
    });

    try {
        console.log('--- Creando usuario bienestar_deployer ---');
        
        await connection.query(`CREATE USER IF NOT EXISTS 'bienestar_deployer'@'%' IDENTIFIED BY '${deployerPass}'`);
        
        // Tablas Maestras / Catálogo (CON ALTER)
        const masterTables = [
            'commerces', 'stores', 'products', 'product_images', 'categorias', 
            'menus', 'ingredients', 'product_ingredients', 'payment_platforms', 'users'
        ];
        
        for (const table of masterTables) {
            console.log(`Otorgando permisos DDL en ${table}...`);
            await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE, DROP, INDEX ON marketplace_db.${table} TO 'bienestar_deployer'@'%'`);
        }

        // Libro Mayor / Ledger (SIN ALTER)
        const ledgerTables = [
            'domi_ledger', 'wallets', 'token_registry', 'protocol_rules', 
            'domi_packages', 'order_incidents', 'rescue_assignments'
        ];
        
        for (const table of ledgerTables) {
            console.log(`Otorgando permisos limitados en ${table}...`);
            // Nota: wallets y packages necesitan UPDATE para funcionar
            const perms = table === 'domi_ledger' ? 'SELECT, INSERT' : 'SELECT, INSERT, UPDATE';
            await connection.query(`GRANT ${perms} ON marketplace_db.${table} TO 'bienestar_deployer'@'%'`);
        }

        await connection.query('FLUSH PRIVILEGES');
        console.log('Usuario Deployer configurado con éxito.');
        
        process.exit(0);
    } catch (e) {
        console.error('Error configurando deployer:', e);
        process.exit(1);
    }
}

setup();
