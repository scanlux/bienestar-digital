const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isStoreCurrentlyOpen } = require('../utils/timeUtils');

/**
 * @route GET /api/public/commerces
 * @desc Obtener lista de SEDES activas (con info de su comercio) para el Home
 */
router.get('/commerces', async (req, res) => {
  console.log('GET /api/public/commerces - Iniciando peticion');
  try {
    // 1. Obtener todas las sedes operativas con la info de su comercio padre
    console.log(' - Ejecutando query principal de sedes...');
    const [stores] = await db.query(`
      SELECT 
        s.id, 
        s.nombre_sucursal, 
        s.direccion, 
        s.telefono, 
        s.estado, 
        s.image_url as sede_image,
        c.nombre as commerce_nombre, 
        c.logo_url as commerce_logo,
        c.descripcion as commerce_descripcion,
        c.type as commerce_type
      FROM stores s
      JOIN commerces c ON s.commerce_id = c.id
      WHERE s.estado = 'operativo'
    `);
    console.log(` - Encontradas ${stores.length} sedes operativas.`);

    // 2. Obtener horarios y una muestra de imágenes de productos para cada sede
    const results = [];
    for (const store of stores) {
      console.log(` - Procesando sede: ${store.commerce_nombre} (ID: ${store.id})`);
      // Obtener horario
      const [schedule] = await db.query(
        'SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', 
        [store.id]
      );

      // Obtener productos destacados de esta sede (id, imagen, nombre, precio)
      const [productItems] = await db.query(`
        SELECT p.id, p.image_url, p.nombre, 
               COALESCE(sp.precio_local, p.precio_base) as precio_base,
               GREATEST(COALESCE(p.updated_at, '2000-01-01'), COALESCE(sp.updated_at, '2000-01-01')) as updated_at, 
               p.tags, cat.nombre as categoria_nombre 
        FROM store_products sp
        JOIN products p ON sp.product_id = p.id
        JOIN categorias cat ON p.categoria_id = cat.id
        JOIN store_categories sc ON sc.categoria_id = cat.id AND sc.store_id = sp.store_id
        JOIN store_menus sm ON sm.menu_id = cat.menu_id AND sm.store_id = sp.store_id
        WHERE sp.store_id = ? 
          AND sp.disponible = 1 
          AND sc.disponible = 1 
          AND sm.disponible = 1
          AND p.image_url IS NOT NULL
      `, [store.id]);
      
      results.push({
        ...store,
        is_currently_open: isStoreCurrentlyOpen(store.estado, schedule),
        schedule,
        product_images: productItems.map(p => p.image_url),
        product_items: productItems.map(p => ({
          id: p.id,
          image_url: p.image_url,
          nombre: p.nombre,
          precio: p.precio_base,
          updated_at: p.updated_at,
          tags: p.tags,
          categoria_nombre: p.categoria_nombre
        }))
      });
    }

    console.log(' - Peticion completada con exito.');
    res.json(results);
  } catch (error) {
    console.error(' !!! ERROR EN /api/public/commerces:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/public/sync
 * @desc Delta Sync: Obtener solo las sedes (o sedes con productos) que han cambiado desde una fecha
 */
router.get('/sync', async (req, res) => {
  try {
    const { since } = req.query;
    if (!since) return res.status(400).json({ error: 'Missing since parameter' });

    // Obtener la hora actual de MariaDB para garantizar sincronía perfecta
    const [dbTimeRes] = await db.query("SELECT UTC_TIMESTAMP(3) as now_utc");
    const serverTime = new Date(dbTimeRes[0].now_utc).toISOString();
    
    // Usamos el string original 'since' que viene en formato ISO
    const sinceDateObj = new Date(since);

    // 1. Encontrar IDs de sedes que cambiaron (o sus comercios padre)
    const [changedStoresQuery] = await db.query(`
      SELECT s.id 
      FROM stores s
      JOIN commerces c ON s.commerce_id = c.id
      WHERE s.updated_at > ? OR c.updated_at > ?
    `, [sinceDateObj, sinceDateObj]);

    // 2. Encontrar IDs de sedes que tienen productos o estados de catálogo que cambiaron
    const [changedProductsQuery] = await db.query(`
      SELECT DISTINCT sp.store_id as id
      FROM store_products sp
      JOIN products p ON sp.product_id = p.id
      WHERE p.updated_at > ? OR sp.updated_at > ?
      
      UNION
      
      SELECT DISTINCT sm.store_id as id
      FROM store_menus sm
      WHERE sm.updated_at > ?
      
      UNION
      
      SELECT DISTINCT sc.store_id as id
      FROM store_categories sc
      WHERE sc.updated_at > ?
    `, [sinceDateObj, sinceDateObj, sinceDateObj, sinceDateObj]);

    // Combinar IDs únicos
    const storeIdsToUpdate = new Set();
    changedStoresQuery.forEach(row => storeIdsToUpdate.add(row.id));
    changedProductsQuery.forEach(row => storeIdsToUpdate.add(row.id));

    if (storeIdsToUpdate.size === 0) {
      return res.json({ serverTime, changedStores: [] });
    }

    const idsArray = Array.from(storeIdsToUpdate);

    // 3. Obtener la data completa de esas sedes (igual que en /commerces)
    const [stores] = await db.query(`
      SELECT 
        s.id, s.nombre_sucursal, s.direccion, s.telefono, s.estado, s.image_url as sede_image,
        c.nombre as commerce_nombre, c.logo_url as commerce_logo, c.descripcion as commerce_descripcion, c.type as commerce_type
      FROM stores s
      JOIN commerces c ON s.commerce_id = c.id
      WHERE s.id IN (?)
    `, [idsArray]);

    const results = [];
    for (const store of stores) {
      const [schedule] = await db.query(
        'SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', 
        [store.id]
      );

      const [productItems] = await db.query(`
        SELECT p.id, p.image_url, p.nombre, 
               COALESCE(sp.precio_local, p.precio_base) as precio_base,
               GREATEST(COALESCE(p.updated_at, '2000-01-01'), COALESCE(sp.updated_at, '2000-01-01')) as updated_at, 
               p.tags, cat.nombre as categoria_nombre
        FROM store_products sp
        JOIN products p ON sp.product_id = p.id
        JOIN categorias cat ON p.categoria_id = cat.id
        JOIN store_categories sc ON sc.categoria_id = cat.id AND sc.store_id = sp.store_id
        JOIN store_menus sm ON sm.menu_id = cat.menu_id AND sm.store_id = sp.store_id
        WHERE sp.store_id = ? 
          AND sp.disponible = 1 
          AND sc.disponible = 1 
          AND sm.disponible = 1
          AND p.image_url IS NOT NULL
      `, [store.id]);
      
      results.push({
        ...store,
        is_currently_open: isStoreCurrentlyOpen(store.estado, schedule),
        schedule,
        product_images: productItems.map(p => p.image_url),
        product_items: productItems.map(p => ({
          id: p.id,
          image_url: p.image_url,
          nombre: p.nombre,
          precio: p.precio_base,
          updated_at: p.updated_at, // Clave para Cache Busting
          tags: p.tags,
          categoria_nombre: p.categoria_nombre
        }))
      });
    }

    res.json({ serverTime, changedStores: results });
  } catch (error) {
    console.error(' !!! ERROR EN /api/public/sync:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/public/store/:id
 * @desc Obtener detalle profundo de una sede (Menu, Categorias, Productos)
 */
router.get('/store/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener info de la sede y el comercio
    const [stores] = await db.query(`
      SELECT s.*, c.nombre as commerce_nombre, c.logo_url as commerce_logo 
      FROM stores s 
      JOIN commerces c ON s.commerce_id = c.id 
      WHERE s.id = ?
    `, [id]);

    if (stores.length === 0) return res.status(404).json({ error: 'Sede no encontrada' });
    const storeData = stores[0];

    // 2. Obtener horario y estado real
    const [schedule] = await db.query('SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', [id]);
    storeData.schedule = schedule;
    storeData.is_currently_open = isStoreCurrentlyOpen(storeData.estado, schedule);

    // 3. Obtener Menús -> Categorías -> Productos
    // Buscamos los menús habilitados de esta sede
    const [menus] = await db.query(`
      SELECT m.* FROM menus m
      JOIN store_menus sm ON sm.menu_id = m.id
      WHERE sm.store_id = ? AND sm.disponible = 1
      ORDER BY m.orden ASC
    `, [id]);
    
    const menuStructure = [];
 
    for (const menu of menus) {
      // Para cada menú, obtener categorías habilitadas de esta sede
      const [categorias] = await db.query(`
        SELECT c.* FROM categorias c
        JOIN store_categories sc ON sc.categoria_id = c.id
        WHERE c.menu_id = ? AND sc.store_id = ? AND sc.disponible = 1
        ORDER BY c.orden_visual ASC
      `, [menu.id, id]);
      
      const categoriasConProductos = [];
      for (const cat of categorias) {
        // Para cada categoría, obtener productos habilitados en esta sede
        const [products] = await db.query(`
          SELECT p.id, p.nombre, p.descripcion_larga,
                 COALESCE(sp.precio_local, p.precio_base) as precio_base,
                 COALESCE(sp.tiempo_prep_local, p.tiempo_prep_estimado) as tiempo_prep_estimado,
                 p.image_url, sp.disponible, p.es_vegetariano, p.tags
          FROM products p
          JOIN store_products sp ON sp.product_id = p.id
          WHERE p.categoria_id = ? AND sp.store_id = ? AND sp.disponible = 1
        `, [cat.id, id]);
        
        categoriasConProductos.push({
          ...cat,
          products
        });
      }
 
      menuStructure.push({
        ...menu,
        categories: categoriasConProductos
      });
    }

    storeData.menus = menuStructure;

    res.json(storeData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
