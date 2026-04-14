const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// Aplicar middleware de administraciÃ³n a todas las rutas de este archivo
router.use(auth);
router.use(adminOnly);

// --- MARCAS (BRANDS) ---

// Obtener todas las marcas (con filtro de status)
router.get('/brands', async (req, res) => {
  const { status } = req.query;
  try {
    let query = 'SELECT * FROM brands';
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY orden ASC';
    
    const [brands] = await db.query(query, params);
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas globales para el dashboard
router.get('/stats', async (req, res) => {
  try {
    const [[{ brandsCount }]] = await db.query("SELECT COUNT(*) as brandsCount FROM brands WHERE status = 'active'");
    const [[{ pendingCount }]] = await db.query("SELECT COUNT(*) as pendingCount FROM brands WHERE status = 'pending'");
    const [[{ storesCount }]] = await db.query("SELECT COUNT(*) as storesCount FROM stores");
    const [[{ productsCount }]] = await db.query("SELECT COUNT(*) as productsCount FROM products");
    // Mocking orders for now, will implement real count when table exists
    const ordersCount = 0; 

    res.json({
      activeBrands: brandsCount,
      pendingRequests: pendingCount,
      totalStores: storesCount,
      totalProducts: productsCount,
      totalOrders: ordersCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear una nueva marca
router.post('/brands', async (req, res) => {
  const { nombre, descripcion, logo_url, type, open_time, close_time, orden, status } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO brands (nombre, descripcion, logo_url, type, open_time, close_time, orden, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, logo_url, type || 'horizontal', open_time, close_time, orden || 0, status || 'pending']
    );
    res.json({ id: result.insertId, message: 'Marca creada con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar una marca
router.put('/brands/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, logo_url, type, open_time, close_time, orden, status } = req.body;
  try {
    await db.query(
      'UPDATE brands SET nombre=?, descripcion=?, logo_url=?, type=?, open_time=?, close_time=?, orden=?, status=? WHERE id=?',
      [nombre, descripcion, logo_url, type, open_time, close_time, orden, status, id]
    );
    res.json({ message: 'Marca actualizada con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar solo el estado de una marca (Aprobación)
router.patch('/brands/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (!['pending', 'active', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }
    await db.query('UPDATE brands SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Marca actualizada a estado: ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SEDES (STORES) ---

// Obtener sedes de una marca
router.get('/stores/:brandId', async (req, res) => {
  try {
    const [stores] = await db.query('SELECT * FROM stores WHERE brand_id = ?', [req.params.brandId]);
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear una sede
router.post('/stores', async (req, res) => {
  const { brand_id, nombre_sucursal, direccion, latitud, longitud, horario_atencion, estado } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO stores (brand_id, nombre_sucursal, direccion, latitud, longitud, horario_atencion, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [brand_id, nombre_sucursal, direccion, latitud, longitud, horario_atencion, estado || 'abierto']
    );
    res.json({ id: result.insertId, message: 'Sede creada con Ã©xito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MENUS ---

// Obtener menÃºs de una sede
router.get('/menus/:storeId', async (req, res) => {
  try {
    const [menus] = await db.query('SELECT * FROM menus WHERE store_id = ? ORDER BY orden ASC', [req.params.storeId]);
    res.json(menus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear un menÃº
router.post('/menus', async (req, res) => {
  const { store_id, nombre, descripcion, orden } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO menus (store_id, nombre, descripcion, orden) VALUES (?, ?, ?, ?)',
      [store_id, nombre, descripcion, orden || 0]
    );
    res.json({ id: result.insertId, message: 'MenÃº creado con Ã©xito' });
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

// --- PRODUCTOS ---

// Obtener productos (opcionalmente filtrados por menÃº)
router.get('/products', async (req, res) => {
  const { brandId, menuId } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (brandId) {
    query += ' AND brand_id = ?';
    params.push(brandId);
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
  const { id, brand_id, categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, ingredientes } = req.body;
  
  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    let productId = id;

    if (id) {
      // Update
      await connection.query(
        'UPDATE products SET categoria_id=?, nombre=?, descripcion_corta=?, descripcion_larga=?, precio_base=?, tiempo_prep_estimado=?, image_url=?, disponible=? WHERE id=?',
        [categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, id]
      );
    } else {
      // Create
      const [result] = await connection.query(
        'INSERT INTO products (brand_id, categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [brand_id, categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible !== undefined ? disponible : true]
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

module.exports = router;
