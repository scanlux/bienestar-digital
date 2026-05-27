const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');
const { isStoreCurrentlyOpen } = require('../utils/timeUtils');

// Aplicar middleware de administraciÃ³n a todas las rutas de este archivo
router.use(auth);
router.use(adminOnly);

// --- CATÁLOGO DE PAGOS ---

router.get('/payment-platforms', async (req, res) => {
  try {
    const [platforms] = await db.query('SELECT * FROM payment_platforms ORDER BY nombre ASC');
    res.json(platforms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- COMERCIOS (COMMERCES) ---

// Obtener todos los comercios (con filtro de status)
router.get('/commerces', async (req, res) => {
  const { status } = req.query;
  try {
    let query = 'SELECT * FROM commerces';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY orden ASC';
    
    const [commerces] = await db.query(query, params);
    res.json(commerces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un comercio por ID
router.get('/commerces/:id', async (req, res) => {
  try {
    const [commerces] = await db.query('SELECT * FROM commerces WHERE id = ?', [req.params.id]);
    if (commerces.length === 0) return res.status(404).json({ error: 'Comercio no encontrado' });
    res.json(commerces[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas globales para el dashboard
router.get('/stats', async (req, res) => {
  try {
    const [[{ commercesCount }]] = await db.query("SELECT COUNT(*) as commercesCount FROM commerces WHERE status = 'active'");
    const [[{ pendingCount }]] = await db.query("SELECT COUNT(*) as pendingCount FROM commerces WHERE status = 'pending'");
    const [[{ storesCount }]] = await db.query("SELECT COUNT(*) as storesCount FROM stores");
    const [[{ productsCount }]] = await db.query("SELECT COUNT(*) as productsCount FROM products");
    // Mocking orders for now, will implement real count when table exists
    const ordersCount = 0; 

    res.json({
      activeCommerces: commercesCount,
      pendingRequests: pendingCount,
      totalStores: storesCount,
      totalProducts: productsCount,
      totalOrders: ordersCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo comercio
router.post('/commerces', async (req, res) => {
  const { nombre, nit, nit_dv, telefono, ciudad, direccion, descripcion, logo_url, type, orden } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO commerces (nombre, nit, nit_dv, telefono, ciudad, direccion, descripcion, logo_url, type, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, nit, nit_dv || null, telefono, ciudad, direccion, descripcion, logo_url, type || 'horizontal', orden || 0]
    );
    res.json({ id: result.insertId, message: 'Comercio creado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un comercio
router.put('/commerces/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, nit, nit_dv, telefono, ciudad, direccion, descripcion, logo_url, type, orden } = req.body;
  try {
    await db.query(
      'UPDATE commerces SET nombre=?, nit=?, nit_dv=?, telefono=?, ciudad=?, direccion=?, descripcion=?, logo_url=?, type=?, orden=? WHERE id=?',
      [nombre, nit, nit_dv || null, telefono, ciudad, direccion, descripcion, logo_url, type, orden, id]
    );
    res.json({ message: 'Comercio actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar solo el estado de un comercio (Aprobación)
router.patch('/commerces/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (!['pending', 'active', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }
    await db.query('UPDATE commerces SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Comercio actualizado a estado: ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SEDES (STORES) ---

// Obtener sedes de un comercio (incluye horario resumido o completo)
router.get('/stores/:commerceId', async (req, res) => {
  try {
    const [stores] = await db.query('SELECT * FROM stores WHERE commerce_id = ?', [req.params.commerceId]);
    
    // Obtener horarios para todas las sedes encontradas
    for (let store of stores) {
      const [schedule] = await db.query('SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', [store.id]);
      store.schedule = schedule;
      // Inyectar estado en tiempo real
      store.is_currently_open = isStoreCurrentlyOpen(store.estado, schedule);
    }
    
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear o actualizar una sede (incluye gestión de horario semanal y cuentas bancarias)
router.post('/stores', async (req, res) => {
  const { id, commerce_id, nombre_sucursal, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, image_url, schedule, accounts, fecha_regreso } = req.body;
  
  // Limpieza: Si es operativo, forzamos fecha_regreso a null
  // Extraer solo YYYY-MM-DD si viene como ISO datetime (ej: '2026-05-07T05:00:00.000Z')
  const cleanFecha = fecha_regreso ? fecha_regreso.split('T')[0] : null;
  const finalFechaRegreso = (estado === 'operativo' || !cleanFecha) ? null : cleanFecha;

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let storeId = id;

    if (id) {
      // Actualizar sede existente
      await connection.query(
        'UPDATE stores SET nombre_sucursal=?, contacto_directo=?, telefono=?, telefono_domicilio=?, direccion=?, latitud=?, longitud=?, estado=?, fecha_regreso=?, image_url=? WHERE id=?',
        [nombre_sucursal, contacto_directo || null, telefono || null, telefono_domicilio || null, direccion, latitud || null, longitud || null, estado || 'abierto', finalFechaRegreso, image_url || null, id]
      );
    } else {
      // Crear nueva sede
      const [result] = await connection.query(
        'INSERT INTO stores (commerce_id, nombre_sucursal, contacto_directo, telefono, telefono_domicilio, direccion, latitud, longitud, estado, fecha_regreso, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [commerce_id, nombre_sucursal, contacto_directo || null, telefono || null, telefono_domicilio || null, direccion, latitud || null, longitud || null, estado || 'abierto', finalFechaRegreso, image_url || null]
      );
      storeId = result.insertId;
    }

    // Procesar horario semanal si se proporciona
    if (schedule && Array.isArray(schedule)) {
      for (const day of schedule) {
        // UPSERT para cada día
        await connection.query(`
          INSERT INTO store_operating_hours 
          (store_id, day_index, status, open_time, close_time, is_24h)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          status=VALUES(status), open_time=VALUES(open_time), close_time=VALUES(close_time), is_24h=VALUES(is_24h)
        `, [storeId, day.day_index, day.status, day.open_time, day.close_time, day.is_24h]);
      }
    }

    // Procesar cuentas bancarias si se proporcionan
    if (accounts && Array.isArray(accounts)) {
      // Limpiamos las cuentas anteriores para este storeId (reemplazo total)
      await connection.query('DELETE FROM store_accounts WHERE store_id = ?', [storeId]);
      
      if (accounts.length > 0) {
        // Insertamos las nuevas cuentas enviadas desde el frontend
        const values = accounts.map(acc => [
          storeId, 
          acc.platform_id, 
          acc.tipo_cuenta || 'Ahorros', 
          acc.numero_cuenta, 
          acc.llave || null,
          acc.titular_nombre || null, 
          acc.titular_documento || null, 
          acc.detalle || null, 
          acc.vencimiento_tarjeta || null,
          acc.es_principal === true || acc.es_principal === 1 || acc.es_principal === 'true' ? 1 : 0
        ]);
        
        await connection.query(`
          INSERT INTO store_accounts 
          (store_id, platform_id, tipo_cuenta, numero_cuenta, llave, titular_nombre, titular_documento, detalle, vencimiento_tarjeta, es_principal) 
          VALUES ?
        `, [values]);
      }
    }

    await connection.commit();
    connection.release();

    res.json({ id: storeId, message: id ? 'Sede actualizada con éxito' : 'Sede creada con éxito' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    res.status(500).json({ error: error.message });
  }
});

// Obtener detalle de una sola sede
router.get('/store/:id', async (req, res) => {
  try {
    const [stores] = await db.query('SELECT s.*, c.nombre as commerce_nombre FROM stores s LEFT JOIN commerces c ON s.commerce_id = c.id WHERE s.id = ?', [req.params.id]);
    if (stores.length === 0) return res.status(404).json({ error: 'Store not found' });
    
    // Obtener las cuentas bancarias asociadas a esta sede con el join al catálogo
    const [accounts] = await db.query(`
      SELECT sa.*, pp.nombre as banco_nombre, pp.tipo_entidad 
      FROM store_accounts sa 
      LEFT JOIN payment_platforms pp ON sa.platform_id = pp.id 
      WHERE sa.store_id = ?
    `, [req.params.id]);
    
    // Obtener el horario semanal
    const [schedule] = await db.query('SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', [req.params.id]);
    
    const storeData = stores[0];
    storeData.accounts = accounts;
    storeData.schedule = schedule;
    
    // Inyectar estado en tiempo real
    storeData.is_currently_open = isStoreCurrentlyOpen(storeData.estado, schedule);
    
    res.json(storeData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MENUS ---

// Obtener menús de un comercio
router.get('/menus/:commerceId', async (req, res) => {
  try {
    const [menus] = await db.query('SELECT * FROM menus WHERE commerce_id = ? ORDER BY orden ASC', [req.params.commerceId]);
    res.json(menus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear o actualizar un menú
router.post('/menus', async (req, res) => {
  const { id, commerce_id, nombre, descripcion, orden } = req.body;
  try {
    if (id) {
      await db.query('UPDATE menus SET nombre=?, descripcion=?, orden=? WHERE id=?',
        [nombre, descripcion, orden, id]);
      res.json({ id, message: 'Menú actualizado' });
    } else {
      const [result] = await db.query(
        'INSERT INTO menus (commerce_id, nombre, descripcion, orden) VALUES (?, ?, ?, ?)',
        [commerce_id, nombre, descripcion, orden || 0]
      );
      res.json({ id: result.insertId, message: 'Menú creado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CATEGORIAS ---

// Obtener categorias de un menu
router.get('/categorias/:menuId', async (req, res) => {
  try {
    const [categorias] = await db.query('SELECT * FROM categorias WHERE menu_id = ? ORDER BY orden_visual ASC', [req.params.menuId]);
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear o actualizar una categoria
router.post('/categorias', async (req, res) => {
  const { id, menu_id, nombre, descripcion, orden_visual } = req.body;
  try {
    if (id) {
        await db.query('UPDATE categorias SET nombre=?, descripcion=?, orden_visual=? WHERE id=?', [nombre, descripcion, orden_visual, id]);
        res.json({ message: 'CategorÃ­a actualizada' });
    } else {
        const [result] = await db.query(
          'INSERT INTO categorias (menu_id, nombre, descripcion, orden_visual) VALUES (?, ?, ?, ?)',
          [menu_id, nombre, descripcion, orden_visual || 0]
        );
        res.json({ id: result.insertId, message: 'CategorÃ­a creada' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { generateProductTags } = require('../utils/tagger');

// --- PRODUCTOS ---

// Obtener productos (opcionalmente filtrados por menÃº)
router.get('/products', async (req, res) => {
  const { commerceId, menuId } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (commerceId) {
    query += ' AND commerce_id = ?';
    params.push(commerceId);
  }
  if (menuId) {
    query += ' AND menu_id = ?';
    params.push(menuId);
  }

  try {
    const [products] = await db.query(query, params);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update product
router.post('/products', async (req, res) => {
  const { id, commerce_id, categoria_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano, ingredientes, manual_tags, tags } = req.body;
  
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Lógica de Auto-Tagging Unificada
    // Extraemos el nombre de la categoría y del comercio para el motor semántico
    let categoryName = '';
    let commerceName = '';

    if (categoria_id) {
      const [cats] = await connection.query('SELECT nombre FROM categorias WHERE id = ?', [categoria_id]);
      if (cats.length > 0) categoryName = cats[0].nombre;
    }

    if (commerce_id) {
      const [coms] = await connection.query('SELECT nombre FROM commerces WHERE id = ?', [commerce_id]);
      if (coms.length > 0) commerceName = coms[0].nombre;
    } else if (id) {
      // Si es un update y no viene commerce_id, lo buscamos en el producto
      const [prods] = await connection.query('SELECT c.nombre FROM products p JOIN commerces c ON p.commerce_id = c.id WHERE p.id = ?', [id]);
      if (prods.length > 0) commerceName = prods[0].nombre;
    }

    // El motor ahora mezcla nombre + descripción (corta y larga) + categoría + etiquetas manuales/semánticas previas
    // Esto limpia ruidos (stop words) y asegura que TODO sea minúscula y único.
    const [stopWordsRows] = await connection.query('SELECT word FROM stop_words');
    const stopWordsList = stopWordsRows.map(r => r.word);

    const inputTags = manual_tags !== undefined ? manual_tags : (tags || '');
    const fullDesc = `${descripcion_larga || ''}`;
    
    // Con catálogo maestro por comercio, no buscamos branchName para los productos a nivel maestro
    let branchName = '';

    const finalTags = generateProductTags(nombre, fullDesc, categoryName, inputTags, stopWordsList, !!es_vegetariano, commerceName, branchName);

    let productId = id;

    if (id) {
      // Update
      await connection.query(
        'UPDATE products SET categoria_id=?, nombre=?, descripcion_larga=?, precio_base=?, tiempo_prep_estimado=?, image_url=?, disponible=?, es_vegetariano=?, tags=? WHERE id=?',
        [categoria_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano, finalTags, id]
      );
    } else {
      // Create
      const [result] = await connection.query(
        'INSERT INTO products (commerce_id, categoria_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [commerce_id, categoria_id, nombre, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible !== undefined ? disponible : true, es_vegetariano || false, finalTags]
      );
      productId = result.insertId;
    }

    // Process ingredients if provided (an array of ingredient IDs)
    if (ingredientes && Array.isArray(ingredientes)) {
       // Clear old relationships
       await connection.query('DELETE FROM product_ingredients WHERE product_id = ?', [productId]);
       // Insert new ones
       if (ingredientes.length > 0) {
           const values = ingredientes.map(ingId => [productId, ingId]);
           await connection.query('INSERT INTO product_ingredients (product_id, ingredient_id) VALUES ?', [values]);
       }
    }

    await connection.commit();
    connection.release();

    res.json({ id: productId, message: id ? 'Producto actualizado' : 'Producto creado' });
  } catch (error) {
    if (connection) {
       await connection.rollback();
       connection.release();
    }
    res.status(500).json({ error: error.message });

  }
});

// --- INGREDIENTES ---
router.get('/ingredients', async (req, res) => {
    try {
        const [ingredients] = await db.query('SELECT * FROM ingredients');
        res.json(ingredients);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/ingredients', async (req, res) => {
    const { id, nombre, es_alergeno } = req.body;
    try {
        if(id){
            await db.query('UPDATE ingredients SET nombre=?, es_alergeno=? WHERE id=?', [nombre, es_alergeno, id]);
            res.json({ message: 'Ingrediente actualizado' });
        } else {
            const [result] = await db.query('INSERT INTO ingredients (nombre, es_alergeno) VALUES (?, ?)', [nombre, es_alergeno || false]);
            res.json({ id: result.insertId, message: 'Ingrediente creado' });
        }
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});


/**
 * @route GET /api/management/analytics/popularity
 * @desc Ver el ranking actual de popularidad
 */
router.get('/analytics/popularity', async (req, res) => {
  try {
    const [ranking] = await db.query(`
      SELECT 
        p.id, p.nombre, p.image_url, pp.sales_count, pp.last_update,
        com.nombre as commerce_name
      FROM product_popularity pp
      JOIN products p ON pp.product_id = p.id
      JOIN commerces com ON p.commerce_id = com.id
      ORDER BY pp.sales_count DESC
      LIMIT 100
    `);
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/management/analytics/trigger
 * @desc Ejecutar manualmente el cálculo de popularidad
 */
router.post('/analytics/trigger', async (req, res) => {
  try {
    const [sales] = await db.query(`
      SELECT product_id, SUM(quantity) as total_sales
      FROM order_items
      GROUP BY product_id
    `);

    for (const sale of sales) {
      await db.query(`
        INSERT INTO product_popularity (product_id, sales_count, last_update)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE sales_count = VALUES(sales_count), last_update = NOW()
      `, [sale.product_id, sale.total_sales]);
    }

    res.json({ message: 'Ranking actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- STOP WORDS (LISTA NEGRA) ---

router.get('/intelligence/stop-words', async (req, res) => {
  try {
    const [words] = await db.query('SELECT * FROM stop_words ORDER BY word ASC');
    res.json(words);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/intelligence/stop-words', async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'Palabra requerida' });
  try {
    // Dividir por espacios, comas o puntos y coma, filtrar vacíos
    const wordsToProcess = word.split(/[ ,;]+/).filter(w => w.trim().length > 0);
    
    if (wordsToProcess.length === 0) return res.status(400).json({ error: 'No se detectaron palabras válidas' });

    // Preparar valores para inserción masiva (bulk insert)
    const values = wordsToProcess.map(w => [w.toLowerCase().trim()]);
    
    await db.query('INSERT IGNORE INTO stop_words (word) VALUES ?', [values]);
    res.json({ message: `${wordsToProcess.length} palabras procesadas correctamente` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/intelligence/stop-words/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM stop_words WHERE id = ?', [req.params.id]);
    res.json({ message: 'Palabra eliminada de la lista negra' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/manage/intelligence/generate-tags
 * @desc Generación masiva de tags semánticos por lotes (soporta progreso)
 */
router.post('/intelligence/generate-tags', async (req, res) => {
  const { limit = 20, offset = 0 } = req.body;
  
  try {
    // 1. Obtener total para cálculo de progreso en el front
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM products');

    // 2. Obtener lista negra de la DB
    const [stopWordsRows] = await db.query('SELECT word FROM stop_words');
    const stopWordsList = stopWordsRows.map(r => r.word);

    // 3. Obtener el lote actual
    const [products] = await db.query(`
      SELECT p.id, p.nombre, p.descripcion_larga, p.tags as existing_tags, p.es_vegetariano, 
             c.nombre as categoria_nombre, com.nombre as commerce_nombre
      FROM products p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN commerces com ON p.commerce_id = com.id
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    let updatedCount = 0;
    for (const product of products) {
      const { id, nombre, descripcion_larga, categoria_nombre, commerce_nombre, existing_tags, es_vegetariano } = product;
      const fullDesc = `${descripcion_larga || ''}`;
      
      const newTags = generateProductTags(nombre, fullDesc, categoria_nombre || '', existing_tags || '', stopWordsList, !!es_vegetariano, commerce_nombre || '', '');
      
      if (newTags !== existing_tags) {
        await db.query('UPDATE products SET tags = ? WHERE id = ?', [newTags, id]);
        updatedCount++;
      }
    }

    res.json({ 
      processed: products.length, 
      updated: updatedCount,
      total,
      nextOffset: parseInt(offset) + products.length,
      isFinished: (parseInt(offset) + products.length) >= total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CATALOGO POR SEDE (TABLAS PIVOTE) ---

// Obtener menus habilitados para una sede
router.get('/store-menus/:storeId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sm.*, m.nombre as menu_nombre, m.orden
      FROM store_menus sm
      JOIN menus m ON sm.menu_id = m.id
      WHERE sm.store_id = ?
      ORDER BY m.orden ASC
    `, [req.params.storeId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle menu en una sede
router.post('/store-menus', async (req, res) => {
  try {
    const { store_id, menu_id, disponible } = req.body;
    await db.query(`
      INSERT INTO store_menus (store_id, menu_id, disponible) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE disponible = ?
    `, [store_id, menu_id, disponible, disponible]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener categorias habilitadas para una sede (de un menu especifico)
router.get('/store-categories/:storeId/:menuId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, 
             COALESCE(sc.disponible, 0) as habilitada,
             sc.id as store_category_id
      FROM categorias c
      LEFT JOIN store_categories sc ON sc.categoria_id = c.id AND sc.store_id = ?
      WHERE c.menu_id = ?
      ORDER BY c.orden_visual ASC
    `, [req.params.storeId, req.params.menuId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle categoria en una sede
router.post('/store-categories', async (req, res) => {
  try {
    const { store_id, categoria_id, disponible } = req.body;
    await db.query(`
      INSERT INTO store_categories (store_id, categoria_id, disponible) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE disponible = ?
    `, [store_id, categoria_id, disponible, disponible]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener productos de una categoria con estado de habilitacion por sede
router.get('/store-products/:storeId/:categoriaId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, 
             COALESCE(sp.disponible, 0) as habilitado,
             sp.precio_local,
             sp.tiempo_prep_local,
             COALESCE(sp.precio_local, p.precio_base) as precio_efectivo,
             COALESCE(sp.tiempo_prep_local, p.tiempo_prep_estimado) as tiempo_efectivo,
             sp.id as store_product_id
      FROM products p
      LEFT JOIN store_products sp ON sp.product_id = p.id AND sp.store_id = ?
      WHERE p.categoria_id = ?
      ORDER BY p.nombre ASC
    `, [req.params.storeId, req.params.categoriaId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle producto en una sede + precio/tiempo local
router.post('/store-products', async (req, res) => {
  try {
    const { store_id, product_id, precio_local, tiempo_prep_local, disponible } = req.body;
    await db.query(`
      INSERT INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE precio_local = ?, tiempo_prep_local = ?, disponible = ?
    `, [store_id, product_id, precio_local, tiempo_prep_local, disponible,
        precio_local, tiempo_prep_local, disponible]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

