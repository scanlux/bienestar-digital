-- Backfill catalogo: habilitar pivotes + rellenar campos vacios (sin crear comercios/sedes)
USE marketplace_db;

START TRANSACTION;

UPDATE commerces SET
  descripcion = CASE
    WHEN descripcion IS NULL OR TRIM(descripcion) = ''
    THEN CONCAT('Catalogo disponible para ', nombre, '. Variedad de productos frescos y servicios de domicilio.')
    ELSE descripcion END,
  telefono = CASE WHEN telefono IS NULL OR TRIM(telefono) = '' THEN '+57 300 0000000' ELSE telefono END,
  ciudad = CASE WHEN ciudad IS NULL OR TRIM(ciudad) = '' THEN 'Bogota D.C.' ELSE ciudad END,
  direccion = CASE WHEN direccion IS NULL OR TRIM(direccion) = '' THEN 'Direccion principal por confirmar' ELSE direccion END,
  nit = CASE WHEN nit IS NULL OR TRIM(nit) = '' THEN '900000000' ELSE nit END;

UPDATE stores s
JOIN commerces c ON c.id = s.commerce_id
SET
  s.telefono = CASE WHEN s.telefono IS NULL OR TRIM(s.telefono) = ''
    THEN COALESCE(NULLIF(TRIM(c.telefono), ''), '+57 300 0000000') ELSE s.telefono END,
  s.contacto_directo = CASE WHEN s.contacto_directo IS NULL OR TRIM(s.contacto_directo) = ''
    THEN CONCAT('Referencia ', COALESCE(s.nombre_sucursal, 'sucursal')) ELSE s.contacto_directo END,
  s.image_url = CASE WHEN s.image_url IS NULL OR TRIM(s.image_url) = ''
    THEN c.logo_url ELSE s.image_url END,
  s.direccion = CASE WHEN s.direccion IS NULL OR TRIM(s.direccion) = ''
    THEN COALESCE(NULLIF(TRIM(c.direccion), ''), CONCAT('Ubicacion ', s.nombre_sucursal))
    ELSE s.direccion END;

INSERT INTO store_operating_hours (store_id, day_index, status, open_time, close_time, is_24h)
SELECT s.id, d.day_index, 'abierto', '08:00:00', '20:00:00', 0
FROM stores s
CROSS JOIN (
  SELECT 0 AS day_index UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
  UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) d
WHERE NOT EXISTS (
  SELECT 1 FROM store_operating_hours h WHERE h.store_id = s.id AND h.day_index = d.day_index
);

UPDATE menus SET descripcion = CASE
  WHEN descripcion IS NULL OR TRIM(descripcion) = ''
  THEN CONCAT('Menu maestro: ', nombre)
  ELSE descripcion END;

UPDATE categorias SET descripcion = CASE
  WHEN descripcion IS NULL OR TRIM(descripcion) = ''
  THEN CONCAT('Seccion ', nombre)
  ELSE descripcion END;

UPDATE products SET
  image_url = CASE WHEN image_url IS NULL OR TRIM(image_url) = ''
    THEN 'https://placehold.co/600x400/1f2937/10b981/png?text=Prod' ELSE image_url END,
  descripcion_larga = CASE WHEN descripcion_larga IS NULL OR TRIM(descripcion_larga) = ''
    THEN CONCAT('Opcion destacada en nuestro catalogo: ', nombre, '.') ELSE descripcion_larga END,
  tiempo_prep_estimado = CASE WHEN tiempo_prep_estimado IS NULL OR tiempo_prep_estimado < 1 THEN 25 ELSE tiempo_prep_estimado END,
  disponible = 1;

INSERT INTO store_menus (store_id, menu_id, disponible)
SELECT s.id, m.id, 1
FROM stores s
INNER JOIN menus m ON m.commerce_id = s.commerce_id
ON DUPLICATE KEY UPDATE disponible = 1;

INSERT INTO store_categories (store_id, categoria_id, disponible)
SELECT DISTINCT s.id, c.id, 1
FROM stores s
INNER JOIN menus m ON m.commerce_id = s.commerce_id
INNER JOIN categorias c ON c.menu_id = m.id
ON DUPLICATE KEY UPDATE disponible = 1;

INSERT INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible)
SELECT DISTINCT s.id, p.id, NULL, NULL, 1
FROM stores s
INNER JOIN products p ON p.commerce_id = s.commerce_id
INNER JOIN categorias cat ON cat.id = p.categoria_id
INNER JOIN menus m ON m.id = cat.menu_id AND m.commerce_id = s.commerce_id
ON DUPLICATE KEY UPDATE disponible = 1;

COMMIT;

SELECT 'store_menus' AS tabla, COUNT(*) AS total FROM store_menus
UNION ALL SELECT 'store_categories', COUNT(*) FROM store_categories
UNION ALL SELECT 'store_products', COUNT(*) FROM store_products;
