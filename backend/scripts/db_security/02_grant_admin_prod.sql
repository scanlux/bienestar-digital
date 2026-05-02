-- 1. Permisos Globales (Solo lectura/inserción como base segura)
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'bienestar_admin_prod'@'%';
GRANT SELECT, INSERT ON `marketplace_db`.* TO 'bienestar_admin_prod'@'%';

-- 2. Permisos Operativos y Catálogo (CRUD)
GRANT UPDATE, DELETE ON `marketplace_db`.`commerces` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`stores` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`products` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`product_images` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`categorias` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`menus` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`ingredients` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`product_ingredients` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`payment_platforms` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`store_accounts` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`store_operating_hours` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE, DELETE ON `marketplace_db`.`users` TO 'bienestar_admin_prod'@'%';

-- 3. Tabla Operativa Transaccional
GRANT UPDATE ON `marketplace_db`.`orders` TO 'bienestar_admin_prod'@'%';

-- 4. Permisos de Modificación Financiera Limitada (Sin DELETE)
GRANT UPDATE ON `marketplace_db`.`wallets` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE ON `marketplace_db`.`domi_packages` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE ON `marketplace_db`.`order_incidents` TO 'bienestar_admin_prod'@'%';
GRANT UPDATE ON `marketplace_db`.`rescue_assignments` TO 'bienestar_admin_prod'@'%';

FLUSH PRIVILEGES;
