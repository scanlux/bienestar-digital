const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// Aplicar middleware de administraciÃ³n a todas las rutas de este archivo
router.use(auth);
router.use(adminOnly);

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
  const { nombre, nit, telefono, ciudad, direccion, descripcion, logo_url, type, open_time, close_time, orden, status } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO commerces (nombre, nit, telefono, ciudad, direccion, descripcion, logo_url, type, open_time, close_time, orden, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, nit, telefono, ciudad, direccion, descripcion, logo_url, type || 'horizontal', open_time, close_time, orden || 0, status || 'pending']
    );
    res.json({ id: result.insertId, message: 'Comercio creado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un comercio
router.put('/commerces/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, nit, telefono, ciudad, direccion, descripcion, logo_url, type, open_time, close_time, orden, status } = req.body;
  try {
    await db.query(
      'UPDATE commerces SET nombre=?, nit=?, telefono=?, ciudad=?, direccion=?, descripcion=?, logo_url=?, type=?, open_time=?, close_time=?, orden=?, status=? WHERE id=?',
      [nombre, nit, telefono, ciudad, direccion, descripcion, logo_url, type, open_time, close_time, orden, status, id]
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

// Obtener sedes de un comercio
router.get('/stores/:commerceId', async (req, res) => {
  try {
    const [stores] = await db.query('SELECT * FROM stores WHERE commerce_id = ?', [req.params.commerceId]);
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear o actualizar una sede
router.post('/stores', async (req, res) => {
  const { id, commerce_id, nombre_sucursal, telefono, direccion, latitud, longitud, horario_atencion, estado, image_url, url_maps } = req.body;
  try {
    if (id) {
      // Actualizar sede existente
      await db.query(
        'UPDATE stores SET nombre_sucursal=?, telefono=?, direccion=?, latitud=?, longitud=?, horario_atencion=?, estado=?, image_url=?, url_maps=? WHERE id=?',
        [nombre_sucursal, telefono || null, direccion, latitud || null, longitud || null, horario_atencion, estado || 'abierto', image_url || null, url_maps || null, id]
      );
      res.json({ message: 'Sede actualizada con éxito' });
    } else {
      // Crear nueva sede
      const [result] = await db.query(
        'INSERT INTO stores (commerce_id, nombre_sucursal, telefono, direccion, latitud, longitud, horario_atencion, estado, image_url, url_maps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [commerce_id, nombre_sucursal, telefono || null, direccion, latitud || null, longitud || null, horario_atencion, estado || 'abierto', image_url || null, url_maps || null]
      );
      res.json({ id: result.insertId, message: 'Sede creada con éxito' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener detalle de una sola sede
router.get('/store/:id', async (req, res) => {
  try {
    const [stores] = await db.query('SELECT s.*, c.nombre as commerce_nombre FROM stores s LEFT JOIN commerces c ON s.commerce_id = c.id WHERE s.id = ?', [req.params.id]);
    if (stores.length === 0) return res.status(404).json({ error: 'Store not found' });
    
    // Obtener las cuentas bancarias asociadas a esta sede
    const [accounts] = await db.query('SELECT * FROM store_accounts WHERE store_id = ?', [req.params.id]);
    
    const storeData = stores[0];
    storeData.accounts = accounts;
    
    res.json(storeData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- MENUS ---

// Obtener menús de una sede
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
  const { id, commerce_id, categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, ingredientes } = req.body;
  
  let connection;
  try {
    connection = await db.getConnection();
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
        'INSERT INTO products (commerce_id, categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [commerce_id, categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible !== undefined ? disponible : true]
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
