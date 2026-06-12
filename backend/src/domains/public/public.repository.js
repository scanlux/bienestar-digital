const db = require('../../config/db');

class PublicRepository {
  async findActiveCommerces() {
    const [rows] = await db.query("SELECT id, nombre, descripcion, logo_url, type, open_time, close_time, orden FROM commerces WHERE status = 'active' ORDER BY orden ASC");
    return rows;
  }

  async findActiveProducts() {
    const [rows] = await db.query(`
      SELECT p.id, s.commerce_id, p.nombre, p.descripcion_larga AS descripcion_corta, p.precio_base, p.image_url
      FROM products p
      JOIN stores s ON p.store_id = s.id
      WHERE p.disponible = 1
    `);
    return rows;
  }

  async findOperativeStores() {
    const [rows] = await db.query(`
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
    return rows;
  }

  async findStoreSchedule(storeId) {
    const [rows] = await db.query(
      'SELECT * FROM store_operating_hours WHERE store_id = ? ORDER BY day_index ASC', 
      [storeId]
    );
    return rows;
  }

  async findStoreFeaturedProducts(storeId) {
    const [rows] = await db.query(`
      SELECT p.id, p.image_url, p.nombre, 
             COALESCE(sp.precio_local, p.precio_base) as precio_base, 
             p.updated_at, p.tags, cat.nombre as categoria_nombre 
      FROM products p
      JOIN store_products sp ON p.id = sp.product_id
      JOIN categorias cat ON p.categoria_id = cat.id
      JOIN menus m ON cat.menu_id = m.id
      JOIN store_menus sm ON m.id = sm.menu_id
      JOIN store_categories sc ON cat.id = sc.categoria_id
      WHERE sp.store_id = ? 
        AND sp.disponible = 1 
        AND p.disponible = 1 
        AND sc.store_id = ?
        AND sc.disponible = 1
        AND cat.disponible = 1 
        AND sm.store_id = ?
        AND sm.disponible = 1
        AND m.disponible = 1
        AND p.image_url IS NOT NULL
    `, [storeId, storeId, storeId]);
    return rows;
  }

  async findServerTime() {
    const [rows] = await db.query("SELECT UTC_TIMESTAMP(3) as now_utc");
    return rows[0] ? rows[0].now_utc : new Date().toISOString();
  }

  async findChangedStores(sinceDate) {
    const [rows] = await db.query(`
      SELECT s.id 
      FROM stores s
      JOIN commerces c ON s.commerce_id = c.id
      WHERE s.updated_at > ? OR c.updated_at > ?
    `, [sinceDate, sinceDate]);
    return rows;
  }

  async findChangedProducts(sinceDate) {
    const [rows] = await db.query(`
      SELECT DISTINCT sp.store_id as id
      FROM products p
      JOIN store_products sp ON p.id = sp.product_id
      WHERE p.updated_at > ? OR sp.updated_at > ?
      
      UNION
      
      SELECT DISTINCT sm.store_id as id
      FROM menus m
      JOIN store_menus sm ON m.id = sm.menu_id
      WHERE m.updated_at > ? OR sm.updated_at > ?
      
      UNION
      
      SELECT DISTINCT sc.store_id as id
      FROM categorias c
      JOIN store_categories sc ON c.id = sc.categoria_id
      WHERE c.updated_at > ? OR sc.updated_at > ?
    `, [
      sinceDate, sinceDate,
      sinceDate, sinceDate,
      sinceDate, sinceDate
    ]);
    return rows;
  }

  async findStoresData(storeIds) {
    const [rows] = await db.query(`
      SELECT 
        s.id, s.nombre_sucursal, s.direccion, s.telefono, s.estado, s.image_url as sede_image,
        c.nombre as commerce_nombre, c.logo_url as commerce_logo, c.descripcion as commerce_descripcion, c.type as commerce_type
      FROM stores s
      JOIN commerces c ON s.commerce_id = c.id
      WHERE s.id IN (?)
    `, [storeIds]);
    return rows;
  }

  async findStoreAndCommerceById(storeId) {
    const [rows] = await db.query(`
      SELECT s.*, c.nombre as commerce_nombre, c.logo_url as commerce_logo 
      FROM stores s 
      JOIN commerces c ON s.commerce_id = c.id 
      WHERE s.id = ?
    `, [storeId]);
    return rows[0] || null;
  }

  async findMenusByStoreId(storeId) {
    const [rows] = await db.query(`
      SELECT m.* 
      FROM menus m
      JOIN store_menus sm ON m.id = sm.menu_id
      WHERE sm.store_id = ? 
        AND sm.disponible = 1 
        AND m.disponible = 1
      ORDER BY m.orden ASC
    `, [storeId]);
    return rows;
  }

  async findCategoriesByMenuAndStore(menuId, storeId) {
    const [rows] = await db.query(`
      SELECT c.* 
      FROM categorias c
      JOIN store_categories sc ON c.id = sc.categoria_id
      WHERE c.menu_id = ? 
        AND sc.store_id = ?
        AND sc.disponible = 1
        AND c.disponible = 1
      ORDER BY c.orden_visual ASC
    `, [menuId, storeId]);
    return rows;
  }

  async findProductsByCategoryAndStore(categoryId, storeId) {
    const [rows] = await db.query(`
      SELECT p.id, p.nombre, p.descripcion_larga, 
             COALESCE(sp.precio_local, p.precio_base) as precio_base, 
             COALESCE(sp.tiempo_prep_local, p.tiempo_prep_estimado) as tiempo_prep_estimado, 
             p.image_url, p.disponible, p.es_vegetariano, p.tags
      FROM products p
      JOIN store_products sp ON p.id = sp.product_id
      WHERE p.categoria_id = ? 
        AND sp.store_id = ? 
        AND sp.disponible = 1 
        AND p.disponible = 1
    `, [categoryId, storeId]);
    return rows;
  }

  async findActiveVideos() {
    const [rows] = await db.query(`
      SELECT 
        v.id, v.title, v.description, v.url_high, v.url_low, v.url_mid, v.created_at,
        c.id as commerce_id, c.nombre as commerce_nombre, c.logo_url as commerce_logo,
        (SELECT COUNT(*) FROM commerce_video_likes WHERE video_id = v.id) as likes_count
      FROM commerce_videos v
      JOIN commerces c ON v.commerce_id = c.id
      WHERE v.status = 'active' AND c.type = 'Empresarial' AND v.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)
      ORDER BY v.created_at DESC
    `);
    return rows;
  }

  async checkVideoExists(videoId) {
    const [rows] = await db.query('SELECT id FROM commerce_videos WHERE id = ? AND status = "active"', [videoId]);
    return rows.length > 0;
  }

  async checkLikeExists(videoId, userId) {
    const [rows] = await db.query('SELECT 1 FROM commerce_video_likes WHERE video_id = ? AND user_id = ?', [videoId, userId]);
    return rows.length > 0;
  }

  async deleteLike(videoId, userId) {
    await db.query('DELETE FROM commerce_video_likes WHERE video_id = ? AND user_id = ?', [videoId, userId]);
  }

  async insertLike(videoId, userId) {
    await db.query('INSERT INTO commerce_video_likes (video_id, user_id) VALUES (?, ?)', [videoId, userId]);
  }

  async findVideoComments(videoId) {
    const [rows] = await db.query(`
      SELECT 
        vc.id, vc.comment, vc.created_at,
        u.id as user_id, CONCAT(p.nombres, ' ', COALESCE(p.apellidos, '')) as user_nombre
      FROM commerce_video_comments vc
      JOIN users u ON vc.user_id = u.id
      LEFT JOIN profiles p ON p.usuario_id = u.id
      WHERE vc.video_id = ?
      ORDER BY vc.created_at ASC
    `, [videoId]);
    return rows;
  }

  async insertComment(videoId, userId, comment) {
    const [result] = await db.query(`
      INSERT INTO commerce_video_comments (video_id, user_id, comment)
      VALUES (?, ?, ?)
    `, [videoId, userId, comment]);
    return result.insertId;
  }

  async findRegistrationRequestByNitOrEmail(nit, email) {
    const [rows] = await db.query(
      'SELECT id, estado FROM registration_requests WHERE nit = ? OR email_contacto = ?',
      [nit, email]
    );
    return rows;
  }

  async findUserByEmail(email) {
    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    return rows;
  }

  async insertRegistrationRequest(data) {
    const { tipo_solicitud, nit, razon_social, email_contacto, nombres_contacto, apellidos_contacto, celular_contacto } = data;
    await db.query(`
      INSERT INTO registration_requests 
      (tipo_solicitud, nit, razon_social, email_contacto, nombres_contacto, apellidos_contacto, celular_contacto, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')
    `, [tipo_solicitud, nit, razon_social, email_contacto, nombres_contacto, apellidos_contacto, celular_contacto]);
  }
}

module.exports = new PublicRepository();
