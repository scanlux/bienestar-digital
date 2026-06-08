require('dotenv').config();
const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'marketplace_db'
  });

  const targetIds = [9, 10, 11];
  const plateImages = [
    'https://picsum.photos/400/400?random=14',
    'https://picsum.photos/400/400?random=171',
    'https://picsum.photos/400/400?random=226',
    'https://picsum.photos/400/400?random=899'
  ];

  for (let i = 0; i < targetIds.length; i++) {
    const storeId = targetIds[i];
    
    // 1. Cambiar la foto de la sede (logo/sede_image)
    // Usamos una imagen de picsum diferente para cada una
    const sedeLogo = `https://picsum.photos/400/400?random=${500 + storeId}`;
    await conn.query('UPDATE stores SET image_url = ? WHERE id = ?', [sedeLogo, storeId]);
    console.log(`[Sede ${storeId}] Logo actualizado.`);

    // 2. Asegurar que tengan al menos un menú y categoría
    let [menus] = await conn.query('SELECT id FROM menus WHERE store_id = ?', [storeId]);
    let menuId;
    if (menus.length === 0) {
      const [res] = await conn.query('INSERT INTO menus (store_id, nombre, descripcion) VALUES (?, ?, ?)', [storeId, 'Menú del Día', 'Nuestra selección especial']);
      menuId = res.insertId;
    } else {
      menuId = menus[0].id;
    }

    let [cats] = await conn.query('SELECT id FROM categorias WHERE menu_id = ?', [menuId]);
    let catId;
    if (cats.length === 0) {
      const [res] = await conn.query('INSERT INTO categorias (menu_id, nombre, orden_visual) VALUES (?, ?, ?)', [menuId, 'Platos Principales', 1]);
      catId = res.insertId;
    } else {
      catId = cats[0].id;
    }

    // 3. Crear o actualizar productos con las fotos de Centro Histórico
    // Borramos productos existentes para estas sedes de prueba para simplificar y creamos 3 nuevos
    await conn.query('DELETE p FROM products p JOIN categorias c ON p.categoria_id = c.id JOIN menus m ON c.menu_id = m.id WHERE m.store_id = ?', [storeId]);
    
    for (let j = 0; j < 3; j++) {
      await conn.query(
        'INSERT INTO products (nombre, image_url, categoria_id, precio_base, disponible) VALUES (?, ?, ?, ?, ?)',
        [`Especialidad ${j+1}`, plateImages[j], catId, 25000 + (j*1000), 1]
      );
    }
    console.log(`[Sede ${storeId}] 3 Productos creados con fotos de Centro Histórico.`);
  }

  console.log('--- Proceso completado con éxito ---');
  process.exit();
}
run();
