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

    console.log('[INFO] Buscando categorias...');
    const [categories] = await conn.query('SELECT * FROM categories');
    console.log('[INFO] Categorias disponibles:', categories.map(c => ({ id: c.id, nombre: c.nombre, menu_id: c.menu_id })));

    if (categories.length === 0) {
      console.warn('[WARN] No se encontraron categorías.');
      return;
    }

    // Busquemos "Platos Fuertes" o la primera categoría
    let cat = categories.find(c => c.nombre.toLowerCase().includes('platos fuertes'));
    if (!cat) {
      cat = categories[0];
    }

    console.log(`[INFO] Usando categoria: ${cat.nombre} (ID: ${cat.id}), Menu ID: ${cat.menu_id}`);

    // Insertar dos productos en products (Catálogo Maestro)
    const product1 = {
      commerce_id: 1,
      nombre: 'Chicharrón Crujiente',
      precio_base: 28000,
      tiempo_prep_estimado: 20,
      categoria_id: cat.id,
      menu_id: cat.menu_id,
      disponible: 1,
      image_url: '/uploads/products/chicharron.png'
    };

    const product2 = {
      commerce_id: 1,
      nombre: 'Empanadas de la Casa',
      precio_base: 12000,
      tiempo_prep_estimado: 15,
      categoria_id: cat.id,
      menu_id: cat.menu_id,
      disponible: 0, // No disponible para probar el sombreado "apagado"
      image_url: '/uploads/products/empanadas.png'
    };

    const [res1] = await conn.query(
      'INSERT INTO products (commerce_id, nombre, precio_base, tiempo_prep_estimado, categoria_id, menu_id, disponible, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [product1.commerce_id, product1.nombre, product1.precio_base, product1.tiempo_prep_estimado, product1.categoria_id, product1.menu_id, product1.disponible, product1.image_url]
    );

    const [res2] = await conn.query(
      'INSERT INTO products (commerce_id, nombre, precio_base, tiempo_prep_estimado, categoria_id, menu_id, disponible, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [product2.commerce_id, product2.nombre, product2.precio_base, product2.tiempo_prep_estimado, product2.categoria_id, product2.menu_id, product2.disponible, product2.image_url]
    );

    console.log('[OK] Productos insertados en catalogo maestro.');

    // Ahora insertarlos en store_products para habilitación local (para store_id = 1)
    const [stores] = await conn.query('SELECT id FROM stores LIMIT 1');
    if (stores.length > 0) {
      const storeId = stores[0].id;
      
      // Limpiar duplicados previos si existieran
      await conn.query('DELETE FROM store_products WHERE store_id = ? AND product_id IN (?, ?)', [storeId, res1.insertId, res2.insertId]);

      await conn.query(
        'INSERT INTO store_products (store_id, product_id, disponible, habilitado) VALUES (?, ?, 1, 1)',
        [storeId, res1.insertId]
      );
      await conn.query(
        'INSERT INTO store_products (store_id, product_id, disponible, habilitado) VALUES (?, ?, 0, 1)',
        [storeId, res2.insertId]
      );
      console.log(`[OK] Habilitaciones de productos creadas para la sede ID: ${storeId}.`);
    }

  } catch (e) {
    console.error('[ERROR]', e);
  } finally {
    if (conn) await conn.end();
    process.exit();
  }
}

run();
