/**
 * Habilita en TODAS las sedes los menus, categorias y productos de su comercio (pivot tables).
 * Rellena campos vacios en commerces, stores (desde datos del padre), menus, categorias, productos.
 *
 * NO crea comercios ni sedes nuevos.
 *
 * Ejecutar desde la carpeta backend (con .env cargado):
 *   node scripts/backfill_catalog_enable_all.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/config/db');

const IMG_PLACEHOLDER_PREFIX = 'https://placehold.co/600x400/1f2937/10b981/png?text=Prod';

async function columnExists(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].c > 0;
}

async function main() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    console.log('--- 1. Comercios: rellenar texto vacio ---');
    await connection.query(`
      UPDATE commerces SET
        descripcion = CASE
          WHEN descripcion IS NULL OR TRIM(descripcion) = ''
          THEN CONCAT('Catalogo disponible para ', nombre, '. Variedad de productos frescos y servicios de domicilio.')
          ELSE descripcion END,
        telefono = CASE WHEN telefono IS NULL OR TRIM(telefono) = '' THEN '+57 300 0000000' ELSE telefono END,
        ciudad = CASE WHEN ciudad IS NULL OR TRIM(ciudad) = '' THEN 'Bogota D.C.' ELSE ciudad END,
        direccion = CASE WHEN direccion IS NULL OR TRIM(direccion) = '' THEN 'Direccion principal por confirmar' ELSE direccion END,
        nit = CASE WHEN nit IS NULL OR TRIM(nit) = '' THEN '900000000' ELSE nit END
    `);

    console.log('--- 2. Stores: copiar telefono/ciudad desde comercio donde falte ---');
    await connection.query(`
      UPDATE stores s
      JOIN commerces c ON c.id = s.commerce_id
      SET
        s.telefono = CASE WHEN s.telefono IS NULL OR TRIM(s.telefono) = ''
          THEN COALESCE(NULLIF(TRIM(c.telefono), ''), '+57 300 0000000') ELSE s.telefono END,
        s.contacto_directo = CASE WHEN s.contacto_directo IS NULL OR TRIM(s.contacto_directo) = ''
          THEN CONCAT('Referencia ', COALESCE(s.nombre_sucursal, 'sucursal')) ELSE s.contacto_directo END,
        s.image_url = CASE WHEN s.image_url IS NULL OR TRIM(s.image_url) = ''
          THEN c.logo_url ELSE s.image_url END,
        s.direccion = CASE WHEN s.direccion IS NULL OR TRIM(s.direccion) = ''
          THEN COALESCE(NULLIF(TRIM(c.direccion), ''), CONCAT('Ubicacion ', s.nombre_sucursal))
          ELSE s.direccion END
    `);

    console.log('--- 3. Horario por defecto (7 dias) si la sede no tiene filas ---');
    const [storesNoSchedule] = await connection.query(`
      SELECT s.id FROM stores s
      WHERE NOT EXISTS (SELECT 1 FROM store_operating_hours h WHERE h.store_id = s.id)
    `);
    for (const { id: storeId } of storesNoSchedule) {
      for (let day_index = 0; day_index <= 6; day_index++) {
        await connection.query(
          `INSERT INTO store_operating_hours (store_id, day_index, status, open_time, close_time, is_24h)
           VALUES (?, ?, 'abierto', '08:00:00', '20:00:00', 0)
           ON DUPLICATE KEY UPDATE status = VALUES(status), open_time = VALUES(open_time), close_time = VALUES(close_time), is_24h = VALUES(is_24h)`,
          [storeId, day_index]
        );
      }
    }

    console.log('--- 4. Menus / categorias: descripcion vacia ---');
    await connection.query(`
      UPDATE menus SET descripcion = CASE
        WHEN descripcion IS NULL OR TRIM(descripcion) = ''
        THEN CONCAT('Menu maestro: ', nombre)
        ELSE descripcion END
    `);
    await connection.query(`
      UPDATE categorias SET descripcion = CASE
        WHEN descripcion IS NULL OR TRIM(descripcion) = ''
        THEN CONCAT('Seccion ', nombre)
        ELSE descripcion END
    `);

    console.log('--- 5. Productos maestro: texto, imagen, tiempo, disponible ---');
    await connection.query(`
      UPDATE products SET
        image_url = CASE WHEN image_url IS NULL OR TRIM(image_url) = '' THEN ? ELSE image_url END,
        descripcion_larga = CASE WHEN descripcion_larga IS NULL OR TRIM(descripcion_larga) = ''
          THEN CONCAT('Opcion destacada en nuestro catalogo: ', nombre, '.') ELSE descripcion_larga END,
        tiempo_prep_estimado = CASE WHEN tiempo_prep_estimado IS NULL OR tiempo_prep_estimado < 1 THEN 25 ELSE tiempo_prep_estimado END,
        disponible = 1
    `, [IMG_PLACEHOLDER_PREFIX]);

    console.log('--- 6. Sincronizar menu_id en productos si la columna existe ---');
    if (await columnExists(connection, 'products', 'menu_id')) {
      await connection.query(`
        UPDATE products p
        INNER JOIN categorias c ON c.id = p.categoria_id
        SET p.menu_id = c.menu_id
        WHERE p.menu_id IS NULL OR p.menu_id <> c.menu_id
      `);
    }

    console.log('--- 7. Habilitar TODOS los menus del comercio en CADA sede ---');
    await connection.query(`
      INSERT INTO store_menus (store_id, menu_id, disponible)
      SELECT s.id, m.id, 1
      FROM stores s
      INNER JOIN menus m ON m.commerce_id = s.commerce_id
      ON DUPLICATE KEY UPDATE disponible = 1
    `);

    console.log('--- 8. Habilitar TODAS las categorias de esos menus en cada sede ---');
    await connection.query(`
      INSERT INTO store_categories (store_id, categoria_id, disponible)
      SELECT DISTINCT s.id, c.id, 1
      FROM stores s
      INNER JOIN menus m ON m.commerce_id = s.commerce_id
      INNER JOIN categorias c ON c.menu_id = m.id
      ON DUPLICATE KEY UPDATE disponible = 1
    `);

    console.log('--- 9. Habilitar TODOS los productos del comercio en cada sede ---');
    await connection.query(`
      INSERT INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible)
      SELECT DISTINCT s.id, p.id, NULL, NULL, 1
      FROM stores s
      INNER JOIN products p ON p.commerce_id = s.commerce_id
      INNER JOIN categorias cat ON cat.id = p.categoria_id
      INNER JOIN menus m ON m.id = cat.menu_id AND m.commerce_id = s.commerce_id
      ON DUPLICATE KEY UPDATE disponible = 1
    `);

    await connection.commit();
    connection.release();

    console.log('Listo. Resumen:');
    const [[sm]] = await db.query('SELECT COUNT(*) AS n FROM store_menus');
    const [[sc]] = await db.query('SELECT COUNT(*) AS n FROM store_categories');
    const [[sp]] = await db.query('SELECT COUNT(*) AS n FROM store_products');
    console.log(`  store_menus: ${sm.n}, store_categories: ${sc.n}, store_products: ${sp.n}`);
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
