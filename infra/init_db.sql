-- ==============================================================================
-- 🌟 SCRIPT DE BASE DE DATOS: MARKETPLACE DE DOMICILIOS
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS marketplace_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE marketplace_db;

-- 1. Usuarios
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  telefono VARCHAR(20),
  cedula_numero VARCHAR(50),
  url_imagen_cedula TEXT,
  rol ENUM('customer', 'vendor', 'delivery', 'admin') DEFAULT 'customer',
  estado ENUM('activo', 'inactivo', 'baneado') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- 2. Marcas (Brands)
CREATE TABLE brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sedes (Stores)
CREATE TABLE stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  nombre_sucursal VARCHAR(100),
  direccion VARCHAR(255) NOT NULL,
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  horario_atencion VARCHAR(255),
  estado ENUM('abierto', 'cerrado', 'mantenimiento') DEFAULT 'abierto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 4. Productos Maestro
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion_corta VARCHAR(255),
  descripcion_larga TEXT,
  precio_base DECIMAL(10, 2) NOT NULL,
  tiempo_prep_estimado INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

-- 5. Galería visual del producto
CREATE TABLE product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  url TEXT NOT NULL,
  tipo ENUM('thumbnail', 'hero_horizontal', 'hero_vertical', 'detalle') DEFAULT 'detalle',
  orden_visual INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ==============================================================================
-- 🌱 SEEDING: DATOS DE PRUEBA (ESTRATEGIA ANTOJO)
-- ==============================================================================

-- Marcas
INSERT INTO brands (nombre, descripcion, logo_url) VALUES 
('Entre Cazuelas', 'Comida tradicional y cazuelas calientes.', 'https://picsum.photos/seed/cazuelas/200'),
('Don Chuch Market', 'Tu mercado local con productos frescos.', 'https://picsum.photos/seed/market/200'),
('Taco Loco', 'Los mejores tacos auténticos.', 'https://picsum.photos/seed/taco/200'),
('Pizza Nova', 'Pizzas artesanales al horno de leña.', 'https://picsum.photos/seed/pizza/200');

-- Sedes
INSERT INTO stores (brand_id, nombre_sucursal, direccion, latitud, longitud, estado) VALUES 
(1, 'Sede Centro', 'Calle 10 # 5-20', 5.33, -72.39, 'abierto'),
(2, 'Sede Norte', 'Avenida Principal # 15', 5.34, -72.40, 'cerrado'),
(3, 'Taco Loco Yopal', 'Carrera 20 # 11', 5.32, -72.38, 'abierto'),
(4, 'Pizza Nova Centro', 'Calle 9 # 12', 5.33, -72.40, 'abierto');

-- Productos (Entre Cazuelas)
INSERT INTO products (brand_id, nombre, descripcion_corta, precio_base, tiempo_prep_estimado) VALUES 
(1, 'Soda de Lulo', 'Refrescante soda natural con pulpa de lulo.', 5500, 10),
(1, 'Cerveza Importada', 'Cerveza fría de las mejores marcas.', 7000, 5),
(1, 'Cazuela de Frijoles', 'Tradicional cazuela con chicharrón y aguacate.', 18000, 25);

-- Imágenes de Productos
INSERT INTO product_images (product_id, url, tipo) VALUES 
(1, 'https://picsum.photos/400/300?random=11', 'thumbnail'),
(2, 'https://picsum.photos/400/300?random=12', 'thumbnail'),
(3, 'https://picsum.photos/400/300?random=13', 'hero_vertical');

-- Productos (Taco Loco)
INSERT INTO products (brand_id, nombre, descripcion_corta, precio_base, tiempo_prep_estimado) VALUES 
(3, 'Tacos Al Pastor', 'Tacos clásicos con piña y cilantro.', 12000, 15);

-- Imágenes (Taco Loco)
INSERT INTO product_images (product_id, url, tipo) VALUES 
(4, 'https://picsum.photos/400/300?random=14', 'thumbnail');

-- PRIVILEGIOS
GRANT ALL PRIVILEGES ON marketplace_db.* TO 'bienestar_admin_prod'@'%';
FLUSH PRIVILEGES;
