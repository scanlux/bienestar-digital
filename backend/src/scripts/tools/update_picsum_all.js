const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  console.log('Connecting to database...');
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'bienestar_admin_prod',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  });

  try {
    console.log('Updating all stores image_url...');
    const [resStores] = await c.query(
      "UPDATE stores SET image_url = 'https://picsum.photos/600/400' WHERE image_url IS NULL OR image_url = '' OR image_url NOT LIKE '%picsum%'"
    );
    console.log(`Updated ${resStores.affectedRows} stores.`);

    console.log('Updating all products image_url...');
    const [resProducts] = await c.query(
      "UPDATE products SET image_url = 'https://picsum.photos/600/400' WHERE image_url IS NULL OR image_url = '' OR image_url NOT LIKE '%picsum%'"
    );
    console.log(`Updated ${resProducts.affectedRows} products.`);

    // Actualizar nombres genéricos a nombres bonitos si existen en la DB
    await c.query(
      "UPDATE stores SET nombre_sucursal = 'Trattoria Nápoles - Chapinero' WHERE nombre_sucursal = 'Sede Chapinero'"
    );
    await c.query(
      "UPDATE stores SET nombre_sucursal = 'Gourmet Burger Club - Cedritos' WHERE nombre_sucursal = 'Sede Cedritos'"
    );
    await c.query(
      "UPDATE stores SET nombre_sucursal = 'Taco Loco - Centro Yopal' WHERE nombre_sucursal = 'Sede Yopal'"
    );

    console.log('Update completed successfully.');
  } catch (err) {
    console.error('Error during update:', err);
  } finally {
    await c.end();
  }
})();
