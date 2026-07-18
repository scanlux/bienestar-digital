-- ====================================================================
-- MIGRACION DDL: DOMI Crypto-Readiness v8
-- ====================================================================

-- 1. Crear tabla de canasta basica
CREATE TABLE IF NOT EXISTS domi_price_basket (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  item_name       VARCHAR(100) NOT NULL COMMENT 'Nombre del articulo de canasta (ej: Almuerzo corriente, Libra de arroz, Empanada).',
  item_key        VARCHAR(50) NOT NULL UNIQUE COMMENT 'Clave semantica para el motor (ej: almuerzo_corriente, libra_arroz, empanada).',
  is_active       BOOLEAN NOT NULL DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Crear tabla catalog_product_types
CREATE TABLE IF NOT EXISTS catalog_product_types (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL COMMENT 'Nombre legible del tipo de producto (ej: Almuerzo corriente, Libra de arroz, Empanada).',
  basket_item_id  INT NULL COMMENT 'FK a domi_price_basket.id. Asocia este tipo de catalogo a un item de la canasta.',
  weight          DECIMAL(5,4) NOT NULL DEFAULT 0.0000 COMMENT 'Peso o ponderacion en la canasta (ej. 0.7000). La suma de pesos de la canasta activa debe ser 1.0.',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cpt_basket (basket_item_id),
  CONSTRAINT fk_cpt_basket FOREIGN KEY (basket_item_id) REFERENCES domi_price_basket(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tipos de productos del catalogo para mapear la canasta basica de DOMI.';

-- 3. Alterar tabla products (productos) para agregar catalog_type_id
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS catalog_type_id INT NULL COMMENT 'Clasificacion de producto para el calculo de la canasta DOMI.',
  ADD CONSTRAINT fk_products_catalog_type FOREIGN KEY IF NOT EXISTS (catalog_type_id) REFERENCES catalog_product_types(id) ON DELETE SET NULL;

-- 4. Alterar tabla wallets para precision, nonces y limites
ALTER TABLE wallets
  MODIFY COLUMN balance_custody  DECIMAL(20,8) NOT NULL DEFAULT 0.00000000 COMMENT 'Saldo disponible del usuario. 8 decimales (nivel Bitcoin).',
  MODIFY COLUMN balance_utility  DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
  MODIFY COLUMN locked_balance   DECIMAL(20,8) NOT NULL DEFAULT 0.00000000 COMMENT 'RESERVADO: Para retiros programados (Escudo 3 anti-ballenas) y microcreditos. No activo aun.',
  MODIFY COLUMN usuario_id INT NULL COMMENT 'DEPRECADO v8: Usar owner_type+owner_id. Mantener por compatibilidad con triggers.',
  ADD COLUMN IF NOT EXISTS tx_nonce BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Nonce incremental por billetera. Garantiza unicidad deterministica del hash de transaccion.',
  ADD COLUMN IF NOT EXISTS tier ENUM('standard', 'verified_commerce', 'system') NOT NULL DEFAULT 'standard' COMMENT 'Nivel de la billetera. Controla limites anti-ballenas del Manifiesto DOMI.',
  ADD COLUMN IF NOT EXISTS max_balance_domi DECIMAL(20,8) NULL COMMENT 'Limite maximo de saldo segun tier. NULL = sin limite (system). Escudo 2 anti-ballenas.',
  ADD COLUMN IF NOT EXISTS excess_purchase_approved BOOLEAN NOT NULL DEFAULT 0 COMMENT 'Bypass temporal de gerencia que autoriza una compra de DOMI por encima del limite max_balance_domi. Se consume tras el mint.',
  ADD COLUMN IF NOT EXISTS withdrawal_cooldown_until DATETIME NULL COMMENT 'Retiros grandes bloqueados hasta esta fecha. Escudo 3 anti-ballenas.';

-- 5. Alterar tabla domi_ledger para cadena forense y nonce
ALTER TABLE domi_ledger
  MODIFY COLUMN amount_domis    DECIMAL(20,8) NOT NULL,
  MODIFY COLUMN amount_fiat_cop DECIMAL(20,8) NULL,
  ADD COLUMN IF NOT EXISTS nonce         BIGINT UNSIGNED NULL COMMENT 'Nonce de la billetera origen en el momento de la transaccion.',
  ADD COLUMN IF NOT EXISTS prev_tx_hash  VARCHAR(64) NULL COMMENT 'SHA256 de la transaccion anterior de esta billetera. Forma cadena forense local.',
  ADD INDEX IF NOT EXISTS idx_ledger_prev_hash (prev_tx_hash),
  ADD INDEX IF NOT EXISTS idx_ledger_from_wallet_date (from_wallet_id, created_at DESC),
  ADD INDEX IF NOT EXISTS idx_ledger_to_wallet_date   (to_wallet_id, created_at DESC);

-- 6. Alterar rescue_assignments para guardar snapshot de costo
ALTER TABLE rescue_assignments
  ADD COLUMN IF NOT EXISTS rescuer_commission DECIMAL(20,8) NULL COMMENT 'Snapshot del costo cobrado al rescatista al momento de assignRescue(). Inmutable post-cobro.';

-- 7. Alterar domi_packages para relacion con wallets (owner_type + owner_id)
ALTER TABLE domi_packages
  ADD COLUMN IF NOT EXISTS owner_type ENUM('user', 'store', 'commerce') NOT NULL DEFAULT 'store' COMMENT 'Tipo de propietario del paquete de acunacion.',
  ADD COLUMN IF NOT EXISTS owner_id INT NOT NULL DEFAULT 0 COMMENT 'ID del propietario segun owner_type.',
  ADD INDEX IF NOT EXISTS idx_pkg_owner (owner_type, owner_id);

-- 8. Backfill para domi_packages
UPDATE domi_packages dp
JOIN wallets w ON dp.wallet_id = w.id
SET dp.owner_type = w.owner_type, dp.owner_id = w.owner_id
WHERE dp.wallet_id IS NOT NULL;

-- 9. Crear tabla protocol_rules_history
CREATE TABLE IF NOT EXISTS protocol_rules_history (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  original_rule_id  INT NOT NULL DEFAULT 1,
  snapshot          JSON NOT NULL COMMENT 'Copia completa de protocol_rules + token_registry en ese momento.',
  changed_by        INT NULL COMMENT 'ID del system_user que autorizo el cambio.',
  change_reason     VARCHAR(500) NULL,
  effective_from    DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_prh_effective (effective_from DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historial inmutable de cambios de protocolo. Auditoria del tipo de cambio con snapshot.';

-- 10. Crear tabla domi_price_snapshots
CREATE TABLE IF NOT EXISTS domi_price_snapshots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  snapshot_date   DATE NOT NULL,
  basket_item_id  INT NOT NULL,
  median_price_cop DECIMAL(12,2) NOT NULL COMMENT 'Mediana estadistica del precio del articulo. Filtro anti-manipulacion del Manifiesto.',
  sample_count    INT NOT NULL DEFAULT 0 COMMENT 'Numero de productos analizados para calcular la mediana.',
  outliers_removed INT NOT NULL DEFAULT 0 COMMENT 'Cuantos precios extremos fueron descartados por el filtro anti-manipulacion.',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_snapshot_date_item (snapshot_date, basket_item_id),
  INDEX idx_snapshot_date (snapshot_date DESC),
  CONSTRAINT fk_snapshot_basket FOREIGN KEY (basket_item_id) REFERENCES domi_price_basket(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Crear tabla domi_peg_history
CREATE TABLE IF NOT EXISTS domi_peg_history (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  effective_date        DATE NOT NULL UNIQUE COMMENT 'Fecha desde la cual este peg es valido.',
  fiat_peg_cop          DECIMAL(20,8) NOT NULL COMMENT 'Valor del DOMI en COP desde esta fecha.',
  prev_fiat_peg_cop     DECIMAL(20,8) NOT NULL COMMENT 'Valor anterior. Para auditoria y calculo de variacion.',
  delta_percentage      DECIMAL(8,4) NULL COMMENT 'Variacion porcentual vs el peg anterior. Positivo = apreciacion.',
  trigger_reason        ENUM('inflacion_canasta', 'manual_admin', 'sobrecolateralizacion') NOT NULL,
  basket_inflation_rate DECIMAL(8,4) NULL COMMENT 'Tasa de inflacion calculada por la canasta que origino el ajuste.',
  reserve_cop_at_time   DECIMAL(20,2) NULL COMMENT 'Reserva fiduciaria total al momento del ajuste. Prueba de solvencia.',
  tokens_supply_at_time DECIMAL(20,8) NULL COMMENT 'Tokens circulantes al momento del ajuste.',
  approved_by           INT NULL COMMENT 'ID del system_user que aprobo el ajuste.',
  notes                 VARCHAR(1000) NULL,
  created_at            DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_peg_effective (effective_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historial auditado de todos los cambios de valor del token DOMI. Efecto Trinquete incluido.';

-- 12. Crear tabla domi_withdrawal_requests (Retiros programados y comisiones)
CREATE TABLE IF NOT EXISTS domi_withdrawal_requests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  wallet_id       INT NOT NULL,
  amount_domis    DECIMAL(20,8) NOT NULL,
  amount_cop      DECIMAL(20,2) NOT NULL COMMENT 'Valor en COP al momento de la solicitud, con exit_fee ya descontada.',
  exit_fee_rate   DECIMAL(6,4) NOT NULL COMMENT 'Tasa de comision de salida aplicada. Fija al momento de solicitud.',
  exit_fee_domis  DECIMAL(20,8) NOT NULL COMMENT 'DOMIs cobrados como comision de salida. Quemados al sistema.',
  status          ENUM('pendiente', 'en_cooldown', 'aprobado', 'rechazado', 'completado') NOT NULL DEFAULT 'pendiente',
  cooldown_until  DATETIME NULL COMMENT 'Retiros grandes quedan congelados hasta esta fecha (Escudo 3).',
  requested_by    INT NOT NULL COMMENT 'usuario_id o wallet owner que solicito el retiro.',
  approved_by     INT NULL,
  processed_at    DATETIME NULL,
  created_at      DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_wr_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cola de retiros fiduciarios. Implementa el Escudo 3 de cooldown del Manifiesto.';

-- 13. Crear tabla domi_tier_rules
CREATE TABLE IF NOT EXISTS domi_tier_rules (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  tier                    ENUM('standard', 'verified_commerce') NOT NULL UNIQUE,
  max_balance_domi        DECIMAL(20,8) NOT NULL COMMENT 'Saldo maximo permitido en esta billetera para compra (mint).',
  min_monthly_tx_domi     DECIMAL(20,8) NOT NULL DEFAULT 0 COMMENT 'Volumen minimo mensual de transacciones para mantener este tier.',
  large_withdrawal_threshold_domi DECIMAL(20,8) NOT NULL COMMENT 'A partir de este monto, el retiro entra en cooldown (Escudo 3).',
  cooldown_days           TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Dias de cooldown para retiros grandes.',
  free_withdrawals_per_month TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Cantidad de retiros gratis al mes calendario.',
  withdrawal_fee_cop      DECIMAL(20,2) NOT NULL DEFAULT 2000.00 COMMENT 'Costo fijo a cobrar por retiro excedente en COP.',
  daily_withdrawal_limit_cop DECIMAL(20,2) NOT NULL DEFAULT 2000000.00 COMMENT 'Limite maximo de retiro diario en COP acumulado.',
  updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- SEEDS INICIALES
-- ====================================================================

-- Seed inicial de la canasta basica
INSERT IGNORE INTO domi_price_basket (id, item_name, item_key) VALUES
  (1, 'Almuerzo corriente',    'almuerzo_corriente'),
  (2, 'Libra de arroz',        'libra_arroz'),
  (3, 'Empanada',              'empanada');

-- Seed de los tipos de catalogo para asociar productos de los comercios (con pesos)
INSERT IGNORE INTO catalog_product_types (id, name, basket_item_id, weight) VALUES
  (1, 'Almuerzo corriente ejecutivo', 1, 0.7000),
  (2, 'Libra de arroz blanco',        2, 0.2000),
  (3, 'Empanada tradicional',         3, 0.1000);

-- Seed inicial con los limites de acumulacion y reglas dinamicas de retiro
INSERT IGNORE INTO domi_tier_rules
  (tier, max_balance_domi, min_monthly_tx_domi, large_withdrawal_threshold_domi, cooldown_days, free_withdrawals_per_month, withdrawal_fee_cop, daily_withdrawal_limit_cop)
VALUES
  -- Standard: max 6500 DOMI en compra, 1 retiro gratis, luego $2000 COP, max 2M COP diarios
  ('standard',          6500.00000000, 0,        1000.00000000, 5, 1, 2000.00, 2000000.00),
  -- Comercio verificado: sin limite en compra, 1 retiro gratis, luego $2000 COP, max 5M COP diarios
  ('verified_commerce', 0,             5000,   125000.00000000, 3, 1, 2000.00, 5000000.00);
