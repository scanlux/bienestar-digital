-- Mensajes de chat por pedido
CREATE TABLE IF NOT EXISTS `order_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `sender_type` ENUM('bot', 'store', 'customer') NOT NULL DEFAULT 'bot',
  `sender_user_id` int(11) DEFAULT NULL,
  `message` TEXT NOT NULL,
  `message_type` ENUM('text', 'menu_link', 'product_suggestion', 'system') NOT NULL DEFAULT 'text',
  `extra_data` JSON DEFAULT NULL COMMENT 'Para enlaces, alternativas de productos, etc.',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_order_msg_order_id` (`order_id`),
  CONSTRAINT `fk_order_msg_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Push tokens de dispositivos (para FCM)
CREATE TABLE IF NOT EXISTS `user_push_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `fcm_token` varchar(512) NOT NULL,
  `platform` ENUM('ios', 'android') NOT NULL DEFAULT 'android',
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_platform` (`user_id`, `platform`),
  CONSTRAINT `fk_push_token_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
