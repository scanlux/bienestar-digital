REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'bienestar_deployer'@'%';

-- 1. Permisos DDL Estructurales sobre Catálogo y Tablas Maestras
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`commerces` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`stores` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`products` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`product_images` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`categorias` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`menus` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`ingredients` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`product_ingredients` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`payment_platforms` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`users` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`store_accounts` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`store_operating_hours` TO 'bienestar_deployer'@'%';

-- 2. Permisos DML (Sin Alter) para Libro Mayor y Transacciones
GRANT SELECT, INSERT ON `marketplace_db`.`domi_ledger` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE ON `marketplace_db`.`wallets` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE ON `marketplace_db`.`token_registry` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE ON `marketplace_db`.`protocol_rules` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE ON `marketplace_db`.`domi_packages` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE ON `marketplace_db`.`order_incidents` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE ON `marketplace_db`.`rescue_assignments` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE ON `marketplace_db`.`orders` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`product_popularity` TO 'bienestar_deployer'@'%';

-- 3. Permisos Estructurales sobre tablas v7 y v8
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`store_menus` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`store_categories` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`store_products` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`wallet_aliases` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`protocol_rules_history` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`domi_peg_history` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`domi_price_snapshots` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`domi_price_basket` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`catalog_product_types` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`domi_withdrawal_requests` TO 'bienestar_deployer'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON `marketplace_db`.`domi_tier_rules` TO 'bienestar_deployer'@'%';

FLUSH PRIVILEGES;
