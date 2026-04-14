const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/home - Fetch brands and their products for the marketplace home
router.get('/home', async (req, res) => {
  try {
    // 1. Fetch all brands with layout and schedule info, ordered by 'orden'
    const [brands] = await db.query('SELECT id, nombre, descripcion, logo_url, type, open_time, close_time, orden FROM brands ORDER BY orden ASC');

    // 2. Fetch products for each brand (simplified for now)
    const [products] = await db.query(`
      SELECT p.id, p.brand_id, p.nombre, p.descripcion_corta, p.precio_base, pi.url as image_url
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.tipo = 'thumbnail'
    `);

    // 3. Assemble the data (Clean aggregate for the frontend to map)
    const results = brands.map(brand => ({
      ...brand,
      products: products.filter(p => p.brand_id === brand.id).map(p => ({
        id: p.id,
        nombre: p.nombre,
        descripcion_corta: p.descripcion_corta,
        precio_base: p.precio_base,
        image_url: p.image_url
      }))
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching home data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
