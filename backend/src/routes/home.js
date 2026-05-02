const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/home - Fetch commerces and their products for the marketplace home
router.get('/home', async (req, res) => {
  try {
    // 1. Fetch all active commerces ordered by 'orden'
    const [commerces] = await db.query("SELECT id, nombre, descripcion, logo_url, type, open_time, close_time, orden FROM commerces WHERE status = 'active' ORDER BY orden ASC");

    // 2. Fetch products for each commerce (simplified for now)
    const [products] = await db.query(`
      SELECT p.id, p.commerce_id, p.nombre, p.descripcion_corta, p.precio_base, p.image_url
      FROM products p
      WHERE p.disponible = 1
    `);

    // 3. Assemble the data
    const results = commerces.map(commerce => ({
      ...commerce,
      products: products.filter(p => p.commerce_id === commerce.id).map(p => ({
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
