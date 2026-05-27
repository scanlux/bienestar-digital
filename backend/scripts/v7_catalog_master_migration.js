require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('=== Iniciando Migración v7: Catálogo Maestro por Comercio ===');

    // 1. Agregar commerce_id a menus (sin borrar store_id aun)
    console.log('Paso 1: Agregando columna commerce_id a tabla menus...');
    try {
      await db.query('ALTER TABLE menus ADD COLUMN commerce_id INT NULL AFTER id');
      console.log('Columna commerce_id agregada.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('La columna commerce_id ya existe en la tabla menus.');
      } else {
        throw e;
      }
    }

    // 2. Poblar commerce_id desde stores -> commerces
    console.log('Paso 2: Poblando commerce_id desde stores...');
    try {
      // Solo actualizamos si menus aun tiene la columna store_id (lo comprobamos viendo si existe)
      const [columns] = await db.query('SHOW COLUMNS FROM menus');
      const hasStoreId = columns.some(c => c.Field === 'store_id');
      if (hasStoreId) {
        await db.query(`
          UPDATE menus m
          JOIN stores s ON m.store_id = s.id
          SET m.commerce_id = s.commerce_id
          WHERE m.commerce_id IS NULL OR m.commerce_id = 0
        `);
        console.log('Valores de commerce_id poblados exitosamente.');
      } else {
        console.log('La tabla menus ya no posee la columna store_id, omitiendo población.');
      }
    } catch (e) {
      console.warn('Advertencia en Paso 2 (población de commerce_id):', e.message);
    }

    // 3. Hacer commerce_id NOT NULL
    console.log('Paso 3: Modificando commerce_id a NOT NULL...');
    try {
      await db.query('ALTER TABLE menus MODIFY commerce_id INT NOT NULL');
      console.log('Columna commerce_id modificada a NOT NULL.');
    } catch (e) {
      throw e;
    }

    // 4. Agregar constraint FK fk_menus_commerce
    console.log('Paso 4: Agregando FK fk_menus_commerce...');
    try {
      await db.query(`
        ALTER TABLE menus ADD CONSTRAINT fk_menus_commerce 
        FOREIGN KEY (commerce_id) REFERENCES commerces(id) ON DELETE CASCADE
      `);
      console.log('FK fk_menus_commerce creada.');
    } catch (e) {
      if (e.code === 'ER_DUP_CONSTRAINT_NAME' || e.code === 'ER_FK_DUP_NAME') {
        console.log('La FK fk_menus_commerce ya existe.');
      } else {
        throw e;
      }
    }

    // 5. Crear tabla store_menus
    console.log('Paso 5: Creando tabla store_menus...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS store_menus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        menu_id INT NOT NULL,
        disponible BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_store_menu (store_id, menu_id),
        CONSTRAINT fk_sm_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        CONSTRAINT fk_sm_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Tabla store_menus lista.');

    // 6. Crear tabla store_categories
    console.log('Paso 6: Creando tabla store_categories...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS store_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        categoria_id INT NOT NULL,
        disponible BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_store_cat (store_id, categoria_id),
        CONSTRAINT fk_sc_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        CONSTRAINT fk_sc_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Tabla store_categories lista.');

    // 7. Crear tabla store_products
    console.log('Paso 7: Creando tabla store_products...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS store_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        product_id INT NOT NULL,
        precio_local DECIMAL(12,2) NULL COMMENT 'NULL = usar precio_base del producto maestro',
        tiempo_prep_local INT NULL COMMENT 'NULL = usar tiempo_prep_estimado del producto maestro',
        disponible BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_store_product (store_id, product_id),
        CONSTRAINT fk_sp_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        CONSTRAINT fk_sp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Tabla store_products lista.');

    // 8. Poblar store_menus con relaciones existentes
    console.log('Paso 8: Poblando store_menus con relaciones existentes...');
    try {
      const [columns] = await db.query('SHOW COLUMNS FROM menus');
      const hasStoreId = columns.some(c => c.Field === 'store_id');
      if (hasStoreId) {
        await db.query(`
          INSERT INTO store_menus (store_id, menu_id, disponible)
          SELECT store_id, id, 1 FROM menus
          WHERE store_id IS NOT NULL
          ON DUPLICATE KEY UPDATE disponible = 1
        `);
        console.log('Datos en store_menus insertados/actualizados.');
      } else {
        console.log('menus ya no tiene store_id, omitiendo población de store_menus.');
      }
    } catch (e) {
      console.warn('Advertencia en Paso 8:', e.message);
    }

    // 9. Poblar store_categories con relaciones existentes
    console.log('Paso 9: Poblando store_categories con relaciones existentes...');
    try {
      const [columns] = await db.query('SHOW COLUMNS FROM menus');
      const hasStoreId = columns.some(c => c.Field === 'store_id');
      if (hasStoreId) {
        await db.query(`
          INSERT INTO store_categories (store_id, categoria_id, disponible)
          SELECT DISTINCT m.store_id, c.id, 1
          FROM categorias c
          JOIN menus m ON c.menu_id = m.id
          WHERE m.store_id IS NOT NULL
          ON DUPLICATE KEY UPDATE disponible = 1
        `);
        console.log('Datos en store_categories insertados/actualizados.');
      } else {
        console.log('menus ya no tiene store_id, omitiendo población de store_categories.');
      }
    } catch (e) {
      console.warn('Advertencia en Paso 9:', e.message);
    }

    // 10. Poblar store_products con relaciones existentes
    console.log('Paso 10: Poblando store_products con relaciones existentes...');
    try {
      const [columns] = await db.query('SHOW COLUMNS FROM menus');
      const hasStoreId = columns.some(c => c.Field === 'store_id');
      if (hasStoreId) {
        await db.query(`
          INSERT INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible)
          SELECT DISTINCT m.store_id, p.id, NULL, NULL, p.disponible
          FROM products p
          JOIN categorias c ON p.categoria_id = c.id
          JOIN menus m ON c.menu_id = m.id
          WHERE m.store_id IS NOT NULL
          ON DUPLICATE KEY UPDATE disponible = p.disponible
        `);
        console.log('Datos en store_products insertados/actualizados.');
      } else {
        console.log('menus ya no tiene store_id, omitiendo población de store_products.');
      }
    } catch (e) {
      console.warn('Advertencia en Paso 10:', e.message);
    }

    // 11. Eliminar store_id de menus (y su constraint FK)
    console.log('Paso 11: Eliminando llave foránea y columna store_id de menus...');
    try {
      // Intentamos eliminar la llave foránea menus_ibfk_1
      try {
        await db.query('ALTER TABLE menus DROP FOREIGN KEY menus_ibfk_1');
        console.log('Llave foránea menus_ibfk_1 eliminada.');
      } catch (e) {
        console.log('No se pudo eliminar la FK menus_ibfk_1 (tal vez ya no existe):', e.message);
      }

      // Intentamos eliminar la columna store_id
      try {
        await db.query('ALTER TABLE menus DROP COLUMN store_id');
        console.log('Columna store_id eliminada.');
      } catch (e) {
        if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('La columna store_id ya había sido eliminada.');
        } else {
          throw e;
        }
      }
    } catch (e) {
      console.error('Error al limpiar la columna store_id:', e.message);
    }

    // 12. Índices de rendimiento
    console.log('Paso 12: Creando índices de rendimiento...');
    const indexes = [
      { table: 'store_products', name: 'idx_sp_store', columns: 'store_id' },
      { table: 'store_products', name: 'idx_sp_product', columns: 'product_id' },
      { table: 'store_menus', name: 'idx_sm_store', columns: 'store_id' },
      { table: 'store_categories', name: 'idx_sc_store', columns: 'store_id' },
      { table: 'menus', name: 'idx_menus_commerce', columns: 'commerce_id' }
    ];

    for (const idx of indexes) {
      try {
        await db.query(`CREATE INDEX ${idx.name} ON ${idx.table}(${idx.columns})`);
        console.log(`Índice ${idx.name} creado.`);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`El índice ${idx.name} ya existe.`);
        } else {
          console.log(`Advertencia al crear índice ${idx.name}:`, e.message);
        }
      }
    }

    console.log('=== Migración v7 completada exitosamente ===');
    process.exit(0);
  } catch (error) {
    console.error('=== ERROR en la migración v7 ===', error);
    process.exit(1);
  }
}

migrate();
