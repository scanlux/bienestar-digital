START TRANSACTION;

-- Enable root flag so triggers allow RBAC updates
SET @domi_is_root = 1;

-- Get Category ID for 'Seguridad'
SET @security_cat_id = (SELECT id FROM permission_categories WHERE name = 'Seguridad');

-- 1. Insert new permissions into permissions table
INSERT INTO permissions (category_id, name, description) VALUES
(@security_cat_id, 'view_maintenance_status', 'Ver el estado de diagnosticos y mantenimiento del sistema'),
(@security_cat_id, 'manage_maintenance', 'Activar, desactivar el modo mantenimiento y boton de panico'),
(@security_cat_id, 'view_system_logs', 'Lectura directa de logs de combined.log del backend')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Get new permission IDs dynamically:
SET @view_maint_id = (SELECT id FROM permissions WHERE name = 'view_maintenance_status');
SET @manage_maint_id = (SELECT id FROM permissions WHERE name = 'manage_maintenance');
SET @view_logs_id = (SELECT id FROM permissions WHERE name = 'view_system_logs');

-- Get Role IDs (root and system_manager)
SET @root_role_id = (SELECT id FROM roles WHERE code = 'root');
SET @system_role_id = (SELECT id FROM roles WHERE code = 'system_manager');

-- 2. Map new permissions to root role
INSERT INTO role_permissions (role_id, permission_id) VALUES
(@root_role_id, @view_maint_id),
(@root_role_id, @manage_maint_id),
(@root_role_id, @view_logs_id)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- 3. Map new permissions to system_manager role
INSERT INTO role_permissions (role_id, permission_id) VALUES
(@system_role_id, @view_maint_id),
(@system_role_id, @manage_maint_id),
(@system_role_id, @view_logs_id)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- 4. Map edit_store_basic to store_admin role (to allow basic store management by store admins)
SET @edit_store_basic_id = (SELECT id FROM permissions WHERE name = 'edit_store_basic');
SET @store_admin_role_id = (SELECT id FROM roles WHERE code = 'store_admin');
INSERT INTO role_permissions (role_id, permission_id) VALUES
(@store_admin_role_id, @edit_store_basic_id)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

COMMIT;
