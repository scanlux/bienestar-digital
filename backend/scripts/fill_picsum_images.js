require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'marketplace_db'
    });

    console.log('Connected to database successfully.');

    // 1. Update Commerces (logo_url)
    const [commerces] = await conn.query('SELECT id, nombre FROM commerces');
    console.log(`Found ${commerces.length} commerces.`);
    for (const c of commerces) {
      const url = `https://picsum.photos/1024/1024?random=commerce_${c.id}`;
      await conn.query('UPDATE commerces SET logo_url = ? WHERE id = ?', [url, c.id]);
      console.log(`Updated commerce logo for: ${c.nombre} (ID: ${c.id})`);
    }

    // 2. Update Stores (image_url)
    const [stores] = await conn.query('SELECT id, nombre_sucursal FROM stores');
    console.log(`Found ${stores.length} stores.`);
    for (const s of stores) {
      const url = `https://picsum.photos/1024/1024?random=store_${s.id}`;
      await conn.query('UPDATE stores SET image_url = ? WHERE id = ?', [url, s.id]);
      console.log(`Updated store image for: ${s.nombre_sucursal} (ID: ${s.id})`);
    }

    // 3. Update Products (image_url)
    const [products] = await conn.query('SELECT id, nombre FROM products');
    console.log(`Found ${products.length} products.`);
    for (const p of products) {
      const url = `https://picsum.photos/1024/1024?random=product_${p.id}`;
      await conn.query('UPDATE products SET image_url = ? WHERE id = ?', [url, p.id]);
      console.log(`Updated product image for: ${p.nombre} (ID: ${p.id})`);
    }

    console.log('Successfully backfilled database images with picsum.photos URLs.');

  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    if (conn) {
      await conn.end();
    }
    process.exit();
  }
}

run();
