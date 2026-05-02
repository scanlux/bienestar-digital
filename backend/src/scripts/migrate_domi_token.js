/**
 * Migracion: Arquitectura Financiera Token DOMI
 * 
 * Este script crea las tablas necesarias para el motor economico DOMI:
 *  - CAPA 0: token_registry, protocol_rules (configuracion sagrada)
 *  - CAPA 1: wallets (billeteras)
 *  - CAPA 2: domi_packages, domi_ledger (economia)
 *  - CAPA 3: orders, order_incidents, rescue_assignments (operaciones)
 * 
 * NOTA: Los tipos de columna (INT vs BIGINT) se alinean con el esquema
 * existente de `stores` (INT) y `users` (INT).
 * 
 * Uso: node src/scripts/migrate_domi_token.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  console.log('[DOMI] Conectado a la base de datos. Iniciando migracion...');

  // ============================================================
  // CAPA 0: CONFIGURACION SAGRADA
  // ============================================================

  console.log('[DOMI] Fase 1: Creando tablas de Configuracion Sagrada...');

  // -- token_registry --
  await connection.query(`
    CREATE TABLE IF NOT EXISTS token_registry (
      id              TINYINT UNSIGNED NOT NULL DEFAULT 1,
      symbol          VARCHAR(10)      NOT NULL DEFAULT 'DOMI',
      name            VARCHAR(100)     NOT NULL DEFAULT 'DomiToken',
      decimals        TINYINT UNSIGNED NOT NULL DEFAULT 2,
      fiat_peg_cop    DECIMAL(12, 4)   NOT NULL DEFAULT 400.0000,
      protocol_version VARCHAR(20)     NOT NULL DEFAULT '1.0.0',
      integrity_hash  VARCHAR(64)      NOT NULL,
      created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT pk_token_registry PRIMARY KEY (id),
      CONSTRAINT chk_singleton CHECK (id = 1)
    ) ENGINE=InnoDB COMMENT='Registro maestro del token DOMI. READ-ONLY para la app.'
  `);
  console.log('  -> token_registry creada.');

  // Insertar fila singleton si no existe
  const tokenFields = 'DOMI|DomiToken|2|400.0000|1.0.0';
  const integrityHash = crypto.createHash('sha256').update(tokenFields).digest('hex');

  await connection.query(`
    INSERT IGNORE INTO token_registry (id, symbol, name, decimals, fiat_peg_cop, protocol_version, integrity_hash)
    VALUES (1, 'DOMI', 'DomiToken', 2, 400.0000, '1.0.0', ?)
  `, [integrityHash]);
  console.log('  -> Fila singleton insertada. Hash: ' + integrityHash.substring(0, 16) + '...');

  // -- protocol_rules --
  await connection.query(`
    CREATE TABLE IF NOT EXISTS protocol_rules (
      id                      TINYINT UNSIGNED NOT NULL DEFAULT 1,
      threshold_fiat_cop      DECIMAL(12, 2)   NOT NULL DEFAULT 50000.00,
      base_cost_domis         DECIMAL(10, 4)   NOT NULL DEFAULT 1.0000,
      percentage_rate         DECIMAL(8, 6)    NOT NULL DEFAULT 0.010000,
      retention_penalty_rate  DECIMAL(8, 6)    NOT NULL DEFAULT 0.300000,
      refund_standard_rate    DECIMAL(8, 6)    NOT NULL DEFAULT 0.700000,
      rescue_cashback_rate    DECIMAL(8, 6)    NOT NULL DEFAULT 0.300000,
      effective_date          DATE             NOT NULL,
      notes                   TEXT,
      created_at              DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT pk_protocol_rules PRIMARY KEY (id),
      CONSTRAINT chk_singleton_rules CHECK (id = 1),
      CONSTRAINT chk_rates_sum CHECK (
        retention_penalty_rate + refund_standard_rate = 1.000000
      )
    ) ENGINE=InnoDB COMMENT='Parametros financieros del protocolo. READ-ONLY para la app.'
  `);
  console.log('  -> protocol_rules creada.');

  // Insertar reglas iniciales
  await connection.query(`
    INSERT IGNORE INTO protocol_rules 
    (id, threshold_fiat_cop, base_cost_domis, percentage_rate, retention_penalty_rate, refund_standard_rate, rescue_cashback_rate, effective_date, notes)
    VALUES (1, 50000.00, 1.0000, 0.010000, 0.300000, 0.700000, 0.300000, CURDATE(), 'Reglas iniciales del protocolo DOMI v1.0.0')
  `);
  console.log('  -> Reglas iniciales insertadas.');

  // ============================================================
  // CAPA 1: BILLETERAS
  // ============================================================

  console.log('[DOMI] Fase 2: Creando tablas Economicas...');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id              INT          NOT NULL AUTO_INCREMENT,
      owner_type      ENUM('system','user','store') NOT NULL,
      owner_id        INT,
      balance_custody   DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
      balance_utility   DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
      locked_balance    DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT pk_wallets PRIMARY KEY (id),
      CONSTRAINT uq_owner UNIQUE (owner_type, owner_id),
      CONSTRAINT chk_balances CHECK (
        balance_custody >= 0 AND balance_utility >= 0 AND locked_balance >= 0
      )
    ) ENGINE=InnoDB COMMENT='Billeteras de usuarios, tiendas y sistema.'
  `);
  console.log('  -> wallets creada.');

  // Insertar billetera del Sistema (singleton, owner_id=NULL)
  await connection.query(`
    INSERT IGNORE INTO wallets (owner_type, owner_id)
    VALUES ('system', NULL)
  `);
  console.log('  -> Billetera del Sistema creada.');

  // -- domi_packages --
  await connection.query(`
    CREATE TABLE IF NOT EXISTS domi_packages (
      id              INT          NOT NULL AUTO_INCREMENT,
      store_id        INT          NOT NULL,
      wallet_id       INT          NOT NULL,
      domis_purchased DECIMAL(18, 4)  NOT NULL,
      fiat_paid_cop   DECIMAL(14, 2)  NOT NULL,
      exchange_rate   DECIMAL(12, 4)  NOT NULL,
      payment_ref     VARCHAR(100),
      status          ENUM('pendiente','confirmado','anulado') NOT NULL DEFAULT 'pendiente',
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmed_at    DATETIME,
      CONSTRAINT pk_domi_packages PRIMARY KEY (id),
      CONSTRAINT fk_pkg_store  FOREIGN KEY (store_id)  REFERENCES stores(id),
      CONSTRAINT fk_pkg_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    ) ENGINE=InnoDB COMMENT='Historial de compras de paquetes DOMI por establecimientos.'
  `);
  console.log('  -> domi_packages creada.');

  // -- domi_ledger (APPEND ONLY) --
  await connection.query(`
    CREATE TABLE IF NOT EXISTS domi_ledger (
      id              INT          NOT NULL AUTO_INCREMENT,
      tx_hash         VARCHAR(64)     NOT NULL UNIQUE,
      tx_type         ENUM(
                        'mint',
                        'burn_service',
                        'burn_incident',
                        'refund',
                        'rescue_cashback',
                        'lock',
                        'unlock'
                      ) NOT NULL,
      from_wallet_id  INT,
      to_wallet_id    INT,
      amount_domis    DECIMAL(18, 4)   NOT NULL,
      amount_fiat_cop DECIMAL(14, 2),
      reference_type  ENUM('order','package','incident','manual') NOT NULL,
      reference_id    INT              NOT NULL,
      protocol_snapshot JSON           NOT NULL,
      notes           TEXT,
      created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT pk_ledger PRIMARY KEY (id)
    ) ENGINE=InnoDB COMMENT='Libro mayor inmutable. NUNCA se hacen UPDATE ni DELETE.'
  `);
  console.log('  -> domi_ledger creada.');

  // ============================================================
  // CAPA 3: OPERACIONES
  // ============================================================

  console.log('[DOMI] Fase 3: Creando tablas de Operaciones...');

  // -- orders (si no existe ya) --
  const [existingOrders] = await connection.query(`
    SELECT TABLE_NAME FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders'
  `, [process.env.DB_NAME]);

  if (existingOrders.length === 0) {
    await connection.query(`
      CREATE TABLE orders (
        id                INT          NOT NULL AUTO_INCREMENT,
        store_id          INT          NOT NULL,
        customer_user_id  INT          NOT NULL,
        driver_user_id    INT,
        total_cop         DECIMAL(14, 2)  NOT NULL DEFAULT 0.00,
        domi_cost         DECIMAL(18, 4)  NOT NULL DEFAULT 0.0000,
        status            ENUM('pendiente','aceptado','preparando','listo','en_camino','entregado','cancelado','en_rescate') NOT NULL DEFAULT 'pendiente',
        delivery_address  TEXT,
        delivery_lat      DECIMAL(10, 7),
        delivery_lng      DECIMAL(10, 7),
        notes             TEXT,
        created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        accepted_at       DATETIME,
        picked_up_at      DATETIME,
        delivered_at      DATETIME,
        cancelled_at      DATETIME,
        CONSTRAINT pk_orders PRIMARY KEY (id),
        CONSTRAINT fk_order_store FOREIGN KEY (store_id) REFERENCES stores(id),
        CONSTRAINT fk_order_customer FOREIGN KEY (customer_user_id) REFERENCES users(id),
        CONSTRAINT fk_order_driver FOREIGN KEY (driver_user_id) REFERENCES users(id)
      ) ENGINE=InnoDB COMMENT='Pedidos del marketplace.'
    `);
    console.log('  -> orders creada.');
  } else {
    console.log('  -> orders ya existe, saltando.');
  }

  // -- order_incidents --
  await connection.query(`
    CREATE TABLE IF NOT EXISTS order_incidents (
      id                  INT          NOT NULL AUTO_INCREMENT,
      order_id            INT          NOT NULL,
      reported_by_user_id INT          NOT NULL,
      incident_phase      ENUM('pre_pickup','post_pickup') NOT NULL,
      reason              VARCHAR(255)    NOT NULL,
      status              ENUM('abierta','en_rescate','resuelta','cerrada') NOT NULL DEFAULT 'abierta',
      created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at         DATETIME,
      CONSTRAINT pk_incidents PRIMARY KEY (id),
      CONSTRAINT fk_inc_order FOREIGN KEY (order_id) REFERENCES orders(id)
    ) ENGINE=InnoDB COMMENT='Registro de incidencias por pedido.'
  `);
  console.log('  -> order_incidents creada.');

  // -- rescue_assignments --
  await connection.query(`
    CREATE TABLE IF NOT EXISTS rescue_assignments (
      id                  INT          NOT NULL AUTO_INCREMENT,
      incident_id         INT          NOT NULL UNIQUE,
      order_id            INT          NOT NULL,
      original_driver_id  INT          NOT NULL,
      rescue_driver_id    INT,
      original_commission DECIMAL(18, 4)  NOT NULL,
      status              ENUM('buscando_rescatista','en_camino','entregado','fallido') NOT NULL DEFAULT 'buscando_rescatista',
      cashback_paid       TINYINT(1)      NOT NULL DEFAULT 0,
      created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at        DATETIME,
      CONSTRAINT pk_rescue PRIMARY KEY (id),
      CONSTRAINT fk_rescue_incident FOREIGN KEY (incident_id) REFERENCES order_incidents(id)
    ) ENGINE=InnoDB COMMENT='Asignaciones de rescate a repartidores suplentes.'
  `);
  console.log('  -> rescue_assignments creada.');

  // ============================================================
  // PERMISOS DE SEGURIDAD
  // ============================================================

  console.log('[DOMI] Configurando permisos de seguridad...');

  try {
    await connection.query(`REVOKE INSERT, UPDATE, DELETE ON ${process.env.DB_NAME}.token_registry FROM '${process.env.DB_USER}'@'%'`);
    await connection.query(`GRANT SELECT ON ${process.env.DB_NAME}.token_registry TO '${process.env.DB_USER}'@'%'`);
    console.log('  -> Permisos de token_registry configurados (solo SELECT).');

    await connection.query(`REVOKE INSERT, UPDATE, DELETE ON ${process.env.DB_NAME}.protocol_rules FROM '${process.env.DB_USER}'@'%'`);
    await connection.query(`GRANT SELECT ON ${process.env.DB_NAME}.protocol_rules TO '${process.env.DB_USER}'@'%'`);
    console.log('  -> Permisos de protocol_rules configurados (solo SELECT).');

    await connection.query(`REVOKE UPDATE, DELETE ON ${process.env.DB_NAME}.domi_ledger FROM '${process.env.DB_USER}'@'%'`);
    await connection.query(`GRANT INSERT, SELECT ON ${process.env.DB_NAME}.domi_ledger TO '${process.env.DB_USER}'@'%'`);
    console.log('  -> Permisos de domi_ledger configurados (solo INSERT + SELECT).');

    await connection.query('FLUSH PRIVILEGES');
    console.log('  -> FLUSH PRIVILEGES ejecutado.');
  } catch (permError) {
    console.log('  [AVISO] No se pudieron configurar permisos automaticamente.');
    console.log('  Esto es esperado si el usuario de DB no tiene privilegio GRANT.');
    console.log('  Los permisos deben configurarse manualmente como root de MariaDB.');
    console.log('  Error:', permError.message);
  }

  // ============================================================
  // RESUMEN FINAL
  // ============================================================

  console.log('\n========================================');
  console.log('[DOMI] Migracion completada con exito!');
  console.log('========================================');
  console.log('Tablas creadas:');
  console.log('  CAPA 0: token_registry, protocol_rules');
  console.log('  CAPA 1: wallets');
  console.log('  CAPA 2: domi_packages, domi_ledger');
  console.log('  CAPA 3: orders, order_incidents, rescue_assignments');
  console.log('========================================\n');

  await connection.end();
}

migrate().catch(err => {
  console.error('[DOMI] Error en migracion:', err);
  process.exit(1);
});
