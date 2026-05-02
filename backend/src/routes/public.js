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
        SELECT p.id, p.image_url, p.nombre, p.precio_base 
        FROM products p
        JOIN categorias cat ON p.categoria_id = cat.id
        JOIN menus m ON cat.menu_id = m.id
        WHERE m.store_id = ? AND p.image_url IS NOT NULL AND p.disponible = 1
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
          precio: p.precio_base
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
    // Buscamos los menús de esta sede
    const [menus] = await db.query('SELECT * FROM menus WHERE store_id = ? ORDER BY orden ASC', [id]);
    
    const menuStructure = [];

    for (const menu of menus) {
      // Para cada menú, obtener categorías
      const [categorias] = await db.query('SELECT * FROM categorias WHERE menu_id = ? ORDER BY orden_visual ASC', [menu.id]);
      
      const categoriasConProductos = [];
      for (const cat of categorias) {
        // Para cada categoría, obtener productos
        const [products] = await db.query(`
          SELECT id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano 
          FROM products 
          WHERE categoria_id = ? AND disponible = 1
        `, [cat.id]);
        
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
