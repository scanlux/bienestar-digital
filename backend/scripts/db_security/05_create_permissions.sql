-- Creación de la tabla de catálogo de permisos
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- Inserción de permisos básicos para el dashboard
INSERT IGNORE INTO permissions (name, description) VALUES 
('menu_commerce', 'Acceso al catálogo de comercios'),
('menu_stores', 'Acceso a la gestión de sedes'),
('menu_intelligence', 'Acceso al panel de inteligencia de negocio'),
('manage_users', 'Acceso al panel de control de usuarios y permisos');

-- Creación de la tabla pivote de permisos de usuario
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (user_id, permission_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
