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
  const { id, commerce_id, categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano, ingredientes } = req.body;
  
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let productId = id;

    if (id) {
      // Update
      await connection.query(
        'UPDATE products SET categoria_id=?, nombre=?, descripcion_corta=?, descripcion_larga=?, precio_base=?, tiempo_prep_estimado=?, image_url=?, disponible=?, es_vegetariano=? WHERE id=?',
        [categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano, id]
      );
    } else {
      // Create
      const [result] = await connection.query(
        'INSERT INTO products (commerce_id, categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible, es_vegetariano) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [commerce_id, categoria_id, nombre, descripcion_corta, descripcion_larga, precio_base, tiempo_prep_estimado, image_url, disponible !== undefined ? disponible : true, es_vegetariano || false]
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
