-- ==========================================================
-- Migración v9: DOMI Token - Modelo Tether-Adaptado (1:1 COP)
-- ==========================================================

-- 1. Ampliar y limpiar canasta de v8 (Fase 11)
ALTER TABLE products DROP FOREIGN KEY fk_products_catalog_type;
ALTER TABLE products DROP COLUMN IF EXISTS catalog_type_id;

DROP TABLE IF EXISTS domi_price_snapshots;
DROP TABLE IF EXISTS catalog_product_types;
DROP TABLE IF EXISTS domi_price_basket;

SET @domi_bypass_security = 1;
UPDATE token_registry SET fiat_peg_cop = 1.00000000 WHERE id = 1;
SET @domi_bypass_security = NULL;

-- Ampliar ENUM de domi_peg_history para soporte de sobrecolateralización e inversión
SET @domi_bypass_security = 1;
ALTER TABLE domi_peg_history
  MODIFY COLUMN trigger_reason
    ENUM('manual_admin','sobrecolateralizacion','inversion_rendimiento') NOT NULL;
SET @domi_bypass_security = NULL;

-- 2. Modificaciones en protocol_rules (Fase 1.2)
SET @domi_bypass_security = 1;
ALTER TABLE protocol_rules
  ADD COLUMN IF NOT EXISTS store_fixed_fee_cop     DECIMAL(20,2) NOT NULL DEFAULT 400.00
    COMMENT 'Comision fija a la sede por pedido en COP. Se convierte a DOMI al peg vigente.',
  ADD COLUMN IF NOT EXISTS driver_fixed_fee_domi   DECIMAL(20,8) NOT NULL DEFAULT 300.00000000
    COMMENT 'Comision fija al repartidor por pedido en DOMI. Inmutable al momento del calculo.',
  ADD COLUMN IF NOT EXISTS cashback_rate_customer  DECIMAL(6,4)  NOT NULL DEFAULT 0.0100
    COMMENT 'Fraccion de la comision del repartidor sorteada como cashback al customer.',
  ADD COLUMN IF NOT EXISTS karma_min_for_cashback  TINYINT       NOT NULL DEFAULT 0
    COMMENT 'Karma minimo del customer para participar en la ruleta de cashback.',
  ADD COLUMN IF NOT EXISTS max_monthly_yield_pct   DECIMAL(6,4)  NOT NULL DEFAULT 0.5000
    COMMENT 'Maximo ajuste mensual del peg por rendimiento de inversiones certificadas.',
  ADD COLUMN IF NOT EXISTS cash_mint_expiry_days   TINYINT       NOT NULL DEFAULT 5
    COMMENT 'Dias maximos para confirmar acunacion transitoria antes de generar alerta.',
  ADD COLUMN IF NOT EXISTS min_domi_balance_driver DECIMAL(20,8) NOT NULL DEFAULT 600.00000000
    COMMENT 'Saldo minimo de DOMI que debe tener un repartidor para aceptar pedidos (2 comisiones de margen).',
  ADD COLUMN IF NOT EXISTS cod_capital_min_cop     DECIMAL(20,2) NOT NULL DEFAULT 50000.00
    COMMENT 'Capital minimo declarado en COP para que un repartidor independiente pueda aceptar pedidos COD.';
SET @domi_bypass_security = NULL;

-- 3. Modificaciones en users (Fase 1.5 y 4.2)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS domi_karma TINYINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Puntuacion de karma DOMI. Afecta la probabilidad de ganar en la ruleta de cashback.';

