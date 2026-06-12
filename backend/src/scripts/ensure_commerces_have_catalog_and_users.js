require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('=== INICIANDO VALIDACIÓN Y COMPLETITUD DE COMERCIOS ===');
  
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Desactivar restricciones de seguridad para cambios administrativos
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('SET @domi_bypass_security = 1;');

    // 1. Obtener todos los comercios
    const [commerces] = await connection.query('SELECT * FROM commerces');
    console.log(`Se encontraron ${commerces.length} comercios.`);

    const passHash = await bcrypt.hash('admin123', 10);

    for (const comm of commerces) {
      console.log(`\nProcesando Comercio #${comm.id}: ${comm.nombre}`);

      let commerceOwnerId = comm.usuario_id;

      // A. Asegurar que el comercio tenga un usuario administrador principal
      if (!commerceOwnerId) {
        const email = `owner_commerce_${comm.id}@trendy.sytes.net`;
        console.log(`  - Creando propietario para el comercio (${email})...`);
        const [uRes] = await connection.query(
          "INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, 'admin', 'activo')",
          [email, passHash]
        );
        commerceOwnerId = uRes.insertId;
        
        await connection.query(
          "INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)",
          [commerceOwnerId, 'Admin', `Comercio ${comm.id}`, `9000000${comm.id}`, `300${comm.id}00000`]
        );

        // Actualizar comercio con su usuario
        await connection.query('UPDATE commerces SET usuario_id = ? WHERE id = ?', [commerceOwnerId, comm.id]);
        
        // Asignar rol commerce_manager
        const [[role]] = await connection.query("SELECT id FROM roles WHERE code = 'commerce_manager'");
        if (role) {
          await connection.query(
            "INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES ('user', ?, ?)",
            [commerceOwnerId, role.id]
          );
        }
      }

      // B. Asegurar que tenga al menos una sede (store)
      let [stores] = await connection.query('SELECT * FROM stores WHERE commerce_id = ?', [comm.id]);
      let store;

      if (stores.length === 0) {
        console.log(`  - No tiene sedes. Creando sede principal...`);
        const email = `manager_store_${comm.id}_1@trendy.sytes.net`;
        const [uRes] = await connection.query(
          "INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, 'admin', 'activo')",
          [email, passHash]
        );
        const storeAdminId = uRes.insertId;

        await connection.query(
          "INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)",
          [storeAdminId, 'Gerente', `Sede ${comm.id}`, `8000000${comm.id}`, `310${comm.id}00000`]
        );

        // Asignar rol store_admin
        const [[role]] = await connection.query("SELECT id FROM roles WHERE code = 'store_admin'");
        if (role) {
          await connection.query(
            "INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES ('user', ?, ?)",
            [storeAdminId, role.id]
          );
        }

        const [sRes] = await connection.query(
          `INSERT INTO stores 
           (commerce_id, usuario_id, nombre_sucursal, matricula, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, acceptance_mode, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4.6097, -74.0817, 'operativo', 'automatico', ?)`,
          [
            comm.id,
            storeAdminId,
            `Sede Principal ${comm.nombre}`,
            `MAT-COMM-${comm.id}`,
            `Gerente Sede ${comm.id}`,
            `310${comm.id}00000`,
            `310${comm.id}00000`,
            `Calle 100 # 15-${comm.id}`,
            'https://picsum.photos/600/400/food'
          ]
        );

        const storeId = sRes.insertId;
        
        await connection.query("INSERT IGNORE INTO user_stores (user_id, store_id) VALUES (?, ?)", [storeAdminId, storeId]);

        // Sembrar horarios por defecto
        for (let day = 0; day <= 6; day++) {
          await connection.query(
            `INSERT IGNORE INTO store_operating_hours (store_id, day_index, status, open_time, close_time, is_24h)
             VALUES (?, ?, 'abierto', '08:00:00', '20:00:00', 0)`,
            [storeId, day]
          );
        }

        const [newStoreRows] = await connection.query('SELECT * FROM stores WHERE id = ?', [storeId]);
        store = newStoreRows[0];
        console.log(`  + Sede principal creada (ID: ${storeId})`);
      } else {
        store = stores[0];
        console.log(`  = Sede existente encontrada (ID: ${store.id})`);

        // Asegurar que la sede tenga usuario administrador asignado y lleno
        if (!store.usuario_id) {
          const email = `manager_store_${comm.id}_${store.id}@trendy.sytes.net`;
          console.log(`  - Asignando gerente faltante a la sede ${store.id}...`);
          const [uRes] = await connection.query(
            "INSERT INTO users (email, password_hash, rol, estado) VALUES (?, ?, 'admin', 'activo')",
            [email, passHash]
          );
          const storeAdminId = uRes.insertId;

          await connection.query(
            "INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono) VALUES (?, ?, ?, ?, ?)",
            [storeAdminId, 'Gerente', `Sede ${store.id}`, `8000000${store.id}`, `310${store.id}00000`]
          );

          await connection.query('UPDATE stores SET usuario_id = ? WHERE id = ?', [storeAdminId, store.id]);
          await connection.query("INSERT IGNORE INTO user_stores (user_id, store_id) VALUES (?, ?)", [storeAdminId, store.id]);

          // Asignar rol store_admin
          const [[role]] = await connection.query("SELECT id FROM roles WHERE code = 'store_admin'");
          if (role) {
            await connection.query(
              "INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES ('user', ?, ?)",
              [storeAdminId, role.id]
            );
          }
        }
      }

      // C. Asegurar que tenga al menos un menú
      let [menus] = await connection.query('SELECT * FROM menus WHERE commerce_id = ?', [comm.id]);
      let menuId;

      if (menus.length === 0) {
        console.log(`  - No tiene menús. Creando menú principal...`);
        const [mRes] = await connection.query(
          'INSERT INTO menus (commerce_id, nombre, descripcion, orden, disponible) VALUES (?, ?, ?, 0, 1)',
          [comm.id, 'Menú Principal', 'Nuestra selección de productos', 0]
        );
        menuId = mRes.insertId;
        console.log(`  + Menú creado (ID: ${menuId})`);
      } else {
        menuId = menus[0].id;
        console.log(`  = Menú existente encontrado (ID: ${menuId})`);
      }

      // Asegurar relación en store_menus
      await connection.query(
        'INSERT IGNORE INTO store_menus (store_id, menu_id, disponible) VALUES (?, ?, 1)',
        [store.id, menuId]
      );

      // D. Asegurar que tenga al menos una categoría en el menú
      let [cats] = await connection.query('SELECT * FROM categorias WHERE menu_id = ?', [menuId]);
      let catId;

      if (cats.length === 0) {
        console.log(`  - No tiene categorías. Creando categoría principal...`);
        const [cRes] = await connection.query(
          'INSERT INTO categorias (menu_id, nombre, descripcion, orden_visual, disponible) VALUES (?, ?, ?, 0, 1)',
          [menuId, 'Especialidades', 'Nuestras mejores especialidades', 0]
        );
        catId = cRes.insertId;
        console.log(`  + Categoría creada (ID: ${catId})`);
      } else {
        catId = cats[0].id;
        console.log(`  = Categoría existente encontrada (ID: ${catId})`);
      }

      // Asegurar relación en store_categories
      await connection.query(
        'INSERT IGNORE INTO store_categories (store_id, categoria_id, disponible) VALUES (?, ?, 1)',
        [store.id, catId]
      );

      // E. Asegurar que tenga al menos un producto en la categoría
      let [prods] = await connection.query('SELECT * FROM products WHERE categoria_id = ?', [catId]);
      let productId;

      if (prods.length === 0) {
        console.log(`  - No tiene productos. Creando producto de muestra...`);
        const [pRes] = await connection.query(
          `INSERT INTO products 
           (store_id, categoria_id, menu_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, disponible, image_url)
           VALUES (?, ?, ?, ?, ?, 15000.00, 20, 1, ?)`,
          [
            store.id,
            catId,
            menuId,
            `Plato Especial - ${comm.nombre}`,
            'Preparado fresco en el local con ingredientes seleccionados.',
            'https://picsum.photos/600/400/food'
          ]
        );
        productId = pRes.insertId;
        console.log(`  + Producto creado (ID: ${productId})`);
      } else {
        productId = prods[0].id;
        console.log(`  = Producto existente encontrado (ID: ${productId})`);
      }

      // Asegurar relación en store_products
      await connection.query(
        'INSERT IGNORE INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible) VALUES (?, ?, NULL, NULL, 1)',
        [store.id, productId]
      );
    }

    await connection.commit();
    console.log('\n=== INTEGRIDAD Y COMPLETITUD DE COMERCIOS ASEGURADA CON ÉXITO ===');
    
    // Restaurar restricciones de seguridad
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    await connection.query('SET @domi_bypass_security = NULL;');
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('✖ Error garantizando la completitud de los comercios:', error);
    if (connection) {
      await connection.rollback();
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
      await connection.query('SET @domi_bypass_security = NULL;');
      connection.release();
    }
    process.exit(1);
  }
}

main();
