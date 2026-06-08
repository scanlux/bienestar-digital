require('dotenv').config({ path: __dirname + '/../.env' });
const mysql = require('mysql2/promise');

async function migrate() {
  try {
    console.log('Iniciando estandarización de timestamps en la base de datos...');
    
    // Conectar como root para poder alterar tablas
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_ROOT_USER || 'root',
      password: process.env.DB_ROOT_PASSWORD,
      database: process.env.DB_NAME
    });

    // Tablas que carecen tanto de created_at como de updated_at
    const tablesMissingBoth = [
      'categorias',
      'ingredients',
      'product_ingredients',
      'store_accounts',
      'store_operating_hours'
    ];

    // Tablas que carecen solo de updated_at
    const tablesMissingUpdate = [
      'stores',
      'commerces',
      'menus',
      'product_images',
      'domi_packages',
      'payment_platforms',
      'rescue_assignments',
      'order_incidents',
      'protocol_rules'
    ];

    console.log('\n--- 1. Añadiendo created_at y updated_at ---');
    for (const table of tablesMissingBoth) {
      console.log(`Alterando tabla: ${table}...`);
      await connection.query(`
        ALTER TABLE ?? 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);
      `, [table]);
      console.log(`Tabla ${table} actualizada.`);
    }

    console.log('\n--- 2. Añadiendo solo updated_at ---');
    for (const table of tablesMissingUpdate) {
      console.log(`Alterando tabla: ${table}...`);
      await connection.query(`
        ALTER TABLE ?? 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);
      `, [table]);
      console.log(`Tabla ${table} actualizada.`);
    }

    console.log('\nMigración completada con éxito.');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error crítico durante la migración:', error);
    process.exit(1);
  }
}

migrate();