-- 4. Creación de tablas de soporte para Repartidores (Fase 4.1 y 4.3)
CREATE TABLE IF NOT EXISTS driver_profiles (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  user_id                INT NOT NULL UNIQUE
    COMMENT 'FK hacia users.id. El repartidor es un user con es_repartidor = 1.',
  driver_type            ENUM('store_employee','independent_capital','independent_domi_only') NOT NULL,
  employer_store_id      INT NULL
    COMMENT 'Solo si driver_type = store_employee. FK hacia stores.id.',
  capital_declarado_cop  DECIMAL(20,2) NOT NULL DEFAULT 0.00
    COMMENT 'Capital propio declarado para pedidos COD. Solo para independent_capital. No verificado automaticamente.',
  is_active              BOOLEAN NOT NULL DEFAULT 1,
  verified_at            DATETIME NULL
    COMMENT 'Fecha en que el administrador verifico el perfil del repartidor.',
  verified_by            INT NULL,
  created_at             DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_dp_user  FOREIGN KEY (user_id)           REFERENCES users(id),
  CONSTRAINT fk_dp_store FOREIGN KEY (employer_store_id) REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Perfil extendido de repartidores. Todo user con es_repartidor = 1 debe tener un registro aqui.';

CREATE TABLE IF NOT EXISTS driver_liquidations (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  driver_user_id         INT NOT NULL,
  store_id               INT NOT NULL,
  turno_inicio           DATETIME(6) NOT NULL,
  turno_fin              DATETIME(6) NULL,
  efectivo_esperado_cop  DECIMAL(20,2) NOT NULL DEFAULT 0.00
    COMMENT 'Suma de total_cop de todos los pedidos COD del turno. Calculado automaticamente.',
  efectivo_recibido_cop  DECIMAL(20,2) NULL
    COMMENT 'Efectivo real recibido por la caja de la sede al cerrar el turno.',
  diferencia_cop         DECIMAL(20,2) GENERATED ALWAYS AS (efectivo_recibido_cop - efectivo_esperado_cop) STORED
    COMMENT 'Positivo = sobrante. Negativo = faltante.',
  status                 ENUM('abierto','cerrado','con_discrepancia') NOT NULL DEFAULT 'abierto',
  cerrado_por            INT NULL
    COMMENT 'ID del system_user (administrador de sede) que cerro el turno.',
  notas                  VARCHAR(1000) NULL,
  created_at             DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_liquidation_driver (driver_user_id, turno_inicio DESC),
  CONSTRAINT fk_liq_driver FOREIGN KEY (driver_user_id) REFERENCES users(id),
  CONSTRAINT fk_liq_store  FOREIGN KEY (store_id)       REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro de liquidaciones de turno de repartidores empleados. Concilia el efectivo COD recolectado.';

-- 5. Modificaciones en orders (Fase 1.4 y 4.4)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method_customer  ENUM('domi','cash_cod') NOT NULL DEFAULT 'domi'
    COMMENT 'domi = customer paga con DOMI digital. cash_cod = customer paga efectivo al repartidor.',
  ADD COLUMN IF NOT EXISTS store_cost_cop_snapshot   DECIMAL(20,2)  NULL
    COMMENT 'Snapshot inmutable del cargo en COP a la sede al crear el pedido.',
  ADD COLUMN IF NOT EXISTS driver_cost_domi_snapshot DECIMAL(20,8)  NULL
    COMMENT 'Snapshot inmutable del cargo en DOMI al repartidor al crear el pedido.',
  ADD COLUMN IF NOT EXISTS fiat_peg_snapshot          DECIMAL(20,8)  NULL
    COMMENT 'Peg vigente al momento de crear el pedido. Inmutable.',
  ADD COLUMN IF NOT EXISTS customer_cashback_domi     DECIMAL(20,8)  NULL DEFAULT 0.00000000
    COMMENT 'DOMIs de cashback efectivamente ganados por el customer tras la ruleta.',
  ADD COLUMN IF NOT EXISTS driver_type_snapshot       ENUM('store_employee','independent_capital','independent_domi_only') NULL
    COMMENT 'Tipo de repartidor al momento de aceptar el pedido. Inmutable para auditar liquidaciones.',
  ADD COLUMN IF NOT EXISTS liquidation_id             INT NULL
    COMMENT 'FK hacia driver_liquidations. Se asigna cuando el turno es cerrado y el pedido era COD.',
  ADD CONSTRAINT fk_order_liquidation FOREIGN KEY (liquidation_id) REFERENCES driver_liquidations(id);

-- 6. Modificaciones en domi_packages y creación de tablas de Conciliación Bancaria (Fase 3)
ALTER TABLE domi_packages
  ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN  NOT NULL DEFAULT 1
    COMMENT '1 = Dinero en banco confirmado. 0 = Acunacion transitoria pendiente.',
  ADD COLUMN IF NOT EXISTS confirmed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS confirmed_by INT      NULL;

CREATE TABLE IF NOT EXISTS domi_reserve_declarations (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  reserva_cop       DECIMAL(20,2) NOT NULL
    COMMENT 'Saldo bancario real en COP. Fuente de verdad del ratio de colateralizacion.',
  declared_by       INT NOT NULL,
  fecha_declaracion DATE NOT NULL,
  notas             VARCHAR(1000) NULL,
  created_at        DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_reserve_date (fecha_declaracion DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS domi_reserve_alerts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tipo          ENUM('deposito_detectado','acunacion_sin_confirmar','deficit_reserva') NOT NULL,
  monto_cop     DECIMAL(20,2) NULL,
  referencia    VARCHAR(200) NULL,
  status        ENUM('pendiente','gestionado','descartado') NOT NULL DEFAULT 'pendiente',
  resolved_by   INT NULL,
  resolved_at   DATETIME NULL,
  created_at    DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_alerts_status (status, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cola de alertas de conciliacion bancaria del ecosistema DOMI.';

-- 7. Cuentas bancarias de retiro y modificaciones en solicitudes (Fase 6)
CREATE TABLE IF NOT EXISTS withdrawal_accounts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  wallet_id       INT NOT NULL,
  metodo          ENUM('bancolombia','nequi','daviplata','pse_otro') NOT NULL,
  numero_cuenta   VARCHAR(50) NOT NULL,
  tipo_cuenta     ENUM('ahorros','corriente','nequi','daviplata') NOT NULL,
  codigo_banco    VARCHAR(10) NULL
    COMMENT 'Codigo ACH del banco. Solo para metodo pse_otro.',
  titular         VARCHAR(200) NOT NULL,
  documento_cc    VARCHAR(20)  NOT NULL
    COMMENT 'Numero de cedula del titular. Requerido por Wompi Dispersiones.',
  is_verified     BOOLEAN NOT NULL DEFAULT 0
    COMMENT 'El administrador verifico que la cuenta pertenece al titular.',
  is_default      BOOLEAN NOT NULL DEFAULT 0,
  created_at      DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_wallet_account (wallet_id, numero_cuenta),
  CONSTRAINT fk_wa_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cuentas bancarias registradas para retiros via Wompi Dispersiones.';

ALTER TABLE domi_withdrawal_requests
  ADD COLUMN IF NOT EXISTS dispersion_method      ENUM('efectivo_casa_matriz','wompi_bancolombia','wompi_nequi','wompi_daviplata','wompi_pse') NULL,
  ADD COLUMN IF NOT EXISTS withdrawal_account_id  INT      NULL,
  ADD COLUMN IF NOT EXISTS wompi_dispersion_id    VARCHAR(100) NULL
    COMMENT 'ID de la transaccion retornado por Wompi Dispersiones API.',
  ADD COLUMN IF NOT EXISTS wompi_fee_cop          DECIMAL(20,2) NULL,
  ADD COLUMN IF NOT EXISTS wompi_fee_domi         DECIMAL(20,8) NULL
    COMMENT 'Fee de Wompi convertido a DOMI al peg vigente. Ya incluido en el total debitado.',
  ADD CONSTRAINT fk_dwr_account FOREIGN KEY (withdrawal_account_id) REFERENCES withdrawal_accounts(id);
