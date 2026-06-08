-- ==============================================================================
-- 🚀 MIGRACIÓN: LIMPIEZA DE COLUMNAS OBSOLETAS (FASE 4)
-- ==============================================================================
USE `marketplace_db`;

-- Activar bypass de seguridad para permitir alteraciones
SET @domi_bypass_security = 1;

-- ------------------------------------------------------------------------------
-- 1. LIMPIAR TABLA users (Eliminar campos migrados a profiles)
-- ------------------------------------------------------------------------------
-- 1.1 Dropear la llave foránea antigua si existe
SET @fk_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = 'marketplace_db' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'commerce_id'
    AND CONSTRAINT_NAME <> 'PRIMARY'
  LIMIT 1
);

SET @drop_fk_stmt = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE users DROP FOREIGN KEY ', @fk_name), 'SELECT 1');
PREPARE stmt_fk FROM @drop_fk_stmt;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- 1.2 Dropear las columnas obsoletas
ALTER TABLE users 
  DROP COLUMN IF EXISTS nombres,
  DROP COLUMN IF EXISTS apellidos,
  DROP COLUMN IF EXISTS telefono,
  DROP COLUMN IF EXISTS celular,
  DROP COLUMN IF EXISTS cedula_numero,
  DROP COLUMN IF EXISTS url_imagen_cedula,
  DROP COLUMN IF EXISTS commerce_id;

-- ------------------------------------------------------------------------------
-- 2. LIMPIAR TABLA commerces (Eliminar campos de gerente duplicados)
-- ------------------------------------------------------------------------------
ALTER TABLE commerces
  DROP COLUMN IF EXISTS gerente_nombre,
  DROP COLUMN IF EXISTS gerente_telefono;

-- Desactivar bypass de seguridad al finalizar
SET @domi_bypass_security = NULL;
SELECT "LIMPIEZA COMPLETA CON ÉXITO" AS Status;
