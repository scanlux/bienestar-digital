-- ==============================================================================
-- 🚀 MIGRACIÓN: REDISEÑO DE IDENTIDADES Y CUENTAS (FASE 1)
-- ==============================================================================
USE `marketplace_db`;

-- Activar bypass de seguridad para permitir alteraciones
SET @domi_bypass_security = 1;

-- ------------------------------------------------------------------------------
-- 1. MODIFICAR TABLA users (Roles y Flags de Repartidor)
-- ------------------------------------------------------------------------------
-- Paso 1.1: Convertir temporalmente a VARCHAR para no perder datos en la transición del ENUM
ALTER TABLE users MODIFY COLUMN rol VARCHAR(20) DEFAULT 'customer';

-- Paso 1.2: Normalizar roles antiguos
UPDATE users SET rol = 'customer' WHERE rol IN ('customer', 'delivery');
UPDATE users SET rol = 'admin' WHERE rol = 'vendor';

-- Paso 1.3: Aplicar el nuevo ENUM
ALTER TABLE users MODIFY COLUMN rol ENUM('root', 'system', 'admin', 'customer') NOT NULL DEFAULT 'customer';

-- Paso 1.4: Agregar flags de repartidor
ALTER TABLE users ADD COLUMN IF NOT EXISTS es_repartidor TINYINT(1) NOT NULL DEFAULT 0 AFTER rol;
ALTER TABLE users ADD COLUMN IF NOT EXISTS repartidor_activo TINYINT(1) NOT NULL DEFAULT 0 AFTER es_repartidor;

-- ------------------------------------------------------------------------------
-- 2. CREAR TABLA profiles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  nombres     VARCHAR(100) NOT NULL,
  apellidos   VARCHAR(100),
  cedula      VARCHAR(20) NOT NULL UNIQUE,
  url_cedula  TEXT,
  telefono    VARCHAR(20) NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profile_user FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_profile_user UNIQUE (usuario_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------------------
-- 3. POBLAR TABLA profiles CON DATOS HISTÓRICOS
-- ------------------------------------------------------------------------------
INSERT INTO profiles (usuario_id, nombres, apellidos, cedula, telefono)
SELECT
  id,
  COALESCE(nombres, 'Usuario'),
  COALESCE(apellidos, 'Sin Apellido'),
  COALESCE(cedula_numero, CONCAT('PLACEHOLDER_', id)),
  COALESCE(celular, telefono, CONCAT('300', LPAD(id, 7, '0')))
FROM users
ON DUPLICATE KEY UPDATE
  nombres = VALUES(nombres),
  apellidos = VALUES(apellidos),
  cedula = VALUES(cedula),
  telefono = VALUES(telefono);

-- ------------------------------------------------------------------------------
-- 4. MIGRAR TABLA wallets (usuario_id FK Directa)
-- ------------------------------------------------------------------------------
-- Agregar la columna si no existe
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = 'marketplace_db' 
     AND TABLE_NAME = 'wallets' 
     AND COLUMN_NAME = 'usuario_id') = 0,
  "ALTER TABLE wallets ADD COLUMN usuario_id INT UNIQUE NULL AFTER owner_id",
  "SELECT 1"
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar la restricción si no existe
SET @s2 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
   WHERE CONSTRAINT_SCHEMA = 'marketplace_db' 
     AND TABLE_NAME = 'wallets' 
     AND CONSTRAINT_NAME = 'fk_wallet_user') = 0,
  "ALTER TABLE wallets ADD CONSTRAINT fk_wallet_user FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE RESTRICT",
  "SELECT 1"
));
PREPARE stmt2 FROM @s2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Vincular las wallets de usuario existentes
UPDATE wallets w
JOIN users u ON w.owner_type = 'user' AND w.owner_id = u.id
SET w.usuario_id = u.id;

-- ------------------------------------------------------------------------------
-- 5. MODIFICAR TABLAS commerces Y stores
-- ------------------------------------------------------------------------------
-- 5.1 commerces
SET @s3 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = 'marketplace_db' 
     AND TABLE_NAME = 'commerces' 
     AND COLUMN_NAME = 'usuario_id') = 0,
  "ALTER TABLE commerces ADD COLUMN usuario_id INT UNIQUE NULL AFTER id",
  "SELECT 1"
));
PREPARE stmt3 FROM @s3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

SET @s4 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
   WHERE CONSTRAINT_SCHEMA = 'marketplace_db' 
     AND TABLE_NAME = 'commerces' 
     AND CONSTRAINT_NAME = 'fk_commerce_user') = 0,
  "ALTER TABLE commerces ADD CONSTRAINT fk_commerce_user FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE RESTRICT",
  "SELECT 1"
));
PREPARE stmt4 FROM @s4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

-- Saneamiento de NIT en commerces antes de UNIQUE NOT NULL
UPDATE commerces SET nit = CONCAT('NIT_PLACEHOLDER_', id) WHERE nit IS NULL OR nit = '';

-- Eliminar índices UNIQUE de nit anteriores si los hay
SET @s5 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS 
   WHERE TABLE_SCHEMA = 'marketplace_db' 
     AND TABLE_NAME = 'commerces' 
     AND INDEX_NAME = 'nit') > 0,
  "ALTER TABLE commerces DROP INDEX nit",
  "SELECT 1"
));
PREPARE stmt5 FROM @s5;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

SET @s6 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS 
   WHERE TABLE_SCHEMA = 'marketplace_db' 
     AND TABLE_NAME = 'commerces' 
     AND INDEX_NAME = 'uq_commerce_nit') > 0,
  "ALTER TABLE commerces DROP INDEX uq_commerce_nit",
  "SELECT 1"
));
PREPARE stmt6 FROM @s6;
EXECUTE stmt6;
DEALLOCATE PREPARE stmt6;

ALTER TABLE commerces MODIFY COLUMN nit VARCHAR(30) NOT NULL;
ALTER TABLE commerces ADD CONSTRAINT uq_commerce_nit UNIQUE (nit);

-- 5.2 stores
SET @s7 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = 'marketplace_db' 
     AND TABLE_NAME = 'stores' 
     AND COLUMN_NAME = 'usuario_id') = 0,
  "ALTER TABLE stores ADD COLUMN usuario_id INT UNIQUE NULL AFTER commerce_id",
  "SELECT 1"
));
PREPARE stmt7 FROM @s7;
EXECUTE stmt7;
DEALLOCATE PREPARE stmt7;

SET @s8 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
   WHERE CONSTRAINT_SCHEMA = 'marketplace_db' 
     AND TABLE_NAME = 'stores' 
     AND CONSTRAINT_NAME = 'fk_store_user') = 0,
  "ALTER TABLE stores ADD CONSTRAINT fk_store_user FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE RESTRICT",
  "SELECT 1"
));
PREPARE stmt8 FROM @s8;
EXECUTE stmt8;
DEALLOCATE PREPARE stmt8;

SET @s9 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = 'marketplace_db' 
     AND TABLE_NAME = 'stores' 
     AND COLUMN_NAME = 'matricula') = 0,
  "ALTER TABLE stores ADD COLUMN matricula VARCHAR(50) UNIQUE NULL AFTER nombre_sucursal",
  "SELECT 1"
));
PREPARE stmt9 FROM @s9;
EXECUTE stmt9;
DEALLOCATE PREPARE stmt9;

-- Desactivar bypass de seguridad al finalizar
SET @domi_bypass_security = NULL;
SELECT "MIGRACIÓN COMPLETA CON ÉXITO" AS Status;
