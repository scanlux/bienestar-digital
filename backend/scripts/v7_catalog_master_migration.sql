-- ============================================================
-- MIGRACION v7: Catalogo Maestro por Comercio
-- IMPORTANTE: Ejecutar como ROOT en MariaDB
-- ============================================================

USE marketplace_db;

-- 1. Agregar commerce_id a menus (sin borrar store_id aun)
ALTER TABLE menus ADD COLUMN commerce_id INT NULL AFTER id;

-- 2. Poblar commerce_id desde stores -> commerces
UPDATE menus m
JOIN stores s ON m.store_id = s.id
SET m.commerce_id = s.commerce_id;

-- 3. Hacer commerce_id NOT NULL
ALTER TABLE menus MODIFY commerce_id INT NOT NULL;

-- 4. Agregar constraint FK fk_menus_commerce
ALTER TABLE menus ADD CONSTRAINT fk_menus_commerce 
  FOREIGN KEY (commerce_id) REFERENCES commerces(id) ON DELETE CASCADE;

-- 5. Crear tabla store_menus
CREATE TABLE IF NOT EXISTS store_menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  menu_id INT NOT NULL,
  disponible BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_store_menu (store_id, menu_id),
  CONSTRAINT fk_sm_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_sm_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Crear tabla store_categories
CREATE TABLE IF NOT EXISTS store_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  categoria_id INT NOT NULL,
  disponible BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_store_cat (store_id, categoria_id),
  CONSTRAINT fk_sc_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_sc_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Crear tabla store_products
CREATE TABLE IF NOT EXISTS store_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  product_id INT NOT NULL,
  precio_local DECIMAL(12,2) NULL COMMENT 'NULL = usar precio_base del producto maestro',
  tiempo_prep_local INT NULL COMMENT 'NULL = usar tiempo_prep_estimado del producto maestro',
  disponible BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_store_product (store_id, product_id),
  CONSTRAINT fk_sp_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Poblar store_menus con relaciones existentes
INSERT INTO store_menus (store_id, menu_id, disponible)
SELECT store_id, id, 1 FROM menus
WHERE store_id IS NOT NULL
ON DUPLICATE KEY UPDATE disponible = 1;

-- 9. Poblar store_categories
INSERT INTO store_categories (store_id, categoria_id, disponible)
SELECT DISTINCT m.store_id, c.id, 1
FROM categorias c
JOIN menus m ON c.menu_id = m.id
WHERE m.store_id IS NOT NULL
ON DUPLICATE KEY UPDATE disponible = 1;

-- 10. Poblar store_products
INSERT INTO store_products (store_id, product_id, precio_local, tiempo_prep_local, disponible)
SELECT DISTINCT m.store_id, p.id, NULL, NULL, p.disponible
FROM products p
JOIN categorias c ON p.categoria_id = c.id
JOIN menus m ON c.menu_id = m.id
WHERE m.store_id IS NOT NULL
ON DUPLICATE KEY UPDATE disponible = p.disponible;

-- 11. Eliminar store_id de menus (y su FK)
ALTER TABLE menus DROP FOREIGN KEY IF EXISTS menus_ibfk_1;
ALTER TABLE menus DROP COLUMN store_id;

-- 12. Indices de rendimiento
CREATE INDEX idx_sp_store ON store_products(store_id);
CREATE INDEX idx_sp_product ON store_products(product_id);
CREATE INDEX idx_sm_store ON store_menus(store_id);
CREATE INDEX idx_sc_store ON store_categories(store_id);
CREATE INDEX idx_menus_commerce ON menus(commerce_id);
