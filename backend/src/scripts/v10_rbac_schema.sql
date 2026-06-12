-- Fase 1 — DDL: Nuevas Tablas y Triggers de Inmutabilidad
-- Este script crea las tablas del sistema RBAC y los triggers de inmutabilidad.

SET FOREIGN_KEY_CHECKS = 0;

-- 0. Limpieza de tablas antiguas / obsoletas si existían
DROP TABLE IF EXISTS `user_permissions`;
DROP TABLE IF EXISTS `permissions`;

-- 1. Categorías de permisos (módulos agrupadores)
CREATE TABLE IF NOT EXISTS `permission_categories` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(50)  NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Permisos atómicos (uno por acción clave)
CREATE TABLE IF NOT EXISTS `permissions` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT         NOT NULL,
  `name`        VARCHAR(80) NOT NULL UNIQUE COMMENT 'snake_case, ej: view_security_logs',
  `description` VARCHAR(255) NULL,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `permission_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Roles globales
CREATE TABLE IF NOT EXISTS `roles` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(50) NOT NULL UNIQUE COMMENT 'Nombre legible (ej: Auditor)',
  `code`        VARCHAR(50) NOT NULL UNIQUE COMMENT 'slug (ej: auditor)',
  `description` VARCHAR(255) NULL,
  `is_system`   TINYINT(1)  NOT NULL DEFAULT 0 COMMENT '1 = rol de sistema, no eliminable',
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Pivote: permisos por rol
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id`       INT NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`)       REFERENCES `roles`(`id`)       ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Pivote polimórfico: roles por usuario (user, system_user u operator)
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_type` ENUM('user','system_user','operator') NOT NULL,
  `user_id`   INT NOT NULL,
  `role_id`   INT NOT NULL,
  PRIMARY KEY (`user_type`, `user_id`, `role_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: Triggers are created programmatically by v10_rbac_ddl.js to avoid DELIMITER syntax parsing errors.
