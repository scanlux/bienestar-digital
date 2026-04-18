-- MIGRACIÓN: Renombrar BRANDS a COMMERCES
-- Fecha: 2026-04-16

USE marketplace_db;

-- 1. Renombrar la tabla principal
RENAME TABLE brands TO commerces;

-- 2. Renombrar columnas brand_id en tablas relacionadas
-- Tabla: STORES
ALTER TABLE stores CHANGE brand_id commerce_id INT NOT NULL;

-- Tabla: PRODUCTS
ALTER TABLE products CHANGE brand_id commerce_id INT;

-- 3. Actualizar comentarios si existen (opcional en MariaDB)
-- Se asume que los tipos de datos son INT basándose en el uso típico de IDs en este proyecto.
