-- Migración v10: Simplificación del Flujo de Repartidores y Control de Preparación

-- 1. Eliminar la clave foránea en la tabla orders hacia driver_liquidations
ALTER TABLE orders DROP FOREIGN KEY fk_order_liquidation;

-- 2. Eliminar las columnas obsoletas en la tabla orders
ALTER TABLE orders 
  DROP COLUMN IF EXISTS driver_type_snapshot,
  DROP COLUMN IF EXISTS liquidation_id;

-- 3. Eliminar las tablas driver_liquidations y driver_profiles
DROP TABLE IF EXISTS driver_liquidations;
DROP TABLE IF EXISTS driver_profiles;

-- 4. Agregar columnas de control de preparación a la tabla orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS estimated_prep_time_minutes INT NULL DEFAULT 0
    COMMENT 'Tiempo maximo de preparacion estimado entre los productos del pedido.',
  ADD COLUMN IF NOT EXISTS preparation_started_at DATETIME(6) NULL
    COMMENT 'Timestamp de cuando la sede acepto el pedido e inicio su preparacion.';

-- 5. Agregar columna de penalización de COD a la tabla users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cod_penalty_remaining_orders INT NOT NULL DEFAULT 0
    COMMENT 'Cantidad de pedidos restantes en los que el usuario solo puede comprar usando DOMI digital por inasistencia.';
