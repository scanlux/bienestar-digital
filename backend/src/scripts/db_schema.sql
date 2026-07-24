CREATE DATABASE IF NOT EXISTS `marketplace_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `marketplace_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- Table: bank_deposits
-- ==========================================
DROP TABLE IF EXISTS `bank_deposits`;
CREATE TABLE `bank_deposits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `amount_cop` decimal(14,2) NOT NULL,
  `status` enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
  `destination_wallet_id` int(11) DEFAULT NULL,
  `evidence_url` varchar(255) NOT NULL,
  `deposit_date` datetime NOT NULL,
  `notes` text DEFAULT NULL,
  `confirmed_by` int(11) DEFAULT NULL,
  `confirmed_at` datetime(6) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `deposit_source` enum('vault','direct','wompi') NOT NULL DEFAULT 'direct',
  `reconciled_vault_amount` decimal(14,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_deposit_wallet` (`destination_wallet_id`),
  KEY `fk_deposit_creator` (`created_by`),
  KEY `fk_deposit_confirmer` (`confirmed_by`),
  CONSTRAINT `fk_deposit_confirmer` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_deposit_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_deposit_wallet` FOREIGN KEY (`destination_wallet_id`) REFERENCES `wallets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: cash_vault_transactions
-- ==========================================
DROP TABLE IF EXISTS `cash_vault_transactions`;
CREATE TABLE `cash_vault_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `amount_cop` decimal(14,2) NOT NULL,
  `tx_type` enum('income','expense','deposit','adjustment') NOT NULL,
  `notes` text DEFAULT NULL,
  `destination_wallet_id` int(11) DEFAULT NULL,
  `bank_deposit_id` int(11) DEFAULT NULL,
  `reconciled_at` datetime(6) DEFAULT NULL,
  `reference_type` enum('order','adjustment','manual','cash_mint') NOT NULL DEFAULT 'manual',
  `reference_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_cash_tx_user` (`created_by`),
  KEY `idx_cvt_deposit` (`bank_deposit_id`),
  KEY `idx_cvt_wallet` (`destination_wallet_id`),
  CONSTRAINT `fk_cash_tx_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_cvt_wallet` FOREIGN KEY (`destination_wallet_id`) REFERENCES `wallets` (`id`),
  CONSTRAINT `fk_cvt_deposit` FOREIGN KEY (`bank_deposit_id`) REFERENCES `bank_deposits` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: categorias
-- ==========================================
DROP TABLE IF EXISTS `categorias`;
CREATE TABLE `categorias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `orden_visual` int(11) DEFAULT 0,
  `disponible` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp(6) NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_categorias_menu` (`menu_id`),
  KEY `idx_categorias_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_categorias_menu` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: commerce_upgrades
-- ==========================================
DROP TABLE IF EXISTS `commerce_upgrades`;
CREATE TABLE `commerce_upgrades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commerce_id` int(11) DEFAULT NULL COMMENT 'Comercio que financia/trazabilidad transaccional',
  `user_id` int(11) NOT NULL COMMENT 'Usuario administrador o cliente/repartidor portador',
  `upgrade_type` varchar(60) NOT NULL,
  `price_domis` decimal(18,4) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_upgrade_commerce_trazabilidad` (`commerce_id`),
  KEY `fk_upgrade_user` (`user_id`),
  KEY `fk_upgrade_catalog_key` (`upgrade_type`),
  CONSTRAINT `fk_upgrade_commerce_trazabilidad` FOREIGN KEY (`commerce_id`) REFERENCES `commerces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_upgrade_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_upgrade_catalog_key` FOREIGN KEY (`upgrade_type`) REFERENCES `upgrade_catalog` (`upgrade_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mejoras y buffs activos con integridad referencial estricta';;

-- ==========================================
-- Table: commerce_video_comments
-- ==========================================
DROP TABLE IF EXISTS `commerce_video_comments`;
CREATE TABLE `commerce_video_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `video_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_comments_video` (`video_id`),
  KEY `fk_comments_user` (`user_id`),
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_video` FOREIGN KEY (`video_id`) REFERENCES `commerce_videos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: commerce_video_likes
-- ==========================================
DROP TABLE IF EXISTS `commerce_video_likes`;
CREATE TABLE `commerce_video_likes` (
  `video_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`video_id`,`user_id`),
  KEY `fk_likes_user` (`user_id`),
  CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_likes_video` FOREIGN KEY (`video_id`) REFERENCES `commerce_videos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: commerce_videos
-- ==========================================
DROP TABLE IF EXISTS `commerce_videos`;
CREATE TABLE `commerce_videos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commerce_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `url_high` varchar(500) DEFAULT NULL,
  `url_low` varchar(500) DEFAULT NULL,
  `url_mid` varchar(500) DEFAULT NULL,
  `status` enum('uploading','active','deleted') NOT NULL DEFAULT 'uploading',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_videos_commerce` (`commerce_id`),
  CONSTRAINT `fk_videos_commerce` FOREIGN KEY (`commerce_id`) REFERENCES `commerces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: commerces
-- ==========================================
DROP TABLE IF EXISTS `commerces`;
CREATE TABLE `commerces` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `nit` varchar(30) NOT NULL,
  `nit_dv` varchar(2) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `type` varchar(20) DEFAULT 'horizontal',
  `open_time` varchar(20) DEFAULT NULL,
  `close_time` varchar(20) DEFAULT NULL,
  `orden` int(11) DEFAULT 0,
  `status` enum('pending','active','rejected') DEFAULT 'pending',
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_brand_name` (`nombre`),
  UNIQUE KEY `uq_commerce_nit` (`nit`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_commerce_user` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: delivery_companies
-- ==========================================
DROP TABLE IF EXISTS `delivery_companies`;
CREATE TABLE `delivery_companies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nit` varchar(50) NOT NULL,
  `razon_social` varchar(255) NOT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  UNIQUE KEY `nit` (`nit`),
  CONSTRAINT `fk_delivery_company_user` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: domi_ledger
-- ==========================================
DROP TABLE IF EXISTS `domi_ledger`;
CREATE TABLE `domi_ledger` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tx_hash` varchar(64) NOT NULL,
  `tx_type` enum('mint','burn_service','service_charge','admin_grant','burn_manual','transfer','refund','cashback','rescue_cashback','exit_fee') NOT NULL,
  `from_wallet_id` int(11) DEFAULT NULL,
  `to_wallet_id` int(11) DEFAULT NULL,
  `amount_domis` decimal(20,8) NOT NULL,
  `amount_fiat_cop` decimal(14,2) DEFAULT NULL,
  `reference_type` enum('order','package','incident','manual') NOT NULL,
  `reference_id` int(11) NOT NULL,
  `protocol_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`protocol_snapshot`)),
  `notes` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `nonce` bigint(20) unsigned NOT NULL DEFAULT 0,
  `prev_tx_hash` varchar(64) DEFAULT NULL,
  `from_owner_type` enum('system','user','store','commerce','delivery_company') DEFAULT NULL,
  `from_owner_id` int(11) DEFAULT NULL,
  `to_owner_type` enum('system','user','store','commerce','delivery_company') DEFAULT NULL,
  `to_owner_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tx_hash` (`tx_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Libro mayor inmutable.';;

-- ==========================================
-- Table: domi_order_debts
-- ==========================================
DROP TABLE IF EXISTS `domi_order_debts`;
CREATE TABLE `domi_order_debts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `customer_user_id` int(11) NOT NULL,
  `beneficiary_type` enum('store','driver','system') NOT NULL,
  `beneficiary_id` int(11) DEFAULT NULL,
  `amount_domis` decimal(20,8) NOT NULL,
  `fiat_peg_at_cancellation` decimal(20,8) NOT NULL,
  `original_service_fee_domis` decimal(20,8) NOT NULL,
  `refunded_service_fee_domis` decimal(20,8) NOT NULL,
  `status` enum('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
  `metadata_json` json DEFAULT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `paid_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_debts_order` (`order_id`),
  KEY `fk_debts_customer` (`customer_user_id`),
  CONSTRAINT `fk_debts_customer` FOREIGN KEY (`customer_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_debts_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: domi_packages
-- ==========================================
DROP TABLE IF EXISTS `domi_packages`;
CREATE TABLE `domi_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) DEFAULT NULL,
  `wallet_id` int(11) NOT NULL,
  `domis_purchased` decimal(20,8) NOT NULL,
  `fiat_paid_cop` decimal(14,2) NOT NULL,
  `exchange_rate` decimal(12,4) NOT NULL,
  `payment_ref` varchar(100) DEFAULT NULL,
  `status` enum('pendiente','confirmado','anulado') NOT NULL DEFAULT 'pendiente',
  `is_confirmed` tinyint(1) NOT NULL DEFAULT 0,
  `bank_deposit_id` int(11) DEFAULT NULL,
  `vault_tx_id` int(11) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `confirmed_at` datetime(6) DEFAULT NULL,
  `confirmed_by` int(11) DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_ref` (`payment_ref`),
  KEY `fk_pkg_store` (`store_id`),
  KEY `fk_pkg_wallet` (`wallet_id`),
  KEY `idx_pkg_deposit` (`bank_deposit_id`),
  KEY `idx_pkg_vault_tx` (`vault_tx_id`),
  CONSTRAINT `fk_pkg_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`),
  CONSTRAINT `fk_pkg_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`),
  CONSTRAINT `fk_pkg_deposit` FOREIGN KEY (`bank_deposit_id`) REFERENCES `bank_deposits` (`id`),
  CONSTRAINT `fk_pkg_vault_tx` FOREIGN KEY (`vault_tx_id`) REFERENCES `cash_vault_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de compras de paquetes DOMI por establecimientos.';;

-- ==========================================
-- Table: domi_peg_history
-- ==========================================
DROP TABLE IF EXISTS `domi_peg_history`;
CREATE TABLE `domi_peg_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `effective_date` date NOT NULL COMMENT 'Fecha desde la cual este peg es valido.',
  `fiat_peg_cop` decimal(20,8) NOT NULL COMMENT 'Valor del DOMI en COP desde esta fecha.',
  `prev_fiat_peg_cop` decimal(20,8) NOT NULL COMMENT 'Valor anterior. Para auditoria y calculo de variacion.',
  `delta_percentage` decimal(8,4) DEFAULT NULL COMMENT 'Variacion porcentual vs el peg anterior. Positivo = apreciacion.',
  `trigger_reason` enum('manual_admin','sobrecolateralizacion','inversion_rendimiento') NOT NULL,
  `basket_inflation_rate` decimal(8,4) DEFAULT NULL COMMENT 'Tasa de inflacion calculada por la canasta que origino el ajuste.',
  `reserve_cop_at_time` decimal(20,2) DEFAULT NULL COMMENT 'Reserva fiduciaria total al momento del ajuste. Prueba de solvencia.',
  `tokens_supply_at_time` decimal(20,8) DEFAULT NULL COMMENT 'Tokens circulantes al momento del ajuste.',
  `approved_by` int(11) DEFAULT NULL COMMENT 'ID del system_user que aprobo el ajuste.',
  `notes` varchar(1000) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `effective_date` (`effective_date`),
  KEY `idx_peg_effective` (`effective_date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial auditado de todos los cambios de valor del token DOMI. Efecto Trinquete incluido.';;

-- ==========================================
-- Table: domi_reserve_alerts
-- ==========================================
DROP TABLE IF EXISTS `domi_reserve_alerts`;
CREATE TABLE `domi_reserve_alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipo` enum('deposito_detectado','acunacion_sin_confirmar','deficit_reserva') NOT NULL,
  `monto_cop` decimal(20,2) DEFAULT NULL,
  `referencia` varchar(200) DEFAULT NULL,
  `status` enum('pendiente','gestionado','descartado') NOT NULL DEFAULT 'pendiente',
  `resolved_by` int(11) DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime(6) DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_alerts_status` (`status`,`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cola de alertas de conciliacion bancaria del ecosistema DOMI.';;

-- ==========================================
-- Table: domi_reserve_declarations
-- ==========================================
DROP TABLE IF EXISTS `domi_reserve_declarations`;
CREATE TABLE `domi_reserve_declarations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reserva_cop` decimal(20,2) NOT NULL COMMENT 'Saldo bancario real en COP. Fuente de verdad del ratio de colateralizacion.',
  `declared_by` int(11) NOT NULL,
  `fecha_declaracion` date NOT NULL,
  `notas` varchar(1000) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_reserve_date` (`fecha_declaracion` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: domi_store_debts
-- ==========================================
DROP TABLE IF EXISTS `domi_store_debts`;
CREATE TABLE `domi_store_debts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `store_id` int(11) NOT NULL,
  `beneficiary_type` enum('driver','system') NOT NULL,
  `beneficiary_id` int(11) NOT NULL,
  `amount_domis` decimal(20,8) NOT NULL,
  `fiat_peg_at_cancellation` decimal(20,8) NOT NULL,
  `status` enum('pending','paid') NOT NULL DEFAULT 'pending',
  `created_at` timestamp(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `paid_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_store_debts_order` (`order_id`),
  KEY `fk_store_debts_store` (`store_id`),
  CONSTRAINT `fk_store_debts_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_store_debts_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Deudas y compensaciones a pagar por las sedes.';;

-- ==========================================
-- Table: domi_tier_rules
-- ==========================================
DROP TABLE IF EXISTS `domi_tier_rules`;
CREATE TABLE `domi_tier_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tier` enum('standard','verified_commerce') NOT NULL,
  `max_balance_domi` decimal(20,8) NOT NULL COMMENT 'Saldo maximo permitido en esta billetera para compra (mint).',
  `min_monthly_tx_domi` decimal(20,8) NOT NULL DEFAULT 0.00000000 COMMENT 'Volumen minimo mensual de transacciones para mantener este tier.',
  `large_withdrawal_threshold_domi` decimal(20,8) NOT NULL COMMENT 'A partir de este monto, el retiro entra en cooldown (Escudo 3).',
  `cooldown_days` tinyint(3) unsigned NOT NULL DEFAULT 0 COMMENT 'Dias de cooldown para retiros grandes.',
  `free_withdrawals_per_month` tinyint(3) unsigned NOT NULL DEFAULT 1 COMMENT 'Cantidad de retiros gratis al mes calendario.',
  `withdrawal_fee_cop` decimal(20,2) NOT NULL DEFAULT 2000.00 COMMENT 'Costo fijo a cobrar por retiro excedente en COP.',
  `daily_withdrawal_limit_cop` decimal(20,2) NOT NULL DEFAULT 2000000.00 COMMENT 'Limite maximo de retiro diario en COP acumulado.',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tier` (`tier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: domi_withdrawal_log
-- ==========================================
DROP TABLE IF EXISTS `domi_withdrawal_log`;
CREATE TABLE `domi_withdrawal_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallet_id` int(11) NOT NULL,
  `amount_domis` decimal(18,4) NOT NULL,
  `amount_cop` decimal(14,2) NOT NULL,
  `peg_at_withdrawal` decimal(12,4) NOT NULL COMMENT 'Peg vigente en el momento del retiro (snapshot)',
  `fee_cop` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Comision cobrada si supero el cupo gratuito',
  `fee_domis` decimal(10,4) NOT NULL DEFAULT 0.0000,
  `is_free` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = retiro gratuito del mes, 0 = retiro de pago',
  `periodo_mes` char(7) NOT NULL COMMENT 'YYYY-MM del mes al que corresponde este retiro',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_withdrawal_wallet_periodo` (`wallet_id`,`periodo_mes`),
  CONSTRAINT `fk_withdrawal_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de retiros para control del cupo gratuito mensual por billetera';;

-- ==========================================
-- Table: domi_withdrawal_requests
-- ==========================================
DROP TABLE IF EXISTS `domi_withdrawal_requests`;
CREATE TABLE `domi_withdrawal_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallet_id` int(11) NOT NULL,
  `amount_domis` decimal(20,8) NOT NULL,
  `amount_cop` decimal(20,2) NOT NULL COMMENT 'Valor en COP al momento de la solicitud, con exit_fee ya descontada.',
  `exit_fee_rate` decimal(6,4) NOT NULL COMMENT 'Tasa de comision de salida aplicada. Fija al momento de solicitud.',
  `exit_fee_domis` decimal(20,8) NOT NULL COMMENT 'DOMIs cobrados como comision de salida. Quemados al sistema.',
  `status` enum('pendiente','en_cooldown','aprobado','rechazado','completado') NOT NULL DEFAULT 'pendiente',
  `cooldown_until` datetime DEFAULT NULL COMMENT 'Retiros grandes quedan congelados hasta esta fecha (Escudo 3).',
  `requested_by` int(11) NOT NULL COMMENT 'usuario_id o wallet owner que solicito el retiro.',
  `approved_by` int(11) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime(6) DEFAULT current_timestamp(6),
  `dispersion_method` enum('efectivo_casa_matriz','wompi_bancolombia','wompi_nequi','wompi_daviplata','wompi_pse') DEFAULT NULL,
  `withdrawal_account_id` int(11) DEFAULT NULL,
  `wompi_dispersion_id` varchar(100) DEFAULT NULL COMMENT 'ID de la transaccion retornado por Wompi Dispersiones API.',
  `wompi_fee_cop` decimal(20,2) DEFAULT NULL,
  `wompi_fee_domi` decimal(20,8) DEFAULT NULL COMMENT 'Fee de Wompi convertido a DOMI al peg vigente. Ya incluido en el total debitado.',
  PRIMARY KEY (`id`),
  KEY `fk_wr_wallet` (`wallet_id`),
  KEY `fk_dwr_account` (`withdrawal_account_id`),
  CONSTRAINT `fk_dwr_account` FOREIGN KEY (`withdrawal_account_id`) REFERENCES `withdrawal_accounts` (`id`),
  CONSTRAINT `fk_wr_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cola de retiros fiduciarios. Implementa el Escudo 3 de cooldown del Manifiesto.';;

-- ==========================================
-- Table: email_templates
-- ==========================================
DROP TABLE IF EXISTS `email_templates`;
CREATE TABLE `email_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Slug unico: invitation, support_ticket, etc.',
  `label` varchar(200) NOT NULL COMMENT 'Nombre legible para el panel',
  `category` varchar(100) NOT NULL DEFAULT 'general' COMMENT 'affiliations, support, alerts, reports, system',
  `subject` varchar(500) NOT NULL COMMENT 'Asunto del correo',
  `html_body` longtext NOT NULL COMMENT 'HTML con variables {{variable}}',
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Variables disponibles. Ej: [{"key":"razon_social","desc":"Nombre empresa"}]' CHECK (json_valid(`variables`)),
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = no se puede eliminar',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: influencer_reels
-- ==========================================
DROP TABLE IF EXISTS `influencer_reels`;
CREATE TABLE `influencer_reels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commerce_id` int(11) NOT NULL,
  `video_url` varchar(255) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_reels_commerce` (`commerce_id`),
  CONSTRAINT `fk_reels_commerce` FOREIGN KEY (`commerce_id`) REFERENCES `commerces` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Videos tipo reels asociados al Estatus de Influencer';;

-- ==========================================
-- Table: ingredients
-- ==========================================
DROP TABLE IF EXISTS `ingredients`;
CREATE TABLE `ingredients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `es_alergeno` tinyint(1) DEFAULT 0,
  `created_at` timestamp(6) NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: maintenance_bypass_rules
-- ==========================================
DROP TABLE IF EXISTS `maintenance_bypass_rules`;
CREATE TABLE `maintenance_bypass_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `pattern` varchar(255) NOT NULL COMMENT 'Patrón de URL o prefijo de API (Ej: /api/auth/login, /login, /)',
  `type` enum('api','page') NOT NULL DEFAULT 'api' COMMENT 'Tipo de recurso (API de backend o página del frontend)',
  `description` varchar(255) DEFAULT NULL COMMENT 'Descripción del propósito del bypass.',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = regla critica del sistema, no eliminable desde el panel',
  PRIMARY KEY (`id`),
  UNIQUE KEY `pattern` (`pattern`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- ==========================================
-- Table: menus
-- ==========================================
DROP TABLE IF EXISTS `menus`;
CREATE TABLE `menus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `orden` int(11) DEFAULT 0,
  `disponible` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_menus_store` (`store_id`),
  KEY `idx_menus_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_menus_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: order_incidents
-- ==========================================
DROP TABLE IF EXISTS `order_incidents`;
CREATE TABLE `order_incidents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `reported_by_user_id` int(11) NOT NULL,
  `incident_phase` enum('pre_pickup','post_pickup') NOT NULL,
  `reason` varchar(255) NOT NULL,
  `status` enum('abierta','en_rescate','resuelta','cerrada') NOT NULL DEFAULT 'abierta',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `resolved_at` datetime(6) DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_inc_order` (`order_id`),
  CONSTRAINT `fk_inc_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de incidencias por pedido.';;

-- ==========================================
-- Table: order_items
-- ==========================================
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `price` decimal(14,2) DEFAULT NULL,
  `product_name_snapshot` varchar(255) DEFAULT NULL,
  `product_image_snapshot` varchar(500) DEFAULT NULL,
  `prep_time_snapshot` int(11) DEFAULT NULL,
  `categoria_nombre_snapshot` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: order_messages
-- ==========================================
DROP TABLE IF EXISTS `order_messages`;
CREATE TABLE `order_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `sender_type` enum('bot','store','customer') NOT NULL DEFAULT 'bot',
  `sender_user_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `message_type` enum('text','menu_link','product_suggestion','system') NOT NULL DEFAULT 'text',
  `extra_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Para enlaces, alternativas de productos, etc.' CHECK (json_valid(`extra_data`)),
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_order_msg_order_id` (`order_id`),
  CONSTRAINT `fk_order_msg_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: order_offer_rejections
-- ==========================================
DROP TABLE IF EXISTS `order_offer_rejections`;
CREATE TABLE `order_offer_rejections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `driver_id` int(11) NOT NULL,
  `rejected_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_driver_rejection` (`order_id`,`driver_id`),
  KEY `fk_rejections_driver` (`driver_id`),
  CONSTRAINT `fk_rejections_driver` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rejections_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: order_groups
-- ==========================================
DROP TABLE IF EXISTS `order_groups`;
CREATE TABLE `order_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_user_id` int(11) NOT NULL,
  `total_amount_cop` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total_domi_cost` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `driver_deposit_status` enum('no_deposit','pending','paid','expired') NOT NULL DEFAULT 'no_deposit',
  `driver_deposit_grace_expiry` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_order_group_customer` (`customer_user_id`),
  CONSTRAINT `fk_order_group_customer` FOREIGN KEY (`customer_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agrupador de sub-ordenes multi-sede.';;

-- ==========================================
-- Table: orders
-- ==========================================
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `customer_user_id` int(11) NOT NULL,
  `driver_user_id` int(11) DEFAULT NULL,
  `group_order_id` int(11) DEFAULT NULL,
  `total_cop` decimal(14,2) NOT NULL DEFAULT 0.00,
  `domi_cost` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `driver_domi_cost` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `payment_method_customer` enum('domi','cash_cod') NOT NULL DEFAULT 'domi',
  `store_cost_cop_snapshot` decimal(20,2) DEFAULT NULL,
  `driver_cost_domi_snapshot` decimal(20,8) DEFAULT NULL,
  `fiat_peg_snapshot` decimal(20,8) DEFAULT NULL,
  `store_commission_refund_rate_snapshot` decimal(8,6) DEFAULT NULL,
  `driver_commission_refund_rate_snapshot` decimal(8,6) DEFAULT NULL,
  `driver_commission_refund_transit_rate_snapshot` decimal(8,6) DEFAULT NULL,
  `rescue_driver_id` int(11) DEFAULT NULL,
  `rescue_attempt_count` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `rescue_started_at` datetime(6) DEFAULT NULL,
  `driver_rescue_commission_refund_rate_snapshot` decimal(5,4) NOT NULL DEFAULT 0.7000,
  `driver_rescue_timeout_minutes_snapshot` int(11) NOT NULL DEFAULT 30,
  `driver_rescue_max_attempts_snapshot` int(11) NOT NULL DEFAULT 3,
  `driver_penalty_points_rescue_original_snapshot` int(11) NOT NULL DEFAULT 2,
  `driver_rescue_chain_penalty_points_snapshot` int(11) NOT NULL DEFAULT 1,
  `minimum_delivery_rate_snapshot` decimal(10,2) NOT NULL DEFAULT 3000.00,
  `store_solvency_delivery_multiplier_snapshot` int(11) NOT NULL DEFAULT 3,
  `solvency_commission_guarantee_fraction_snapshot` decimal(5,4) NOT NULL DEFAULT 0.5000,
  `store_cancel_client_indemnity_domi_amount_snapshot` decimal(10,4) NOT NULL DEFAULT 0.2500,
  `store_penalty_points_prep_snapshot` int(11) NOT NULL DEFAULT 1,
  `store_penalty_points_dispatch_snapshot` int(11) NOT NULL DEFAULT 2,
  `driver_penalty_points_prep_snapshot` int(11) NOT NULL DEFAULT 1,
  `driver_penalty_points_dispatch_snapshot` int(11) NOT NULL DEFAULT 2,
  `driver_penalty_points_transit_snapshot` int(11) NOT NULL DEFAULT 3,
  `store_cancel_driver_delivery_pct_rate_snapshot` decimal(5,4) NOT NULL DEFAULT 0.5000,
  `store_cancel_client_indemnity_rate_snapshot` decimal(5,4) NOT NULL DEFAULT 0.2500,
  `customer_cancel_driver_delivery_pct_dispatch_rate_snapshot` decimal(5,4) NOT NULL DEFAULT 0.5000,
  `score_penalty_cash_cancel_accepted_snapshot` int(11) NOT NULL DEFAULT 40,
  `score_penalty_cash_cancel_dispatch_snapshot` int(11) NOT NULL DEFAULT 50,
  `score_penalty_cash_cancel_in_transit_snapshot` int(11) NOT NULL DEFAULT 60,
  `score_penalty_domi_cancel_accepted_snapshot` int(11) NOT NULL DEFAULT 1,
  `score_penalty_domi_cancel_dispatch_snapshot` int(11) NOT NULL DEFAULT 2,
  `score_penalty_domi_cancel_in_transit_snapshot` int(11) NOT NULL DEFAULT 4,
  `driver_commission_refund_on_store_cancel_rate_snapshot` decimal(5,4) NOT NULL DEFAULT 0.9000,
  `platform_processing_fee_rate_snapshot` decimal(5,4) NOT NULL DEFAULT 0.0040,
  `products_domi_cost_snapshot` decimal(20,8) DEFAULT NULL,
  `store_commission_advance` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `driver_commission_advance` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `distance_km` decimal(6,2) DEFAULT NULL COMMENT 'Distancia en km usada para calcular la tarifa de domicilio. NULL = no disponible.',
  `estimated_prep_time_minutes` int(11) DEFAULT 0,
  `preparation_started_at` datetime(6) DEFAULT NULL,
  `delivery_company_id` int(11) DEFAULT NULL,
  `delivery_company_commission_paid` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('pendiente','aceptado','preparando','listo','listo_despacho','en_camino','entregado','cancelado','en_rescate') NOT NULL DEFAULT 'pendiente',
  `delivery_address` text DEFAULT NULL,
  `delivery_lat` decimal(10,7) DEFAULT NULL,
  `delivery_lng` decimal(10,7) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `accepted_at` datetime(6) DEFAULT NULL,
  `current_offer_driver_id` int(11) DEFAULT NULL,
  `offer_sent_at` datetime(6) DEFAULT NULL,
  `store_rejection_notes` text DEFAULT NULL,
  `picked_up_at` datetime(6) DEFAULT NULL,
  `delivered_at` datetime(6) DEFAULT NULL,
  `cancelled_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_store` (`store_id`),
  KEY `fk_order_customer` (`customer_user_id`),
  KEY `fk_order_driver` (`driver_user_id`),
  KEY `idx_orders_delivery_company` (`delivery_company_id`),
  KEY `fk_orders_current_offer_driver` (`current_offer_driver_id`),
  KEY `fk_orders_group` (`group_order_id`),
  CONSTRAINT `fk_order_customer` FOREIGN KEY (`customer_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_order_delivery_company` FOREIGN KEY (`delivery_company_id`) REFERENCES `delivery_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_driver` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_order_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`),
  CONSTRAINT `fk_orders_current_offer_driver` FOREIGN KEY (`current_offer_driver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_group` FOREIGN KEY (`group_order_id`) REFERENCES `order_groups` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pedidos del marketplace.';;

-- ==========================================
-- Table: payment_platforms
-- ==========================================
DROP TABLE IF EXISTS `payment_platforms`;
CREATE TABLE `payment_platforms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo_entidad` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: permission_categories
-- ==========================================
DROP TABLE IF EXISTS `permission_categories`;
CREATE TABLE `permission_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: permission_endpoints
-- ==========================================
DROP TABLE IF EXISTS `permission_endpoints`;
CREATE TABLE `permission_endpoints` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `permission_id` int(11) NOT NULL,
  `method_path` varchar(255) NOT NULL COMMENT 'Ej: GET /api/management/commerces',
  PRIMARY KEY (`id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `permission_endpoints_ibfk_1` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- ==========================================
-- Table: permission_impacted_tables
-- ==========================================
DROP TABLE IF EXISTS `permission_impacted_tables`;
CREATE TABLE `permission_impacted_tables` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `permission_id` int(11) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `permission_impacted_tables_ibfk_1` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- ==========================================
-- Table: permissions
-- ==========================================
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `display_name` varchar(150) DEFAULT NULL,
  `criticidad` enum('Baja','Media','Alta','Crítica') NOT NULL DEFAULT 'Media',
  `tipo` enum('Lectura','Escritura') NOT NULL DEFAULT 'Escritura',
  `scope` text DEFAULT NULL,
  `ui_restriction_mode` enum('ghost','hidden','disabled') NOT NULL DEFAULT 'hidden' COMMENT 'ghost=overlay bloqueado, hidden=no renderizar, disabled=input readonly',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `fk_permission_category` (`category_id`),
  CONSTRAINT `fk_permission_category` FOREIGN KEY (`category_id`) REFERENCES `permission_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: system_navigation
-- ==========================================
DROP TABLE IF EXISTS `system_navigation`;
CREATE TABLE `system_navigation` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `parent_id` INT(11) DEFAULT NULL COMMENT 'Para grupos de submenú (ej: Afiliaciones, Caja)',
  `label` VARCHAR(80) NOT NULL COMMENT 'Texto visible en el sidebar',
  `page_title` VARCHAR(150) DEFAULT NULL COMMENT 'Texto del banner H1 de la página. NULL = usa el label',
  `path` VARCHAR(200) DEFAULT NULL COMMENT 'Ruta Next.js. NULL si es solo un grupo visual. :storeId como parámetro dinámico',
  `icon` TEXT DEFAULT NULL COMMENT 'SVG path literal del icono',
  `required_permission` VARCHAR(80) DEFAULT NULL COMMENT 'FK a permissions.name. Obligatorio en todos los ítems navegables',
  `order_index` INT(11) NOT NULL DEFAULT 0 COMMENT 'Orden ascendente',
  `layout_scope` ENUM('admin','commerce','store','delivery') NOT NULL,
  `risk_level` ENUM('normal','high','critical') NOT NULL DEFAULT 'normal',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = protegido: no puede eliminarse desde el panel visual',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`required_permission`) REFERENCES `permissions` (`name`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`parent_id`) REFERENCES `system_navigation` (`id`) ON DELETE CASCADE,
  KEY `idx_scope_order` (`layout_scope`, `order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: product_images
-- ==========================================
DROP TABLE IF EXISTS `product_images`;
CREATE TABLE `product_images` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `url` text NOT NULL,
  `tipo` enum('thumbnail','hero_horizontal','hero_vertical','detalle') DEFAULT 'detalle',
  `orden_visual` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: product_ingredients
-- ==========================================
DROP TABLE IF EXISTS `product_ingredients`;
CREATE TABLE `product_ingredients` (
  `product_id` int(11) NOT NULL,
  `ingredient_id` int(11) NOT NULL,
  `created_at` timestamp(6) NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`product_id`,`ingredient_id`),
  KEY `ingredient_id` (`ingredient_id`),
  CONSTRAINT `product_ingredients_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_ingredients_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: product_popularity
-- ==========================================
DROP TABLE IF EXISTS `product_popularity`;
CREATE TABLE `product_popularity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) DEFAULT NULL,
  `sales_count` int(11) DEFAULT 0,
  `last_update` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  CONSTRAINT `product_popularity_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: products
-- ==========================================
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion_larga` text DEFAULT NULL,
  `precio_base` decimal(10,2) NOT NULL,
  `tiempo_prep_estimado` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `menu_id` int(11) DEFAULT NULL,
  `categoria_id` int(11) DEFAULT NULL,
  `disponible` tinyint(1) DEFAULT 1,
  `es_vegetariano` tinyint(1) DEFAULT 0,
  `image_url` varchar(255) DEFAULT NULL,
  `tags` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_product_name` (`store_id`,`nombre`),
  KEY `fk_menu` (`menu_id`),
  KEY `fk_category` (`categoria_id`),
  KEY `idx_products_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_category` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_menu` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_products_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: profiles
-- ==========================================
DROP TABLE IF EXISTS `profiles`;
CREATE TABLE `profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) DEFAULT NULL,
  `cedula` varchar(20) NOT NULL,
  `url_cedula` text DEFAULT NULL,
  `telefono` varchar(20) NOT NULL,
  `delivery_company_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `cedula` (`cedula`),
  UNIQUE KEY `telefono` (`telefono`),
  UNIQUE KEY `uq_profile_user` (`usuario_id`),
  KEY `fk_profile_delivery_company` (`delivery_company_id`),
  CONSTRAINT `fk_profile_delivery_company` FOREIGN KEY (`delivery_company_id`) REFERENCES `delivery_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_profile_user` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: protocol_rules
-- ==========================================
DROP TABLE IF EXISTS `protocol_rules`;
CREATE TABLE `protocol_rules` (
  `id` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `threshold_fiat_cop` decimal(12,2) NOT NULL DEFAULT 50000.00,
  `base_cost_domis` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `percentage_rate` decimal(8,6) NOT NULL DEFAULT 0.010000,
  `retention_penalty_rate` decimal(8,6) NOT NULL DEFAULT 0.300000,
  `refund_standard_rate` decimal(8,6) NOT NULL DEFAULT 0.700000,
  `rescue_cashback_rate` decimal(8,6) NOT NULL DEFAULT 0.300000,
  `store_fixed_fee_cop` decimal(20,2) NOT NULL DEFAULT 400.00,
  `driver_fixed_fee_domi` decimal(20,8) NOT NULL DEFAULT 300.00000000,
  `cashback_rate_customer` decimal(6,4) NOT NULL DEFAULT 0.0100,
  `score_min_for_cashback` tinyint(4) NOT NULL DEFAULT 0,
  `max_monthly_yield_pct` decimal(6,4) NOT NULL DEFAULT 0.5000,
  `cash_mint_expiry_days` tinyint(4) NOT NULL DEFAULT 5,
  `min_domi_balance_driver` decimal(20,8) NOT NULL DEFAULT 600.00000000,
  `cod_capital_min_cop` decimal(20,2) NOT NULL DEFAULT 50000.00,
  `driver_fixed_fee_cop` decimal(12,2) NOT NULL DEFAULT 300.00,
  `delivery_base_fare_cop` decimal(10,2) NOT NULL DEFAULT 3100.00,
  `delivery_base_distance_km` decimal(6,2) NOT NULL DEFAULT 3.00,
  `delivery_extra_rate_cop_per_km` decimal(10,2) NOT NULL DEFAULT 400.00,
  `delivery_max_distance_km` decimal(6,2) NOT NULL DEFAULT 9.00,
  `max_balance_cop` decimal(14,2) NOT NULL DEFAULT 2000000.00,
  `free_withdrawals_per_month` int(10) unsigned NOT NULL DEFAULT 1,
  `withdrawal_fee_cop` decimal(12,2) NOT NULL DEFAULT 2000.00,
  `score_cashback_win_base` decimal(8,6) NOT NULL DEFAULT 0.100000,
  `min_collateral_ratio_post_adjust` decimal(8,4) NOT NULL DEFAULT 105.0000,
  `store_subscription_fee_domi` decimal(10,4) NOT NULL DEFAULT 50.0000,
  `commerce_subscription_fee_domi` decimal(10,4) NOT NULL DEFAULT 100.0000,
  `wompi_min_purchase_cop` int(11) NOT NULL DEFAULT 1500,
  `score_earned_on_purchase` int(11) NOT NULL DEFAULT 5,
  `score_earned_on_domi_purchase` int(11) NOT NULL DEFAULT 5,
  `score_penalty_domi_cancel_accepted` int(11) NOT NULL DEFAULT 1,
  `score_penalty_domi_cancel_in_transit` int(11) NOT NULL DEFAULT 4,
  `score_penalty_domi_cancel_dispatch` int(11) NOT NULL DEFAULT 2,
  `score_penalty_cash_cancel_accepted` int(11) NOT NULL DEFAULT 40,
  `score_penalty_cash_cancel_in_transit` int(11) NOT NULL DEFAULT 60,
  `score_penalty_cash_cancel_dispatch` int(11) NOT NULL DEFAULT 50,
  `driver_cancellation_compensation_rate` decimal(8,6) NOT NULL DEFAULT 0.500000,
  `driver_cancel_pre_pickup_refund_rate` decimal(8,6) NOT NULL DEFAULT 0.300000,
  `driver_cancel_post_pickup_penalty_rate` decimal(8,6) NOT NULL DEFAULT 1.000000,
  `customer_cancel_store_refund_prep_rate` decimal(8,6) NOT NULL DEFAULT 0.900000,
  `customer_cancel_client_refund_prep_rate` decimal(8,6) NOT NULL DEFAULT 0.040000,
  `customer_cancel_sys_retain_prep_rate` decimal(8,6) NOT NULL DEFAULT 0.060000,
  `customer_cancel_driver_commission_refund_transit_rate` decimal(8,6) NOT NULL DEFAULT 0.750000,
  `customer_cancel_store_commission_refund_dispatch_rate` decimal(8,6) NOT NULL DEFAULT 0.750000,
  `customer_cancel_driver_commission_refund_dispatch_rate` decimal(8,6) NOT NULL DEFAULT 0.900000,
  `customer_cancel_driver_delivery_pct_dispatch` decimal(8,6) NOT NULL DEFAULT 0.500000,
  `platform_processing_fee_rate` decimal(8,6) NOT NULL DEFAULT 0.004000,
  `driver_rescue_commission_refund_rate` decimal(8,6) NOT NULL DEFAULT 0.700000,
  `driver_rescue_timeout_minutes` int(11) NOT NULL DEFAULT 30,
  `driver_rescue_max_attempts` int(11) NOT NULL DEFAULT 3,
  `driver_penalty_points_rescue_original` int(11) NOT NULL DEFAULT 2,
  `driver_rescue_chain_penalty_points` int(11) NOT NULL DEFAULT 1,
  `minimum_delivery_rate` decimal(10,2) NOT NULL DEFAULT 3000.00,
  `store_solvency_delivery_multiplier` int(11) NOT NULL DEFAULT 3,
  `solvency_commission_guarantee_fraction` decimal(8,6) NOT NULL DEFAULT 0.500000,
  `store_cancel_client_indemnity_domi_amount` decimal(10,4) NOT NULL DEFAULT 0.2500,
  `store_penalty_points_prep` int(11) NOT NULL DEFAULT 1,
  `store_penalty_points_dispatch` int(11) NOT NULL DEFAULT 2,
  `driver_penalty_points_prep` int(11) NOT NULL DEFAULT 1,
  `driver_penalty_points_dispatch` int(11) NOT NULL DEFAULT 2,
  `driver_penalty_points_transit` int(11) NOT NULL DEFAULT 3,
  `store_cancel_driver_delivery_pct_rate` decimal(8,6) NOT NULL DEFAULT 0.500000,
  `store_cancel_client_indemnity_rate` decimal(8,6) NOT NULL DEFAULT 0.250000,
  `customer_cancel_driver_delivery_pct_dispatch_rate` decimal(8,6) NOT NULL DEFAULT 0.500000,
  `driver_commission_refund_on_store_cancel_rate` decimal(8,6) NOT NULL DEFAULT 0.900000,
  `block_meters` int(11) NOT NULL DEFAULT 100,
  `cash_income_pin_threshold_cop` decimal(12,2) NOT NULL DEFAULT 500000.00,
  `effective_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_singleton_rules` CHECK (`id` = 1),
  CONSTRAINT `chk_rates_sum` CHECK (`retention_penalty_rate` + `refund_standard_rate` = 1.000000),
  CONSTRAINT `chk_cust_cancel_prep_sum` CHECK (`customer_cancel_store_refund_prep_rate` + `customer_cancel_client_refund_prep_rate` + `customer_cancel_sys_retain_prep_rate` = 1.000000),
  CONSTRAINT `chk_cust_cancel_delivery_pct_dispatch` CHECK (`customer_cancel_driver_delivery_pct_dispatch` BETWEEN 0.000000 AND 1.000000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Parametros financieros del protocolo. READ-ONLY para la app.';;

-- ==========================================
-- Table: protocol_rules_metadata
-- ==========================================
DROP TABLE IF EXISTS `protocol_rules_metadata`;
CREATE TABLE `protocol_rules_metadata` (
  `param_key` varchar(100) NOT NULL,
  `label` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `actor` varchar(100) NOT NULL,
  `initiator` varchar(100) NOT NULL DEFAULT 'Sistema',
  `flow_trigger` varchar(200) NOT NULL,
  `applicable_states` varchar(255) NOT NULL,
  `payment_methods` varchar(50) NOT NULL DEFAULT 'Ambos',
  `formula_hint` varchar(300) DEFAULT NULL,
  `impact_note` text DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`param_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Metadatos descriptivos de los parametros de reglas del protocolo';;


-- ==========================================
-- Table: protocol_rules_history
-- ==========================================
DROP TABLE IF EXISTS `protocol_rules_history`;
CREATE TABLE `protocol_rules_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `original_rule_id` int(11) NOT NULL DEFAULT 1,
  `snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copia completa de protocol_rules + token_registry en ese momento.' CHECK (json_valid(`snapshot`)),
  `changed_by` int(11) DEFAULT NULL COMMENT 'ID del system_user que autorizo el cambio.',
  `change_reason` varchar(500) DEFAULT NULL,
  `effective_from` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_prh_effective` (`effective_from` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial inmutable de cambios de protocolo. Auditoria del tipo de cambio con snapshot.';;

-- ==========================================
-- Table: redis_sync_queue
-- ==========================================
DROP TABLE IF EXISTS `redis_sync_queue`;
CREATE TABLE `redis_sync_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_type` enum('system','user','store','commerce','delivery_company') NOT NULL,
  `owner_id` int(11) NOT NULL,
  `delta` decimal(18,4) NOT NULL,
  `reason` varchar(100) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT 0,
  `created_at` datetime(6) DEFAULT current_timestamp(6),
  `processed_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- ==========================================
-- Table: registration_requests
-- ==========================================
DROP TABLE IF EXISTS `registration_requests`;
CREATE TABLE `registration_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_solicitud` enum('commerce','delivery_company') NOT NULL,
  `nit` varchar(50) NOT NULL,
  `razon_social` varchar(255) NOT NULL,
  `email_contacto` varchar(255) NOT NULL,
  `nombres_contacto` varchar(100) NOT NULL,
  `apellidos_contacto` varchar(100) NOT NULL,
  `celular_contacto` varchar(20) NOT NULL,
  `estado` enum('pendiente','aprobado','rechazado','espera_informacion') DEFAULT 'pendiente',
  `notas_system` text DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `documento_camara_comercio` text DEFAULT NULL,
  `documento_rut` text DEFAULT NULL,
  `documento_cedula` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `documento_cedula_frente` text DEFAULT NULL,
  `documento_cedula_dorso` text DEFAULT NULL,
  `nit_dv` varchar(2) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `verified_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Campos y documentos verificados por el auditor' CHECK (json_valid(`verified_fields`)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nit` (`nit`),
  UNIQUE KEY `email_contacto` (`email_contacto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: rescue_assignments
-- ==========================================
DROP TABLE IF EXISTS `rescue_assignments`;
CREATE TABLE `rescue_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `incident_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `original_driver_id` int(11) NOT NULL,
  `rescue_driver_id` int(11) DEFAULT NULL,
  `original_commission` decimal(18,4) NOT NULL,
  `rescuer_commission` decimal(18,4) DEFAULT NULL,
  `status` enum('buscando_rescatista','en_camino','entregado','fallido') NOT NULL DEFAULT 'buscando_rescatista',
  `cashback_paid` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `completed_at` datetime(6) DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `incident_id` (`incident_id`),
  CONSTRAINT `fk_rescue_incident` FOREIGN KEY (`incident_id`) REFERENCES `order_incidents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Asignaciones de rescate a repartidores suplentes.';;

-- ==========================================
-- Table: role_permissions
-- ==========================================
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_rp_permission` (`permission_id`),
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: roles
-- ==========================================
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: security_audit_logs
-- ==========================================
DROP TABLE IF EXISTS `security_audit_logs`;
CREATE TABLE `security_audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `actor_type` enum('user','system_user','operator') DEFAULT 'user',
  `actor_id` int(11) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `severity` varchar(20) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `resource_type` enum('user','system_user','operator','store','commerce','delivery_company','order','package','incident','wallet','permission','role','upgrade_catalog','email_template','maintenance','request','system') DEFAULT NULL,
  `resource_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sal_event_type` (`event_type`),
  KEY `idx_sal_severity` (`severity`),
  KEY `idx_sal_actor` (`actor_type`,`actor_id`),
  KEY `idx_sal_resource` (`resource_type`,`resource_id`),
  KEY `idx_sal_created_at` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: stop_words
-- ==========================================
DROP TABLE IF EXISTS `stop_words`;
CREATE TABLE `stop_words` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `word` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `word` (`word`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: store_accounts
-- ==========================================
DROP TABLE IF EXISTS `store_accounts`;
CREATE TABLE `store_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `platform_id` int(11) DEFAULT NULL,
  `tipo_cuenta` varchar(50) DEFAULT 'Ahorros',
  `numero_cuenta` varchar(100) NOT NULL,
  `llave` varchar(100) DEFAULT NULL,
  `titular_nombre` varchar(150) DEFAULT NULL,
  `titular_documento` bigint(20) DEFAULT NULL,
  `detalle` varchar(255) DEFAULT NULL,
  `vencimiento_tarjeta` varchar(10) DEFAULT NULL,
  `es_principal` tinyint(1) DEFAULT 0,
  `created_at` timestamp(6) NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `store_id` (`store_id`),
  KEY `fk_sa_platform` (`platform_id`),
  CONSTRAINT `fk_sa_platform` FOREIGN KEY (`platform_id`) REFERENCES `payment_platforms` (`id`) ON DELETE SET NULL,
  CONSTRAINT `store_accounts_ibfk_1` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: store_operating_hours
-- ==========================================
DROP TABLE IF EXISTS `store_operating_hours`;
CREATE TABLE `store_operating_hours` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `day_index` int(11) NOT NULL COMMENT '0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab',
  `status` enum('abierto','cerrado','vacaciones') DEFAULT 'abierto',
  `open_time` time DEFAULT '08:00:00',
  `close_time` time DEFAULT '20:00:00',
  `is_24h` tinyint(1) DEFAULT 0,
  `created_at` timestamp(6) NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_store_day` (`store_id`,`day_index`),
  CONSTRAINT `store_operating_hours_ibfk_1` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- ==========================================
-- Table: store_operators
-- ==========================================
DROP TABLE IF EXISTS `store_operators`;
CREATE TABLE `store_operators` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `celular` varchar(20) DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `celular` (`celular`),
  KEY `fk_operator_store` (`store_id`),
  CONSTRAINT `fk_operator_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: stores
-- ==========================================
DROP TABLE IF EXISTS `stores`;
CREATE TABLE `stores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commerce_id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `nombre_sucursal` varchar(100) DEFAULT NULL,
  `matricula` varchar(50) DEFAULT NULL,
  `contacto_directo` varchar(255) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `telefono_domicilio` varchar(50) DEFAULT NULL,
  `direccion` varchar(255) NOT NULL,
  `latitud` decimal(10,8) DEFAULT NULL,
  `longitud` decimal(11,8) DEFAULT NULL,
  `horario_atencion` varchar(255) DEFAULT NULL,
  `estado` enum('operativo','mantenimiento','vacaciones','no_disponible','remodelacion') DEFAULT 'no_disponible',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `image_url` varchar(500) DEFAULT NULL,
  `open_time` time DEFAULT NULL,
  `close_time` time DEFAULT NULL,
  `is_24h` tinyint(1) DEFAULT 0,
  `fecha_regreso` date DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `acceptance_mode` enum('automatico','manual') NOT NULL DEFAULT 'automatico',
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  UNIQUE KEY `matricula` (`matricula`),
  KEY `brand_id` (`commerce_id`),
  CONSTRAINT `fk_store_user` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`),
  CONSTRAINT `stores_ibfk_1` FOREIGN KEY (`commerce_id`) REFERENCES `commerces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: system_financial_flags
-- ==========================================
DROP TABLE IF EXISTS `system_financial_flags`;
CREATE TABLE `system_financial_flags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(50) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `label` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;;

-- ==========================================
-- Table: system_parameters
-- ==========================================
DROP TABLE IF EXISTS `system_parameters`;
CREATE TABLE `system_parameters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(80) NOT NULL,
  `value` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL DEFAULT '',
  `category` varchar(60) NOT NULL DEFAULT 'general',
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: system_users
-- ==========================================
DROP TABLE IF EXISTS `system_users`;
CREATE TABLE `system_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `nivel` enum('root','system') NOT NULL DEFAULT 'system',
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `password_locked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: token_registry
-- ==========================================
DROP TABLE IF EXISTS `token_registry`;
CREATE TABLE `token_registry` (
  `id` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `symbol` varchar(10) NOT NULL DEFAULT 'DOMI',
  `name` varchar(100) NOT NULL DEFAULT 'DomiToken',
  `decimals` tinyint(3) unsigned NOT NULL DEFAULT 2,
  `fiat_peg_cop` decimal(12,4) NOT NULL DEFAULT 400.0000,
  `protocol_version` varchar(20) NOT NULL DEFAULT '1.0.0',
  `integrity_hash` varchar(64) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_singleton` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro maestro del token DOMI. READ-ONLY para la app.';;

-- ==========================================
-- Table: upgrade_catalog
-- ==========================================
DROP TABLE IF EXISTS `upgrade_catalog`;
CREATE TABLE `upgrade_catalog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `upgrade_key` varchar(60) NOT NULL COMMENT 'Clave tecnica que referencia upgrade_type en commerce_upgrades',
  `label` varchar(120) NOT NULL COMMENT 'Nombre legible para mostrar en UI',
  `description` text NOT NULL COMMENT 'Descripcion del beneficio que otorga esta mejora',
  `icon` varchar(20) NOT NULL DEFAULT 'star' COMMENT 'Nombre del icono SVG o emoji para renderizar en el panel',
  `price_domis` decimal(18,4) NOT NULL COMMENT 'Precio de compra en tokens DOMI. Leido por purchaseUpgrade()',
  `duration_days` int(11) NOT NULL DEFAULT 30 COMMENT 'Dias de vigencia desde la fecha de compra',
  `is_subscription` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 si se considera suscripcion renovable automaticamente',
  `max_per_commerce` int(11) DEFAULT NULL COMMENT 'Limite maximo de instancias activas por comercio. NULL = ilimitado',
  `max_per_entity` int(11) DEFAULT NULL COMMENT 'Limite maximo de instancias activas por entidad especifica. NULL = ilimitado',
  `benefit_scope` enum('global','individual') NOT NULL DEFAULT 'global' COMMENT 'global=beneficia al comercio. individual=beneficia a la sub-entidad compradora',
  `target_role` varchar(255) NOT NULL DEFAULT 'commerce_manager' COMMENT 'Rol o roles de usuario a los que esta dirigida esta mejora',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0 = desactivada, no aparece en el mercado de mejoras',
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `upgrade_key` (`upgrade_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catalogo de configuracion de mejoras. Los precios aqui son la fuente de verdad para purchaseUpgrade()';;

-- ==========================================
-- Table: user_addresses
-- ==========================================
DROP TABLE IF EXISTS `user_addresses`;
CREATE TABLE `user_addresses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `label` varchar(50) DEFAULT 'Casa',
  `direccion` varchar(255) NOT NULL,
  `latitud` decimal(10,8) DEFAULT NULL,
  `longitud` decimal(11,8) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `created_at` timestamp(6) NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: user_moderation_logs
-- ==========================================
DROP TABLE IF EXISTS `user_moderation_logs`;
CREATE TABLE `user_moderation_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `target_user_type` enum('user','system_user') NOT NULL,
  `target_user_id` int(11) NOT NULL,
  `action` enum('ban','unban','lock_password','unlock_password') NOT NULL,
  `reason` text NOT NULL,
  `moderator_user_type` enum('user','system_user','operator') NOT NULL,
  `moderator_user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================

-- ==========================================
-- Table: user_push_tokens
-- ==========================================
DROP TABLE IF EXISTS `user_push_tokens`;
CREATE TABLE `user_push_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `fcm_token` varchar(512) NOT NULL,
  `platform` enum('ios','android') NOT NULL DEFAULT 'android',
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_platform` (`user_id`,`platform`),
  CONSTRAINT `fk_push_token_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: user_roles
-- ==========================================
DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `system_user_id` int(11) DEFAULT NULL,
  `operator_id` int(11) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `assigned_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ur_user` (`role_id`, `user_id`),
  UNIQUE KEY `uq_ur_sysuser` (`role_id`, `system_user_id`),
  UNIQUE KEY `uq_ur_operator` (`role_id`, `operator_id`),
  CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_sysuser` FOREIGN KEY (`system_user_id`) REFERENCES `system_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_operator` FOREIGN KEY (`operator_id`) REFERENCES `store_operators` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_ur_owner` CHECK (
    (IF(user_id IS NOT NULL, 1, 0) +
     IF(system_user_id IS NOT NULL, 1, 0) +
     IF(operator_id IS NOT NULL, 1, 0)) = 1
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Asignación de roles RBAC con integridad física';

-- ==========================================
-- Table: user_stores
-- ==========================================
DROP TABLE IF EXISTS `user_stores`;
CREATE TABLE `user_stores` (
  `user_id` int(11) NOT NULL,
  `store_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`store_id`),
  KEY `fk_user_stores_store` (`store_id`),
  CONSTRAINT `fk_user_stores_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_stores_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: users
-- ==========================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `financial_pin_hash` varchar(60) DEFAULT NULL,
  `financial_pin_locked` tinyint(1) NOT NULL DEFAULT 0,
  `financial_pin_attempts` int(11) NOT NULL DEFAULT 0,
  `rol` enum('admin','customer') NOT NULL DEFAULT 'customer',
  `es_repartidor` tinyint(1) NOT NULL DEFAULT 0,
  `repartidor_activo` tinyint(1) NOT NULL DEFAULT 0,
  `repartidor_disponible_desde` datetime(6) DEFAULT NULL,
  `estado` enum('activo','inactivo','baneado') DEFAULT 'activo',
  `password_locked` tinyint(1) NOT NULL DEFAULT 0,
  `domi_score` tinyint(4) NOT NULL DEFAULT 0,
  `cod_penalty_remaining_orders` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: wallet_aliases
-- ==========================================
DROP TABLE IF EXISTS `wallet_aliases`;
CREATE TABLE `wallet_aliases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallet_id` int(11) NOT NULL,
  `alias` varchar(50) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_alias` (`alias`),
  KEY `fk_alias_wallet` (`wallet_id`),
  CONSTRAINT `fk_alias_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Alias de billeteras de usuarios (Bre-b)';;

-- ==========================================
-- Table: wallets
-- ==========================================
DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `balance_custody` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `balance_utility` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `locked_balance` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `tx_nonce` bigint(20) unsigned NOT NULL DEFAULT 0,
  `tier` enum('standard','verified_commerce','system') NOT NULL DEFAULT 'standard',
  `max_balance_domi` decimal(20,8) DEFAULT NULL,
  `excess_purchase_approved` tinyint(1) NOT NULL DEFAULT 0,
  `withdrawal_cooldown_until` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wallet_user` (`user_id`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_balances` CHECK (`balance_custody` >= 0 and `balance_utility` >= 0 and `locked_balance` >= 0),
  CONSTRAINT `chk_wallet_owner` CHECK (
    (IF(user_id IS NOT NULL, 1, 0) +
     IF(is_system = 1, 1, 0)) = 1
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Billeteras relacionales ortodoxas del ecosistema';;

-- ==========================================
-- Table: withdrawal_accounts
-- ==========================================
DROP TABLE IF EXISTS `withdrawal_accounts`;
CREATE TABLE `withdrawal_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallet_id` int(11) NOT NULL,
  `metodo` enum('bancolombia','nequi','daviplata','pse_otro') NOT NULL,
  `numero_cuenta` varchar(50) NOT NULL,
  `tipo_cuenta` enum('ahorros','corriente','nequi','daviplata') NOT NULL,
  `codigo_banco` varchar(10) DEFAULT NULL COMMENT 'Codigo ACH del banco. Solo para metodo pse_otro.',
  `titular` varchar(200) NOT NULL,
  `documento_cc` varchar(20) NOT NULL COMMENT 'Numero de cedula del titular. Requerido por Wompi Dispersiones.',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'El administrador verifico que la cuenta pertenece al titular.',
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wallet_account` (`wallet_id`,`numero_cuenta`),
  CONSTRAINT `fk_wa_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cuentas bancarias registradas para retiros via Wompi Dispersiones.';;

-- ==========================================
-- Table: driver_priority_counters
-- ==========================================
DROP TABLE IF EXISTS `driver_priority_counters`;
CREATE TABLE `driver_priority_counters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_type` enum('user','delivery_company') NOT NULL,
  `owner_id` int(11) NOT NULL,
  `penalty_points` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_owner` (`owner_type`,`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contadores de prioridad de asignación de repartidores.';;

-- ==========================================
-- Table: store_reliability_counters
-- ==========================================
DROP TABLE IF EXISTS `store_reliability_counters`;
CREATE TABLE `store_reliability_counters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `penalty_points` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_store` (`store_id`),
  CONSTRAINT `fk_store_reliability` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contadores de confiabilidad y penalizaciones de sedes.';;

-- ==========================================
-- TRIGGERS
-- ==========================================

-- ==========================================
-- Trigger: protect_commerce_upgrades_insert
-- ==========================================
DROP TRIGGER IF EXISTS `protect_commerce_upgrades_insert`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_commerce_upgrades_insert
     BEFORE INSERT ON commerce_upgrades
     FOR EACH ROW
     BEGIN
        -- Validar que la fecha de expiración no exceda la duración máxima permitida en el catálogo
        IF EXISTS (
          SELECT 1 FROM upgrade_catalog uc 
          WHERE uc.upgrade_key = NEW.upgrade_type 
            AND NEW.expires_at > DATE_ADD(NEW.created_at, INTERVAL uc.duration_days DAY)
        ) THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error de Negocio: La fecha de expiración excede la duración del plan permitida en el catálogo de mejoras.';
        END IF;

        IF @domi_bypass_security IS NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM users WHERE id = @domi_session_user_id AND rol IN ('system', 'root')
          ) AND @domi_session_user_id <> NEW.user_id THEN
            SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Seguridad: No tiene permisos suficientes sobre la entidad asociada a la mejora.';
          END IF;
        END IF;
     END;
 //
 DELIMITER ;
 
 -- ==========================================
 -- Trigger: protect_commerce_upgrades_update
 -- ==========================================
 DROP TRIGGER IF EXISTS `protect_commerce_upgrades_update`;
 DELIMITER //
 CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_commerce_upgrades_update
      BEFORE UPDATE ON commerce_upgrades
      FOR EACH ROW
      BEGIN
        -- Validar que la fecha de expiración no exceda la duración máxima permitida en el catálogo
        IF EXISTS (
          SELECT 1 FROM upgrade_catalog uc 
          WHERE uc.upgrade_key = NEW.upgrade_type 
            AND NEW.expires_at > DATE_ADD(NEW.created_at, INTERVAL uc.duration_days DAY)
        ) THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error de Negocio: La fecha de expiración excede la duración del plan permitida en el catálogo de mejoras.';
        END IF;
 
        IF @domi_bypass_security IS NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM users WHERE id = @domi_session_user_id AND rol IN ('system', 'root')
          ) AND @domi_session_user_id <> NEW.user_id THEN
            SIGNAL SQLSTATE '45000'
              SET MESSAGE_TEXT = 'Seguridad: No tiene permisos suficientes sobre la entidad asociada a la mejora.';
          END IF;
        END IF;
      END;
 //
 DELIMITER ;

-- ==========================================
-- Trigger: enforce_single_commerce_insert
-- ==========================================
DROP TRIGGER IF EXISTS `enforce_single_commerce_insert`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER enforce_single_commerce_insert BEFORE INSERT ON commerces FOR EACH ROW BEGIN DECLARE user_rol VARCHAR(20); IF NEW.usuario_id IS NOT NULL THEN SELECT rol INTO user_rol FROM users WHERE id = NEW.usuario_id; IF user_rol <> 'admin' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol admin puede ser propietario de un comercio.'; END IF; END IF; END;
//
DELIMITER ;


-- ==========================================
-- Trigger: auto_assign_commerce_manager_role
-- ==========================================
DROP TRIGGER IF EXISTS `auto_assign_commerce_manager_role`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER auto_assign_commerce_manager_role
  AFTER INSERT ON commerces FOR EACH ROW
  BEGIN
    DECLARE role_id_var INT;
    DECLARE old_root INT;
    SET old_root = @domi_is_root;
    SET @domi_is_root = 1;
    IF NEW.usuario_id IS NOT NULL THEN
      SELECT id INTO role_id_var FROM roles WHERE code = 'commerce_manager' LIMIT 1;
      IF role_id_var IS NOT NULL THEN
        INSERT IGNORE INTO user_roles (user_id, role_id)
        VALUES (NEW.usuario_id, role_id_var);
      END IF;
    END IF;
    SET @domi_is_root = old_root;
  END;
//
DELIMITER ;

-- ==========================================
-- Trigger: prevent_commerce_owner_change
-- ==========================================
DROP TRIGGER IF EXISTS `prevent_commerce_owner_change`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER prevent_commerce_owner_change BEFORE UPDATE ON commerces FOR EACH ROW BEGIN IF OLD.usuario_id IS NOT NULL AND NEW.usuario_id IS NOT NULL AND OLD.usuario_id <> NEW.usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El propietario de un comercio no puede reasignarse. Requiere proceso administrativo.'; END IF; END;
//
DELIMITER ;


-- ==========================================
-- Trigger: auto_assign_delivery_company_admin_role
-- ==========================================
DROP TRIGGER IF EXISTS `auto_assign_delivery_company_admin_role`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER auto_assign_delivery_company_admin_role
  AFTER INSERT ON delivery_companies FOR EACH ROW
  BEGIN
    DECLARE role_id_var INT;
    DECLARE old_root INT;
    SET old_root = @domi_is_root;
    SET @domi_is_root = 1;
    IF NEW.usuario_id IS NOT NULL THEN
      SELECT id INTO role_id_var FROM roles WHERE code = 'delivery_company_admin' LIMIT 1;
      IF role_id_var IS NOT NULL THEN
        INSERT IGNORE INTO user_roles (user_id, role_id)
        VALUES (NEW.usuario_id, role_id_var);
      END IF;
    END IF;
    SET @domi_is_root = old_root;
  END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_ledger_withdrawals
-- ==========================================
DROP TRIGGER IF EXISTS `protect_ledger_withdrawals`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_ledger_withdrawals
     BEFORE INSERT ON domi_ledger
     FOR EACH ROW
     BEGIN
       IF @domi_bypass_security IS NULL THEN
         -- Bloquear UNICAMENTE operaciones que destruyen tokens del ecosistema (to_wallet_id NULL)
         -- burn_service con to_wallet_id != NULL es un cobro interno, NO un retiro
         IF NEW.tx_type IN ('burn_service', 'burn_manual') AND NEW.to_wallet_id IS NULL THEN
           IF (SELECT enabled FROM system_financial_flags WHERE `key` = 'withdrawals_enabled') = 0 THEN
             SIGNAL SQLSTATE '45000'
               SET MESSAGE_TEXT = 'Seguridad DB: Los retiros de tokens DOMI estan suspendidos globalmente.';
           END IF;
         END IF;
       END IF;
     END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_ledger_update
-- ==========================================
DROP TRIGGER IF EXISTS `protect_ledger_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_ledger_update BEFORE UPDATE ON domi_ledger FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El libro mayor (domi_ledger) es inmutable. No se permite UPDATE.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_ledger_delete
-- ==========================================
DROP TRIGGER IF EXISTS `protect_ledger_delete`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_ledger_delete BEFORE DELETE ON domi_ledger FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El libro mayor (domi_ledger) es inmutable. No se permite DELETE.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_peg_history_update
-- ==========================================
DROP TRIGGER IF EXISTS `protect_peg_history_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_peg_history_update
BEFORE UPDATE ON domi_peg_history FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El historial de peg del DOMI es inmutable.';
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_peg_history_delete
-- ==========================================
DROP TRIGGER IF EXISTS `protect_peg_history_delete`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_peg_history_delete
BEFORE DELETE ON domi_peg_history FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El historial de peg del DOMI es inmutable.';
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: enforce_customer_role_on_order_insert
-- ==========================================
DROP TRIGGER IF EXISTS `enforce_customer_role_on_order_insert`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER enforce_customer_role_on_order_insert
            BEFORE INSERT ON orders FOR EACH ROW
            BEGIN
                DECLARE user_rol VARCHAR(20);
                SELECT rol INTO user_rol FROM users WHERE id = NEW.customer_user_id;
                IF user_rol IS NULL OR user_rol <> 'customer' THEN
                    SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede realizar pedidos.';
                END IF;
            END;
//
DELIMITER ;

-- ==========================================
-- auto_create_user_wallet moved to users table for robustness (see users triggers)

-- ==========================================
-- Trigger: protect_protocol_rules_update
-- ==========================================
DROP TRIGGER IF EXISTS `protect_protocol_rules_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_protocol_rules_update BEFORE UPDATE ON protocol_rules FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: Reglas de protocolo protegidas. Operación UPDATE no autorizada en esta capa.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_protocol_rules_delete
-- ==========================================
DROP TRIGGER IF EXISTS `protect_protocol_rules_delete`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_protocol_rules_delete BEFORE DELETE ON protocol_rules FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: Reglas de protocolo protegidas. Operación DELETE no autorizada en esta capa.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: rbac_role_permissions_before_insert
-- ==========================================
DROP TRIGGER IF EXISTS `rbac_role_permissions_before_insert`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER rbac_role_permissions_before_insert
BEFORE INSERT ON `role_permissions` FOR EACH ROW
BEGIN
  DECLARE db_user VARCHAR(100);
  SET db_user = SUBSTRING_INDEX(USER(), '@', 1);

  IF db_user NOT IN ('root', 'bienestar_deployer') THEN
    IF (@domi_is_root IS NULL OR @domi_is_root <> 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seguridad DB: Solo el Super Administrador puede modificar los roles del sistema.';
    END IF;
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: rbac_role_permissions_before_update
-- ==========================================
DROP TRIGGER IF EXISTS `rbac_role_permissions_before_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER rbac_role_permissions_before_update
BEFORE UPDATE ON `role_permissions` FOR EACH ROW
BEGIN
  DECLARE db_user VARCHAR(100);
  SET db_user = SUBSTRING_INDEX(USER(), '@', 1);

  IF db_user NOT IN ('root', 'bienestar_deployer') THEN
    IF (@domi_is_root IS NULL OR @domi_is_root <> 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seguridad DB: Solo el Super Administrador puede modificar los roles del sistema.';
    END IF;
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: rbac_role_permissions_before_delete
-- ==========================================
DROP TRIGGER IF EXISTS `rbac_role_permissions_before_delete`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER rbac_role_permissions_before_delete
BEFORE DELETE ON `role_permissions` FOR EACH ROW
BEGIN
  DECLARE db_user VARCHAR(100);
  SET db_user = SUBSTRING_INDEX(USER(), '@', 1);

  IF db_user NOT IN ('root', 'bienestar_deployer') THEN
    IF (@domi_is_root IS NULL OR @domi_is_root <> 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seguridad DB: Solo el Super Administrador puede modificar los roles del sistema.';
    END IF;
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: rbac_roles_before_insert
-- ==========================================
DROP TRIGGER IF EXISTS `rbac_roles_before_insert`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER rbac_roles_before_insert
BEFORE INSERT ON `roles` FOR EACH ROW
BEGIN
  DECLARE db_user VARCHAR(100);
  SET db_user = SUBSTRING_INDEX(USER(), '@', 1);

  IF db_user NOT IN ('root', 'bienestar_deployer') THEN
    IF (@domi_is_root IS NULL OR @domi_is_root <> 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seguridad DB: Solo el Super Administrador puede modificar los roles del sistema.';
    END IF;
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: rbac_roles_before_update
-- ==========================================
DROP TRIGGER IF EXISTS `rbac_roles_before_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER rbac_roles_before_update
BEFORE UPDATE ON `roles` FOR EACH ROW
BEGIN
  DECLARE db_user VARCHAR(100);
  SET db_user = SUBSTRING_INDEX(USER(), '@', 1);

  IF db_user NOT IN ('root', 'bienestar_deployer') THEN
    IF (@domi_is_root IS NULL OR @domi_is_root <> 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seguridad DB: Solo el Super Administrador puede modificar los roles del sistema.';
    END IF;
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: rbac_roles_before_delete
-- ==========================================
DROP TRIGGER IF EXISTS `rbac_roles_before_delete`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER rbac_roles_before_delete
BEFORE DELETE ON `roles` FOR EACH ROW
BEGIN
  DECLARE db_user VARCHAR(100);
  SET db_user = SUBSTRING_INDEX(USER(), '@', 1);

  IF db_user NOT IN ('root', 'bienestar_deployer') THEN
    IF (@domi_is_root IS NULL OR @domi_is_root <> 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seguridad DB: Solo el Super Administrador puede modificar los roles del sistema.';
    END IF;
  END IF;
END;
//
DELIMITER ;


-- ==========================================
-- Trigger: auto_assign_store_admin_role
-- ==========================================
DROP TRIGGER IF EXISTS `auto_assign_store_admin_role`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER auto_assign_store_admin_role
  AFTER INSERT ON stores FOR EACH ROW
  BEGIN
    DECLARE role_id_var INT;
    DECLARE old_root INT;
    SET old_root = @domi_is_root;
    SET @domi_is_root = 1;
    IF NEW.usuario_id IS NOT NULL THEN
      SELECT id INTO role_id_var FROM roles WHERE code = 'store_admin' LIMIT 1;
      IF role_id_var IS NOT NULL THEN
        INSERT IGNORE INTO user_roles (user_id, role_id)
        VALUES (NEW.usuario_id, role_id_var);
      END IF;
    END IF;
    SET @domi_is_root = old_root;
  END;
//
DELIMITER ;

-- ==========================================
-- Trigger: prevent_store_manager_change
-- ==========================================
DROP TRIGGER IF EXISTS `prevent_store_manager_change`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER prevent_store_manager_change BEFORE UPDATE ON stores FOR EACH ROW BEGIN IF OLD.usuario_id IS NOT NULL AND NEW.usuario_id IS NOT NULL AND OLD.usuario_id <> NEW.usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El gerente responsable de una sede no puede reasignarse directamente. Requiere proceso administrativo.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_token_registry_update
-- ==========================================
DROP TRIGGER IF EXISTS `protect_token_registry_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_token_registry_update BEFORE UPDATE ON token_registry FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El registro de tokens es inmutable. No se permite UPDATE.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_token_registry_delete
-- ==========================================
DROP TRIGGER IF EXISTS `protect_token_registry_delete`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_token_registry_delete BEFORE DELETE ON token_registry FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El registro de tokens es inmutable. No se permite DELETE.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_upgrade_catalog_update
-- ==========================================
DROP TRIGGER IF EXISTS `protect_upgrade_catalog_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_upgrade_catalog_update
BEFORE UPDATE ON upgrade_catalog
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL AND @domi_is_root IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: El catalogo de mejoras solo puede ser modificado por el motor de aplicacion autorizado.';
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: protect_upgrade_catalog_delete
-- ==========================================
DROP TRIGGER IF EXISTS `protect_upgrade_catalog_delete`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER protect_upgrade_catalog_delete
BEFORE DELETE ON upgrade_catalog
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL AND @domi_is_root IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: Las entradas del catalogo de mejoras no pueden ser eliminadas directamente.';
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: rbac_user_roles_before_insert
-- ==========================================
DROP TRIGGER IF EXISTS `rbac_user_roles_before_insert`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER rbac_user_roles_before_insert
BEFORE INSERT ON `user_roles` FOR EACH ROW
BEGIN
  DECLARE db_user VARCHAR(100);
  SET db_user = SUBSTRING_INDEX(USER(), '@', 1);

  IF db_user NOT IN ('root', 'bienestar_deployer') THEN
    IF (@domi_is_root IS NULL OR @domi_is_root <> 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seguridad DB: Solo el Super Administrador puede modificar los roles del sistema.';
    END IF;
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: rbac_user_roles_before_update
-- ==========================================
DROP TRIGGER IF EXISTS `rbac_user_roles_before_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER rbac_user_roles_before_update
BEFORE UPDATE ON `user_roles` FOR EACH ROW
BEGIN
  DECLARE db_user VARCHAR(100);
  SET db_user = SUBSTRING_INDEX(USER(), '@', 1);

  IF db_user NOT IN ('root', 'bienestar_deployer') THEN
    IF (@domi_is_root IS NULL OR @domi_is_root <> 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seguridad DB: Solo el Super Administrador puede modificar los roles del sistema.';
    END IF;
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: rbac_user_roles_before_delete
-- ==========================================
DROP TRIGGER IF EXISTS `rbac_user_roles_before_delete`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER rbac_user_roles_before_delete
BEFORE DELETE ON `user_roles` FOR EACH ROW
BEGIN
  DECLARE db_user VARCHAR(100);
  SET db_user = SUBSTRING_INDEX(USER(), '@', 1);

  IF db_user NOT IN ('root', 'bienestar_deployer') THEN
    IF (@domi_is_root IS NULL OR @domi_is_root <> 1) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Seguridad DB: Solo el Super Administrador puede modificar los roles del sistema.';
    END IF;
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: enforce_driver_role_insert
-- ==========================================
DROP TRIGGER IF EXISTS `enforce_driver_role_insert`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER enforce_driver_role_insert BEFORE INSERT ON users FOR EACH ROW BEGIN IF NEW.es_repartidor = 1 AND NEW.rol <> 'customer' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede activar el modo repartidor.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: sync_user_roles_after_insert
-- ==========================================
DROP TRIGGER IF EXISTS `sync_user_roles_after_insert`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER sync_user_roles_after_insert
            AFTER INSERT ON users FOR EACH ROW
            BEGIN
                DECLARE customer_role_id_var INT;
                DECLARE driver_role_id_var INT;
                SET @old_domi_is_root = @domi_is_root;
                SET @domi_is_root = 1;
                
                IF NEW.rol = 'customer' THEN
                    SELECT id INTO customer_role_id_var FROM roles WHERE code = 'customer' LIMIT 1;
                    IF customer_role_id_var IS NOT NULL THEN
                        INSERT IGNORE INTO user_roles (user_id, role_id)
                        VALUES (NEW.id, customer_role_id_var);
                    END IF;
                    
                    IF NEW.es_repartidor = 1 THEN
                        SELECT id INTO driver_role_id_var FROM roles WHERE code = 'driver' LIMIT 1;
                        IF driver_role_id_var IS NOT NULL THEN
                            INSERT IGNORE INTO user_roles (user_id, role_id)
                            VALUES (NEW.id, driver_role_id_var);
                        END IF;
                    END IF;
                END IF;
                SET @domi_is_root = @old_domi_is_root;
                SET @old_domi_is_root = NULL;
            END;
//
DELIMITER ;

-- ==========================================
-- Trigger: enforce_driver_role_update
-- ==========================================
DROP TRIGGER IF EXISTS `enforce_driver_role_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER enforce_driver_role_update BEFORE UPDATE ON users FOR EACH ROW BEGIN IF NEW.es_repartidor = 1 AND NEW.rol <> 'customer' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede activar el modo repartidor.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: prevent_active_driver_without_flag
-- ==========================================
DROP TRIGGER IF EXISTS `prevent_active_driver_without_flag`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER prevent_active_driver_without_flag BEFORE UPDATE ON users FOR EACH ROW BEGIN IF NEW.repartidor_activo = 1 AND NEW.es_repartidor = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: No se puede activar el turno de repartidor sin haber habilitado el modo repartidor primero.'; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: trigger_repartidor_disponibilidad
-- ==========================================
DROP TRIGGER IF EXISTS `trigger_repartidor_disponibilidad`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER `trigger_repartidor_disponibilidad`
BEFORE UPDATE ON `users`
FOR EACH ROW
BEGIN
  IF NEW.repartidor_activo = 1 AND OLD.repartidor_activo = 0 THEN
    SET NEW.repartidor_disponible_desde = NOW(6);
  ELSEIF NEW.repartidor_activo = 0 AND OLD.repartidor_activo = 1 THEN
    SET NEW.repartidor_disponible_desde = NULL;
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: sync_user_roles_after_update
-- ==========================================
DROP TRIGGER IF EXISTS `sync_user_roles_after_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER sync_user_roles_after_update
            AFTER UPDATE ON users FOR EACH ROW
            BEGIN
                DECLARE customer_role_id_var INT;
                DECLARE driver_role_id_var INT;
                SET @old_domi_is_root = @domi_is_root;
                SET @domi_is_root = 1;
                
                -- Sincronizar rol cliente
                IF NEW.rol = 'customer' THEN
                    SELECT id INTO customer_role_id_var FROM roles WHERE code = 'customer' LIMIT 1;
                    IF customer_role_id_var IS NOT NULL THEN
                        INSERT IGNORE INTO user_roles (user_id, role_id)
                        VALUES (NEW.id, customer_role_id_var);
                    END IF;
                ELSE
                    SELECT id INTO customer_role_id_var FROM roles WHERE code = 'customer' LIMIT 1;
                    IF customer_role_id_var IS NOT NULL THEN
                        DELETE FROM user_roles WHERE user_id = NEW.id AND role_id = customer_role_id_var;
                    END IF;
                END IF;
                
                -- Sincronizar rol repartidor (driver)
                SELECT id INTO driver_role_id_var FROM roles WHERE code = 'driver' LIMIT 1;
                IF driver_role_id_var IS NOT NULL THEN
                    IF NEW.es_repartidor = 1 AND NEW.rol = 'customer' THEN
                        INSERT IGNORE INTO user_roles (user_id, role_id)
                        VALUES (NEW.id, driver_role_id_var);
                    ELSE
                        DELETE FROM user_roles WHERE user_id = NEW.id AND role_id = driver_role_id_var;
                    END IF;
                END IF;
                
                SET @domi_is_root = @old_domi_is_root;
                SET @old_domi_is_root = NULL;
            END;
//
DELIMITER ;

-- ==========================================
-- Trigger: auto_create_user_wallet
-- ==========================================
DROP TRIGGER IF EXISTS `auto_create_user_wallet`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER auto_create_user_wallet
  AFTER INSERT ON users FOR EACH ROW
  BEGIN
    IF NEW.rol IN ('customer', 'admin') THEN
      INSERT INTO wallets (user_id) VALUES (NEW.id);
    END IF;
  END;
//
DELIMITER ;

-- ==========================================
-- Trigger: auto_create_user_wallet_update
-- ==========================================
DROP TRIGGER IF EXISTS `auto_create_user_wallet_update`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER auto_create_user_wallet_update
  AFTER UPDATE ON users FOR EACH ROW
  BEGIN
    IF NEW.rol IN ('customer', 'admin') AND OLD.rol NOT IN ('customer', 'admin') THEN
      INSERT IGNORE INTO wallets (user_id) VALUES (NEW.id);
    END IF;
  END;
//
DELIMITER ;

-- ==========================================
-- Trigger: enforce_single_wallet_per_user
-- ==========================================
DROP TRIGGER IF EXISTS `enforce_single_wallet_per_user`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER enforce_single_wallet_per_user BEFORE INSERT ON wallets FOR EACH ROW BEGIN DECLARE wallet_count INT; IF NEW.user_id IS NOT NULL THEN SELECT COUNT(*) INTO wallet_count FROM wallets WHERE user_id = NEW.user_id; IF wallet_count > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Integridad: Este usuario ya posee una billetera DOMI. Solo se permite una por cuenta.'; END IF; END IF; END;
//
DELIMITER ;

-- ==========================================
-- Trigger: prevent_wallet_owner_change
-- ==========================================
DROP TRIGGER IF EXISTS `prevent_wallet_owner_change`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER prevent_wallet_owner_change BEFORE UPDATE ON wallets FOR EACH ROW
BEGIN
  IF (OLD.user_id IS NOT NULL AND OLD.user_id <> NEW.user_id) OR
     (OLD.is_system <> NEW.is_system) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad Financiera: La propiedad de la billetera es inmutable y no puede alterarse.';
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: prevent_wallet_deletion
-- ==========================================
DROP TRIGGER IF EXISTS `prevent_wallet_deletion`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER prevent_wallet_deletion BEFORE DELETE ON wallets FOR EACH ROW
BEGIN
  IF @domi_allow_wallet_deletion IS NULL OR @domi_allow_wallet_deletion <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad Financiera: Prohibido eliminar billeteras de forma directa. Deben ser eliminadas en cascada con su entidad propietaria.';
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Trigger: auto_generate_wallet_alias
-- ==========================================
DROP TRIGGER IF EXISTS `auto_generate_wallet_alias`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER auto_generate_wallet_alias
  AFTER INSERT ON wallets FOR EACH ROW
  BEGIN
    DECLARE initials VARCHAR(50) DEFAULT 'wallet';
    DECLARE docDigits VARCHAR(10) DEFAULT '000';
    DECLARE baseAlias VARCHAR(60);
    DECLARE candidate VARCHAR(60);
    DECLARE counter INT DEFAULT 1;
    DECLARE exists_alias INT DEFAULT 0;

    IF NEW.user_id IS NOT NULL THEN
      SELECT
        LOWER(CONCAT(
          SUBSTRING(REGEXP_REPLACE(nombres, '[^a-zA-Z0-9]', ''), 1, 2),
          IFNULL(SUBSTRING(REGEXP_REPLACE(apellidos, '[^a-zA-Z0-9]', ''), 1, 2), '')
        )),
        IFNULL(SUBSTRING(REGEXP_REPLACE(cedula, '[^0-9]', ''), 1, 3), '000')
      INTO initials, docDigits
      FROM profiles WHERE usuario_id = NEW.user_id LIMIT 1;
    ELSEIF NEW.is_system = 1 THEN
      SET initials = 'sys';
      SET docDigits = '000';
    END IF;

    IF initials IS NULL OR initials = '' THEN SET initials = 'wallet'; END IF;
    IF docDigits IS NULL OR docDigits = '' THEN SET docDigits = '000'; END IF;

    SET baseAlias = CONCAT(initials, docDigits);
    SET candidate = baseAlias;

    REPEAT
      SELECT COUNT(*) INTO exists_alias FROM wallet_aliases WHERE alias = candidate;
      IF exists_alias > 0 THEN
        SET candidate = CONCAT(baseAlias, counter);
        SET counter = counter + 1;
      END IF;
    UNTIL exists_alias = 0 END REPEAT;

    INSERT INTO wallet_aliases (wallet_id, alias) VALUES (NEW.id, candidate);
  END;
//
DELIMITER ;

-- ==========================================
-- Table: system_notifications
-- ==========================================
DROP TABLE IF EXISTS `system_notifications`;
CREATE TABLE `system_notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` varchar(60) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `action_url` varchar(500) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_user_unread` (`user_id`,`is_read`),
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: firebase_identities
-- ==========================================
DROP TABLE IF EXISTS `firebase_identities`;
CREATE TABLE `firebase_identities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `firebase_uid` varchar(128) NOT NULL,
  `provider` varchar(20) DEFAULT 'firebase',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `firebase_uid` (`firebase_uid`),
  CONSTRAINT `fk_firebase_identities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Table: invitations
-- ==========================================
DROP TABLE IF EXISTS `invitations`;
CREATE TABLE `invitations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sent_by_user_id` int(11) NOT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `status` enum('pending','accepted','expired') DEFAULT 'pending',
  `sent_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `details_json` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sent_by_user_id` (`sent_by_user_id`),
  CONSTRAINT `fk_invitations_sender` FOREIGN KEY (`sent_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;;

-- ==========================================
-- Trigger: prevent_package_status_rollback
-- ==========================================
DROP TRIGGER IF EXISTS `prevent_package_status_rollback`;
DELIMITER //
CREATE DEFINER=`bienestar_admin_prod`@`localhost` TRIGGER prevent_package_status_rollback
BEFORE UPDATE ON `domi_packages` FOR EACH ROW
BEGIN
  IF OLD.status = 'confirmado' AND NEW.status <> 'confirmado' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad DB: Un paquete de DOMIs confirmado no puede revertirse a otro estado.';
  END IF;
END;
//
DELIMITER ;

-- ==========================================
-- Performance Indexes for Financial Hardening
-- ==========================================
ALTER TABLE `domi_ledger` ADD INDEX `idx_ledger_created_type` (`created_at`, `tx_type`);
ALTER TABLE `orders` ADD INDEX `idx_orders_created_status` (`created_at`, `status`);
ALTER TABLE `rescue_assignments` ADD INDEX `idx_rescue_created` (`created_at`);

SET FOREIGN_KEY_CHECKS = 1;

