START TRANSACTION;

-- Enable root flag so triggers allow RBAC updates
SET @domi_is_root = 1;

-- 1. Insert new permissions into permissions table
INSERT INTO permissions (category_id, name, description) VALUES
(3, 'enable_store_catalog', 'Habilitar menus y categorias para la sede'),
(3, 'write_catalog', 'Crear y editar menus, categorias y productos'),
(3, 'delete_catalog', 'Eliminar menus, categorias y productos'),
(3, 'edit_store_basic', 'Editar datos basicos de la sede (Telefonos, foto, horarios, estado y fecha de regreso)'),
(3, 'edit_store_advanced', 'Editar datos avanzados de la sede (Nombres/apellidos del admin, direccion, geolocalizacion, billeteras y cuentas bancarias)')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Get new permission IDs dynamically:
SET @enable_store_cat_id = (SELECT id FROM permissions WHERE name = 'enable_store_catalog');
SET @write_cat_id = (SELECT id FROM permissions WHERE name = 'write_catalog');
SET @delete_cat_id = (SELECT id FROM permissions WHERE name = 'delete_catalog');
SET @edit_store_basic_id = (SELECT id FROM permissions WHERE name = 'edit_store_basic');
SET @edit_store_advanced_id = (SELECT id FROM permissions WHERE name = 'edit_store_advanced');

-- Map edit_store (13) to edit_store_basic and edit_store_advanced
-- All roles with edit_store get edit_store_basic:
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, @edit_store_basic_id FROM role_permissions WHERE permission_id = 13
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- All roles with edit_store get edit_store_advanced EXCEPT role 5 (Admin de Sede)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, @edit_store_advanced_id FROM role_permissions WHERE permission_id = 13 AND role_id <> 5
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- Map manage_catalog (15) to write_catalog and delete_catalog
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, @write_cat_id FROM role_permissions WHERE permission_id = 15
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, @delete_cat_id FROM role_permissions WHERE permission_id = 15
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- Map manage_store_catalog (16) to enable_store_catalog and write_catalog
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, @enable_store_cat_id FROM role_permissions WHERE permission_id = 16
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, @write_cat_id FROM role_permissions WHERE permission_id = 16
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- 3. Delete deprecated mappings from role_permissions
DELETE FROM role_permissions WHERE permission_id IN (13, 15, 16);

-- 4. Delete deprecated permissions from permissions table
DELETE FROM permissions WHERE id IN (13, 15, 16);

COMMIT;
