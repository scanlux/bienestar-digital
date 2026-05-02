require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');
const { isStoreCurrentlyOpen } = require('./src/utils/timeUtils');

async function test() {
  try {
    const [stores] = await db.query(`
      SELECT 
        s.id, 
        s.nombre_sucursal, 
        s.estado, 
        c.nombre as commerce_nombre
      FROM stores s
      JOIN commerces c ON s.commerce_id = c.id
      WHERE s.estado = 'operativo'
    `);

    console.log(`Found ${stores.length} operative stores.`);

    for (const store of stores) {
      console.log(`Processing store: ${store.commerce_nombre} (${store.nombre_sucursal})`);
      
      const [schedule] = await db.query(
        'SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', 
        [store.id]
      );

      const [productItems] = await db.query(`
        SELECT p.image_url, p.nombre, p.precio_base 
        FROM products p
        JOIN categorias cat ON p.categoria_id = cat.id
        JOIN menus m ON cat.menu_id = m.id
        WHERE m.store_id = ? AND p.image_url IS NOT NULL AND p.disponible = 1
        LIMIT 4
      `, [store.id]);
      
      const isOpen = isStoreCurrentlyOpen(store.estado, schedule);
      console.log(` - Open: ${isOpen}, Products: ${productItems.length}`);
    }

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('ERROR REPRODUCED:', error);
  }
  process.exit();
}

test();
