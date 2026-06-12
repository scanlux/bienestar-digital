-- =========================================================
-- VOLCADO AUTOMÁTICO DE ESQUEMA DE PRODUCCIÓN
-- =========================================================

CREATE DATABASE IF NOT EXISTS `marketplace_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `marketplace_db`;

SET FOREIGN_KEY_CHECKS = 0;

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
  PRIMARY KEY (`id`),
  KEY `fk_categorias_menu` (`menu_id`),
  CONSTRAINT `fk_categorias_menu` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `commerce_plans`;
CREATE TABLE `commerce_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commerce_id` int(11) NOT NULL,
  `plan_type` varchar(50) NOT NULL DEFAULT 'Empresarial',
  `status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
  `price_paid_domis` decimal(10,2) NOT NULL DEFAULT 50.00,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `payment_ref` varchar(150) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_plans_commerce` (`commerce_id`),
  CONSTRAINT `fk_plans_commerce` FOREIGN KEY (`commerce_id`) REFERENCES `commerces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `commerce_video_likes`;
CREATE TABLE `commerce_video_likes` (
  `video_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`video_id`,`user_id`),
  KEY `fk_likes_user` (`user_id`),
  CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_likes_video` FOREIGN KEY (`video_id`) REFERENCES `commerce_videos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `commerces`;
CREATE TABLE `commerces` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
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
  `email` varchar(255) DEFAULT NULL,
  `admin_nombres` varchar(100) DEFAULT NULL,
  `admin_apellidos` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_brand_name` (`nombre`),
  UNIQUE KEY `uq_commerce_nit` (`nit`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_commerce_user` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `domi_ledger`;
CREATE TABLE `domi_ledger` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tx_hash` varchar(64) NOT NULL,
  `tx_type` enum('mint','burn_service','burn_incident','refund','rescue_cashback','lock','unlock') NOT NULL,
  `from_wallet_id` int(11) DEFAULT NULL,
  `to_wallet_id` int(11) DEFAULT NULL,
  `amount_domis` decimal(18,4) NOT NULL,
  `amount_fiat_cop` decimal(14,2) DEFAULT NULL,
  `reference_type` enum('order','package','incident','manual') NOT NULL,
  `reference_id` int(11) NOT NULL,
  `protocol_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`protocol_snapshot`)),
  `notes` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tx_hash` (`tx_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=1023 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Libro mayor inmutable. NUNCA se hacen UPDATE ni DELETE.';

DROP TABLE IF EXISTS `domi_packages`;
CREATE TABLE `domi_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) DEFAULT NULL,
  `wallet_id` int(11) NOT NULL,
  `domis_purchased` decimal(18,4) NOT NULL,
  `fiat_paid_cop` decimal(14,2) NOT NULL,
  `exchange_rate` decimal(12,4) NOT NULL,
  `payment_ref` varchar(100) DEFAULT NULL,
  `status` enum('pendiente','confirmado','anulado') NOT NULL DEFAULT 'pendiente',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `confirmed_at` datetime(6) DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_pkg_store` (`store_id`),
  KEY `fk_pkg_wallet` (`wallet_id`),
  CONSTRAINT `fk_pkg_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`),
  CONSTRAINT `fk_pkg_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de compras de paquetes DOMI por establecimientos.';

DROP TABLE IF EXISTS `ingredients`;
CREATE TABLE `ingredients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `es_alergeno` tinyint(1) DEFAULT 0,
  `created_at` timestamp(6) NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  PRIMARY KEY (`id`),
  KEY `idx_menus_store` (`store_id`),
  CONSTRAINT `fk_menus_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de incidencias por pedido.';

DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `price` decimal(14,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=506 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `customer_user_id` int(11) NOT NULL,
  `driver_user_id` int(11) DEFAULT NULL,
  `total_cop` decimal(14,2) NOT NULL DEFAULT 0.00,
  `domi_cost` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `driver_domi_cost` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `status` enum('pendiente','aceptado','preparando','listo','en_camino','entregado','cancelado','en_rescate') NOT NULL DEFAULT 'pendiente',
  `delivery_address` text DEFAULT NULL,
  `delivery_lat` decimal(10,7) DEFAULT NULL,
  `delivery_lng` decimal(10,7) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `accepted_at` datetime(6) DEFAULT NULL,
  `picked_up_at` datetime(6) DEFAULT NULL,
  `delivered_at` datetime(6) DEFAULT NULL,
  `cancelled_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_store` (`store_id`),
  KEY `fk_order_customer` (`customer_user_id`),
  KEY `fk_order_driver` (`driver_user_id`),
  CONSTRAINT `fk_order_customer` FOREIGN KEY (`customer_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_order_driver` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_order_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=502 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pedidos del marketplace.';

DROP TABLE IF EXISTS `payment_platforms`;
CREATE TABLE `payment_platforms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo_entidad` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `product_popularity`;
CREATE TABLE `product_popularity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) DEFAULT NULL,
  `sales_count` int(11) DEFAULT 0,
  `last_update` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  CONSTRAINT `product_popularity_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT `fk_menu` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_category` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_products_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=368 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `profiles`;
CREATE TABLE `profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) DEFAULT NULL,
  `cedula` varchar(20) NOT NULL,
  `url_cedula` text DEFAULT NULL,
  `telefono` varchar(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `cedula` (`cedula`),
  UNIQUE KEY `telefono` (`telefono`),
  UNIQUE KEY `uq_profile_user` (`usuario_id`),
  CONSTRAINT `fk_profile_user` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `protocol_rules`;
CREATE TABLE `protocol_rules` (
  `id` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `threshold_fiat_cop` decimal(12,2) NOT NULL DEFAULT 50000.00,
  `base_cost_domis` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `percentage_rate` decimal(8,6) NOT NULL DEFAULT 0.010000,
  `driver_base_cost_domis` decimal(10,4) NOT NULL DEFAULT 0.7500,
  `driver_threshold_fiat_cop` decimal(12,2) NOT NULL DEFAULT 30000.00,
  `driver_percentage_rate` decimal(8,6) NOT NULL DEFAULT 0.010000,
  `retention_penalty_rate` decimal(8,6) NOT NULL DEFAULT 0.300000,
  `refund_standard_rate` decimal(8,6) NOT NULL DEFAULT 0.700000,
  `rescue_cashback_rate` decimal(8,6) NOT NULL DEFAULT 0.300000,
  `effective_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_singleton_rules` CHECK (`id` = 1),
  CONSTRAINT `chk_rates_sum` CHECK (`retention_penalty_rate` + `refund_standard_rate` = 1.000000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Parametros financieros del protocolo. READ-ONLY para la app.';

DROP TABLE IF EXISTS `rescue_assignments`;
CREATE TABLE `rescue_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `incident_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `original_driver_id` int(11) NOT NULL,
  `rescue_driver_id` int(11) DEFAULT NULL,
  `original_commission` decimal(18,4) NOT NULL,
  `status` enum('buscando_rescatista','en_camino','entregado','fallido') NOT NULL DEFAULT 'buscando_rescatista',
  `cashback_paid` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `completed_at` datetime(6) DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `incident_id` (`incident_id`),
  CONSTRAINT `fk_rescue_incident` FOREIGN KEY (`incident_id`) REFERENCES `order_incidents` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Asignaciones de rescate a repartidores suplentes.';

DROP TABLE IF EXISTS `security_audit_logs`;
CREATE TABLE `security_audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `severity` varchar(20) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_security_logs_user` (`user_id`),
  CONSTRAINT `fk_security_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `stop_words`;
CREATE TABLE `stop_words` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `word` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `word` (`word`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


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
) ENGINE=InnoDB AUTO_INCREMENT=757 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


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
  `admin_nombres` varchar(100) DEFAULT NULL,
  `admin_apellidos` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  UNIQUE KEY `matricula` (`matricula`),
  KEY `brand_id` (`commerce_id`),
  CONSTRAINT `fk_store_user` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`),
  CONSTRAINT `stores_ibfk_1` FOREIGN KEY (`commerce_id`) REFERENCES `commerces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro maestro del token DOMI. READ-ONLY para la app.';

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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
  `user_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `user_stores`;
CREATE TABLE `user_stores` (
  `user_id` int(11) NOT NULL,
  `store_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`store_id`),
  KEY `fk_user_stores_store` (`store_id`),
  CONSTRAINT `fk_user_stores_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_stores_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('root','system','admin','customer') NOT NULL DEFAULT 'customer',
  `es_repartidor` tinyint(1) NOT NULL DEFAULT 0,
  `repartidor_activo` tinyint(1) NOT NULL DEFAULT 0,
  `estado` enum('activo','inactivo','baneado') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_type` enum('system','user','store') NOT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `balance_custody` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `balance_utility` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `locked_balance` decimal(18,4) NOT NULL DEFAULT 0.0000,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_owner` (`owner_type`,`owner_id`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_balances` CHECK (`balance_custody` >= 0 and `balance_utility` >= 0 and `locked_balance` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Billeteras de usuarios, tiendas y sistema.';

SET FOREIGN_KEY_CHECKS = 1;
