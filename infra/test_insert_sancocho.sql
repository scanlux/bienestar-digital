USE marketplace_db;

-- 1. Insertar la marca "El Sancocho de la Abuela"
INSERT INTO brands (id, nombre, descripcion, logo_url) VALUES 
(5, 'El Sancocho de la Abuela', 'El sabor tradicional que te transporta a casa.', 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=200');

-- 2. Insertar una sede para la marca
INSERT INTO stores (brand_id, nombre_sucursal, direccion, latitud, longitud, estado) VALUES 
(5, 'Sede Principal', 'Calle 5 # 10-15', 5.33, -72.40, 'abierto');

-- 3. Insertar el producto "Sancocho Trifásico"
INSERT INTO products (id, brand_id, nombre, descripcion_corta, precio_base, tiempo_prep_estimado) VALUES 
(5, 5, 'Sancocho Trifásico', 'Delicioso sancocho con tres carnes, yuca, plátano y mazorca.', 22000, 30);

-- 4. Asociar la imagen de "Antojo" al producto
INSERT INTO product_images (product_id, url, tipo) VALUES 
(5, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400', 'thumbnail');
