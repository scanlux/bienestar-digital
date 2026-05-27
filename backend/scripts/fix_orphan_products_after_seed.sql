-- Asigna productos huerfanos a categorias nuevas y habilita en sede (max 4 por comercio si habia catalogo legacy)
USE marketplace_db;

START TRANSACTION;

-- Comercios con sede recien creada y productos sin categoria
DROP TEMPORARY TABLE IF EXISTS tmp_fix;
CREATE TEMPORARY TABLE tmp_fix AS
SELECT p.id AS product_id, p.commerce_id,
  (SELECT c.id FROM categorias c
   INNER JOIN menus m ON m.id = c.menu_id
   WHERE m.commerce_id = p.commerce_id
   ORDER BY c.menu_id, c.orden_visual, c.id LIMIT 1) AS cat1,
  (SELECT s.id FROM stores s WHERE s.commerce_id = p.commerce_id ORDER BY s.id LIMIT 1) AS store_id
FROM products p
WHERE p.categoria_id IS NULL
  AND p.commerce_id IN (6, 12, 13);

UPDATE products p
INNER JOIN tmp_fix t ON t.product_id = p.id
SET p.categoria_id = t.cat1,
    p.disponible = 1,
    p.image_url = COALESCE(NULLIF(TRIM(p.image_url), ''), 'https://placehold.co/600x400/1f2937/10b981/png?text=Prod'),
    p.descripcion_larga = COALESCE(NULLIF(TRIM(p.descripcion_larga), ''), CONCAT('Producto ', p.nombre, '.')),
    p.tiempo_prep_estimado = COALESCE(NULLIF(p.tiempo_prep_estimado, 0), 25),
    p.precio_base = COALESCE(NULLIF(p.precio_base, 0), 15000)
WHERE t.cat1 IS NOT NULL;

INSERT INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible)
SELECT t.store_id, t.product_id, NULL, NULL, 1
FROM tmp_fix t
WHERE t.store_id IS NOT NULL AND t.cat1 IS NOT NULL
ON DUPLICATE KEY UPDATE disponible = 1;

COMMIT;
