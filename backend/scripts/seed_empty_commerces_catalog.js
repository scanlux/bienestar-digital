/**
 * Para cada comercio "vacio" (sin sedes o sin catalogo maestro):
 * - 1 sede (si no tiene)
 * - 2 menus, 3 categorias, 4 productos
 * - Habilitacion en pivotes store_* para todas las sedes del comercio
 *
 * Ejecutar en servidor: node scripts/seed_empty_commerces_catalog.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/config/db');

const MENU_NAMES = ['Menu Principal', 'Menu Especial'];
const CATEGORY_NAMES = ['Entradas', 'Platos Fuertes', 'Bebidas'];
const PRODUCT_TEMPLATES = [
  { name: 'Opcion 1', desc: 'Producto destacado del catalogo.', price: 15000 },
  { name: 'Opcion 2', desc: 'Preparacion fresca al momento.', price: 18000 },
  { name: 'Opcion 3', desc: 'Porcion generosa para compartir.', price: 22000 },
  { name: 'Opcion 4', desc: 'Ideal para acompanar tu pedido.', price: 12000 },
];

const IMG = 'https://placehold.co/600x400/1f2937/10b981/png?text=Prod';

async function ensureSchedule(connection, storeId) {
  for (let day_index = 0; day_index <= 6; day_index++) {
    await connection.query(
      `INSERT INTO store_operating_hours (store_id, day_index, status, open_time, close_time, is_24h)
       VALUES (?, ?, 'abierto', '08:00:00', '20:00:00', 0)
       ON DUPLICATE KEY UPDATE status = 'abierto'`,
      [storeId, day_index]
    );
  }
}

async function enableCatalogForStore(connection, storeId, commerceId) {
  await connection.query(
    `INSERT INTO store_menus (store_id, menu_id, disponible)
     SELECT ?, m.id, 1 FROM menus m WHERE m.commerce_id = ?
     ON DUPLICATE KEY UPDATE disponible = 1`,
    [storeId, commerceId]
  );
  await connection.query(
    `INSERT INTO store_categories (store_id, categoria_id, disponible)
     SELECT ?, c.id, 1 FROM categorias c
     INNER JOIN menus m ON m.id = c.menu_id WHERE m.commerce_id = ?
     ON DUPLICATE KEY UPDATE disponible = 1`,
    [storeId, commerceId]
  );
  await connection.query(
    `INSERT INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible)
     SELECT ?, p.id, NULL, NULL, 1 FROM products p WHERE p.commerce_id = ?
     ON DUPLICATE KEY UPDATE disponible = 1`,
    [storeId, commerceId]
  );
}

async function seedCommerce(connection, commerce) {
  const { id: commerceId, nombre } = commerce;
  const suffix = nombre ? ` - ${nombre}` : '';

  let [stores] = await connection.query('SELECT id FROM stores WHERE commerce_id = ?', [commerceId]);
  let storeId;

  if (stores.length === 0) {
    const [res] = await connection.query(
      `INSERT INTO stores (commerce_id, nombre_sucursal, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, image_url)
       VALUES (?, ?, ?, ?, ?, ?, 4.7110, -74.0721, 'operativo', ?)`,
      [
        commerceId,
        `Sede Principal${suffix}`,
        `Contacto ${nombre || 'sede'}`,
        commerce.telefono || '+57 300 0000000',
        commerce.telefono || null,
        commerce.direccion || `Calle principal, ${commerce.ciudad || 'Bogota'}`,
        commerce.logo_url || null,
      ]
    );
    storeId = res.insertId;
    await ensureSchedule(connection, storeId);
    console.log(`  + Sede creada id=${storeId}`);
  } else {
    storeId = stores[0].id;
    console.log(`  = Sede existente id=${storeId}`);
  }

  let [menus] = await connection.query(
    'SELECT id, nombre FROM menus WHERE commerce_id = ? ORDER BY orden ASC, id ASC',
    [commerceId]
  );

  while (menus.length < 2) {
    const idx = menus.length;
    const [res] = await connection.query(
      'INSERT INTO menus (commerce_id, nombre, descripcion, orden) VALUES (?, ?, ?, ?)',
      [commerceId, MENU_NAMES[idx], `${MENU_NAMES[idx]} del comercio ${nombre}`, idx]
    );
    menus.push({ id: res.insertId, nombre: MENU_NAMES[idx] });
    console.log(`  + Menu: ${MENU_NAMES[idx]} id=${res.insertId}`);
  }

  const menu1Id = menus[0].id;
  const menu2Id = menus[1].id;

  let [cats] = await connection.query(
    `SELECT c.id, c.menu_id FROM categorias c
     INNER JOIN menus m ON m.id = c.menu_id WHERE m.commerce_id = ?`,
    [commerceId]
  );

  const catMenuPlan = [
    { menu_id: menu1Id, nombre: CATEGORY_NAMES[0], orden: 0 },
    { menu_id: menu1Id, nombre: CATEGORY_NAMES[1], orden: 1 },
    { menu_id: menu2Id, nombre: CATEGORY_NAMES[2], orden: 0 },
  ];

  for (const plan of catMenuPlan) {
    const [found] = await connection.query(
      'SELECT id FROM categorias WHERE menu_id = ? AND nombre = ? LIMIT 1',
      [plan.menu_id, plan.nombre]
    );
    if (found.length > 0) continue;

    const [res] = await connection.query(
      'INSERT INTO categorias (menu_id, nombre, descripcion, orden_visual) VALUES (?, ?, ?, ?)',
      [plan.menu_id, plan.nombre, `Seccion ${plan.nombre}`, plan.orden]
    );
    console.log(`  + Categoria: ${plan.nombre} id=${res.insertId}`);
  }

  [cats] = await connection.query(
    `SELECT c.id, c.menu_id, c.nombre FROM categorias c
     INNER JOIN menus m ON m.id = c.menu_id WHERE m.commerce_id = ?
     ORDER BY c.menu_id, c.orden_visual, c.id`,
    [commerceId]
  );

  const [[{ prodCount }]] = await connection.query(
    'SELECT COUNT(*) AS prodCount FROM products WHERE commerce_id = ?',
    [commerceId]
  );

  const categoryIds = cats.slice(0, 3).map((c) => c.id);
  if (categoryIds.length < 3) {
    throw new Error(`Comercio ${commerceId}: solo ${categoryIds.length} categorias tras seed`);
  }

  let createdProducts = 0;
  const need = Math.max(0, 4 - Number(prodCount));

  for (let i = 0; i < need; i++) {
    const tpl = PRODUCT_TEMPLATES[i];
    const catId = categoryIds[i % categoryIds.length];
    const productName = `${tpl.name}${suffix}`;
    const [res] = await connection.query(
      `INSERT INTO products (commerce_id, categoria_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano, tags)
       VALUES (?, ?, ?, ?, ?, 25, ?, 1, 0, '')`,
      [commerceId, catId, productName, tpl.desc, tpl.price, IMG]
    );
    createdProducts++;
    console.log(`  + Producto: ${productName} id=${res.insertId}`);
  }

  if (need === 0) {
    console.log(`  = Ya tiene ${prodCount} productos (no se crean mas)`);
  }

  const [allStores] = await connection.query('SELECT id FROM stores WHERE commerce_id = ?', [commerceId]);
  for (const s of allStores) {
    await enableCatalogForStore(connection, s.id, commerceId);
  }

  return { storeId, menus: 2, categories: cats.length, productsAdded: createdProducts };
}

async function main() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [emptyCommerces] = await connection.query(`
      SELECT c.*
      FROM commerces c
      WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.commerce_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM menus m WHERE m.commerce_id = c.id)
      ORDER BY c.id
    `);

    console.log(`Comercios a procesar: ${emptyCommerces.length}`);

    for (const commerce of emptyCommerces) {
      console.log(`\nComercio #${commerce.id}: ${commerce.nombre}`);
      await seedCommerce(connection, commerce);
    }

    await connection.commit();
    connection.release();
    console.log('\nSeed finalizado.');
  } catch (e) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Error:', e.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
