/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.3-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: marketplace_db
-- ------------------------------------------------------
-- Server version	11.4.3-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `bank_deposits`
--

DROP TABLE IF EXISTS `bank_deposits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bank_deposits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `amount_cop` decimal(14,2) NOT NULL,
  `status` enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
  `destination_wallet_id` int(11) NOT NULL,
  `evidence_url` varchar(255) NOT NULL,
  `deposit_date` datetime NOT NULL,
  `notes` text DEFAULT NULL,
  `confirmed_by` int(11) DEFAULT NULL,
  `confirmed_at` datetime(6) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_deposit_wallet` (`destination_wallet_id`),
  KEY `fk_deposit_creator` (`created_by`),
  KEY `fk_deposit_confirmer` (`confirmed_by`),
  CONSTRAINT `fk_deposit_confirmer` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_deposit_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_deposit_wallet` FOREIGN KEY (`destination_wallet_id`) REFERENCES `wallets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_deposits`
--

LOCK TABLES `bank_deposits` WRITE;
/*!40000 ALTER TABLE `bank_deposits` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_deposits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_vault_transactions`
--

DROP TABLE IF EXISTS `cash_vault_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cash_vault_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `amount_cop` decimal(14,2) NOT NULL,
  `tx_type` enum('income','expense','deposit','adjustment') NOT NULL,
  `notes` text DEFAULT NULL,
  `destination_bank_account` varchar(100) DEFAULT NULL,
  `reference_type` enum('order','adjustment','manual') NOT NULL DEFAULT 'manual',
  `reference_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_cash_tx_user` (`created_by`),
  CONSTRAINT `fk_cash_tx_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_vault_transactions`
--

LOCK TABLES `cash_vault_transactions` WRITE;
/*!40000 ALTER TABLE `cash_vault_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_vault_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES
(1,1,'Platos Fuertes','Categoría de muestra',0,1,'2026-07-09 04:36:48.519957','2026-07-09 04:36:48.519957',NULL),
(2,1,'Entradas','Categoría de muestra',0,1,'2026-07-09 04:36:48.538613','2026-07-09 04:36:48.538613',NULL),
(3,1,'Postres','Categoría de muestra',0,1,'2026-07-09 04:36:48.541747','2026-07-09 04:36:48.541747',NULL),
(4,2,'Platos Fuertes','Categoría de muestra',0,1,'2026-07-09 04:36:48.545969','2026-07-09 04:36:48.545969',NULL),
(5,2,'Entradas','Categoría de muestra',0,1,'2026-07-09 04:36:48.551969','2026-07-09 04:36:48.551969',NULL),
(6,2,'Postres','Categoría de muestra',0,1,'2026-07-09 04:36:48.554349','2026-07-09 04:36:48.554349',NULL),
(7,3,'Gaseosas','Categoría de muestra',0,1,'2026-07-09 04:36:48.558157','2026-07-09 04:36:48.558157',NULL),
(8,3,'Jugos Naturales','Categoría de muestra',0,1,'2026-07-09 04:36:48.562054','2026-07-09 04:36:48.562054',NULL),
(9,4,'Platos Fuertes','Categoría de muestra',0,1,'2026-07-09 04:36:48.565787','2026-07-09 04:36:48.565787',NULL),
(10,4,'Entradas','Categoría de muestra',0,1,'2026-07-09 04:36:48.577295','2026-07-09 04:36:48.577295',NULL),
(11,4,'Postres','Categoría de muestra',0,1,'2026-07-09 04:36:48.580111','2026-07-09 04:36:48.580111',NULL),
(12,5,'Platos Fuertes','Categoría de muestra',0,1,'2026-07-09 04:36:48.584940','2026-07-09 04:36:48.584940',NULL),
(13,5,'Entradas','Categoría de muestra',0,1,'2026-07-09 04:36:48.591312','2026-07-09 04:36:48.591312',NULL),
(14,5,'Postres','Categoría de muestra',0,1,'2026-07-09 04:36:48.593764','2026-07-09 04:36:48.593764',NULL),
(15,6,'Gaseosas','Categoría de muestra',0,1,'2026-07-09 04:36:48.598050','2026-07-09 04:36:48.598050',NULL),
(16,6,'Jugos Naturales','Categoría de muestra',0,1,'2026-07-09 04:36:48.602909','2026-07-09 04:36:48.602909',NULL),
(17,7,'Platos Fuertes','Categoría de muestra',0,1,'2026-07-09 04:36:48.606990','2026-07-09 04:36:48.606990',NULL),
(18,7,'Entradas','Categoría de muestra',0,1,'2026-07-09 04:36:48.619910','2026-07-09 04:36:48.619910',NULL),
(19,7,'Postres','Categoría de muestra',0,1,'2026-07-09 04:36:48.622922','2026-07-09 04:36:48.622922',NULL),
(20,8,'Platos Fuertes','Categoría de muestra',0,1,'2026-07-09 04:36:48.627455','2026-07-09 04:36:48.627455',NULL),
(21,8,'Entradas','Categoría de muestra',0,1,'2026-07-09 04:36:48.634963','2026-07-09 04:36:48.634963',NULL),
(22,8,'Postres','Categoría de muestra',0,1,'2026-07-09 04:36:48.638930','2026-07-09 04:36:48.638930',NULL),
(23,9,'Gaseosas','Categoría de muestra',0,1,'2026-07-09 04:36:48.644392','2026-07-09 04:36:48.644392',NULL),
(24,9,'Jugos Naturales','Categoría de muestra',0,1,'2026-07-09 04:36:48.649255','2026-07-09 04:36:48.649255',NULL);
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commerce_upgrades`
--

DROP TABLE IF EXISTS `commerce_upgrades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `commerce_upgrades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commerce_id` int(11) NOT NULL,
  `upgrade_type` varchar(60) NOT NULL,
  `price_domis` decimal(18,4) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_upgrade_commerce` (`commerce_id`),
  CONSTRAINT `fk_upgrade_commerce` FOREIGN KEY (`commerce_id`) REFERENCES `commerces` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mejoras y buffs activos comprados por los comercios';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commerce_upgrades`
--

LOCK TABLES `commerce_upgrades` WRITE;
/*!40000 ALTER TABLE `commerce_upgrades` DISABLE KEYS */;
/*!40000 ALTER TABLE `commerce_upgrades` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_commerce_upgrades_insert
     BEFORE INSERT ON commerce_upgrades
     FOR EACH ROW
     BEGIN
       IF @domi_bypass_security IS NULL THEN
         IF NOT EXISTS (
           SELECT 1 FROM commerces c
           WHERE c.id = NEW.commerce_id AND c.usuario_id = @domi_session_user_id
         ) AND NOT EXISTS (
           SELECT 1 FROM users WHERE id = @domi_session_user_id AND rol IN ('system', 'root')
         ) THEN
           SIGNAL SQLSTATE '45000'
             SET MESSAGE_TEXT = 'Seguridad: Solo el administrador/gerente asociado al comercio puede adquirir mejoras.';
         END IF;
       END IF;
     END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_commerce_upgrades_update
     BEFORE UPDATE ON commerce_upgrades
     FOR EACH ROW
     BEGIN
       IF @domi_bypass_security IS NULL THEN
         IF NOT EXISTS (
           SELECT 1 FROM commerces c
           WHERE c.id = NEW.commerce_id AND c.usuario_id = @domi_session_user_id
         ) AND NOT EXISTS (
           SELECT 1 FROM users WHERE id = @domi_session_user_id AND rol IN ('system', 'root')
         ) THEN
           SIGNAL SQLSTATE '45000'
             SET MESSAGE_TEXT = 'Seguridad: Solo el administrador/gerente asociado al comercio puede modificar mejoras.';
         END IF;
       END IF;
     END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `commerce_video_comments`
--

DROP TABLE IF EXISTS `commerce_video_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commerce_video_comments`
--

LOCK TABLES `commerce_video_comments` WRITE;
/*!40000 ALTER TABLE `commerce_video_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `commerce_video_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commerce_video_likes`
--

DROP TABLE IF EXISTS `commerce_video_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `commerce_video_likes` (
  `video_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`video_id`,`user_id`),
  KEY `fk_likes_user` (`user_id`),
  CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_likes_video` FOREIGN KEY (`video_id`) REFERENCES `commerce_videos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commerce_video_likes`
--

LOCK TABLES `commerce_video_likes` WRITE;
/*!40000 ALTER TABLE `commerce_video_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `commerce_video_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commerce_videos`
--

DROP TABLE IF EXISTS `commerce_videos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commerce_videos`
--

LOCK TABLES `commerce_videos` WRITE;
/*!40000 ALTER TABLE `commerce_videos` DISABLE KEYS */;
/*!40000 ALTER TABLE `commerce_videos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commerces`
--

DROP TABLE IF EXISTS `commerces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commerces`
--

LOCK TABLES `commerces` WRITE;
/*!40000 ALTER TABLE `commerces` DISABLE KEYS */;
INSERT INTO `commerces` VALUES
(1,1,'Alimentos S.A.S','901234567-1','1',NULL,NULL,NULL,NULL,NULL,'2026-07-09 04:36:48','Empresarial',NULL,NULL,0,'active','2026-07-09 04:36:48.421206'),
(2,4,'Taco Loco S.A.S','901234567-2','2',NULL,NULL,NULL,NULL,NULL,'2026-07-09 04:36:48','Comercial',NULL,NULL,0,'active','2026-07-09 04:36:48.427901');
/*!40000 ALTER TABLE `commerces` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER enforce_single_commerce_insert BEFORE INSERT ON commerces FOR EACH ROW BEGIN DECLARE user_rol VARCHAR(20); IF NEW.usuario_id IS NOT NULL THEN SELECT rol INTO user_rol FROM users WHERE id = NEW.usuario_id; IF user_rol <> 'admin' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol admin puede ser propietario de un comercio.'; END IF; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER auto_create_commerce_wallet
  AFTER INSERT ON commerces FOR EACH ROW
  BEGIN
    INSERT INTO wallets (owner_type, owner_id)
    VALUES ('commerce', NEW.id);
  END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER auto_assign_commerce_manager_role
  AFTER INSERT ON commerces FOR EACH ROW
  BEGIN
    DECLARE role_id_var INT;
    DECLARE old_root INT;
    SET old_root = @domi_is_root;
    SET @domi_is_root = 1;
    IF NEW.usuario_id IS NOT NULL THEN
      SELECT id INTO role_id_var FROM roles WHERE code = 'commerce_manager' LIMIT 1;
      IF role_id_var IS NOT NULL THEN
        INSERT IGNORE INTO user_roles (user_type, user_id, role_id)
        VALUES ('user', NEW.usuario_id, role_id_var);
      END IF;
    END IF;
    SET @domi_is_root = old_root;
  END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER prevent_commerce_owner_change BEFORE UPDATE ON commerces FOR EACH ROW BEGIN IF OLD.usuario_id IS NOT NULL AND NEW.usuario_id IS NOT NULL AND OLD.usuario_id <> NEW.usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El propietario de un comercio no puede reasignarse. Requiere proceso administrativo.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `delivery_companies`
--

DROP TABLE IF EXISTS `delivery_companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_companies`
--

LOCK TABLES `delivery_companies` WRITE;
/*!40000 ALTER TABLE `delivery_companies` DISABLE KEYS */;
INSERT INTO `delivery_companies` VALUES
(1,6,'900999888-1','Servicios de Reparto Bogotá','activo','2026-07-09 04:36:48','2026-07-09 04:36:48');
/*!40000 ALTER TABLE `delivery_companies` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER auto_create_delivery_company_wallet
  AFTER INSERT ON delivery_companies FOR EACH ROW
  BEGIN
    INSERT INTO wallets (owner_type, owner_id)
    VALUES ('delivery_company', NEW.id);
  END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER auto_assign_delivery_company_admin_role
  AFTER INSERT ON delivery_companies FOR EACH ROW
  BEGIN
    DECLARE role_id_var INT;
    DECLARE old_root INT;
    SET old_root = @domi_is_root;
    SET @domi_is_root = 1;
    IF NEW.usuario_id IS NOT NULL THEN
      SELECT id INTO role_id_var FROM roles WHERE code = 'delivery_company_admin' LIMIT 1;
      IF role_id_var IS NOT NULL THEN
        INSERT IGNORE INTO user_roles (user_type, user_id, role_id)
        VALUES ('user', NEW.usuario_id, role_id_var);
      END IF;
    END IF;
    SET @domi_is_root = old_root;
  END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `domi_ledger`
--

DROP TABLE IF EXISTS `domi_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Libro mayor inmutable.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_ledger`
--

LOCK TABLES `domi_ledger` WRITE;
/*!40000 ALTER TABLE `domi_ledger` DISABLE KEYS */;
/*!40000 ALTER TABLE `domi_ledger` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_ledger_withdrawals
     BEFORE INSERT ON domi_ledger
     FOR EACH ROW
     BEGIN
       IF @domi_bypass_security IS NULL THEN
         IF NEW.tx_type IN ('burn_service', 'burn_manual') AND NEW.to_wallet_id IS NULL THEN
           IF (SELECT enabled FROM system_financial_flags WHERE `key` = 'withdrawals_enabled') = 0 THEN
             SIGNAL SQLSTATE '45000'
               SET MESSAGE_TEXT = 'Seguridad DB: Los retiros de tokens DOMI estan suspendidos globalmente.';
           END IF;
         END IF;
       END IF;
     END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_ledger_update BEFORE UPDATE ON domi_ledger FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El libro mayor (domi_ledger) es inmutable. No se permite UPDATE.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_ledger_delete BEFORE DELETE ON domi_ledger FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El libro mayor (domi_ledger) es inmutable. No se permite DELETE.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `domi_order_debts`
--

DROP TABLE IF EXISTS `domi_order_debts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `metadata_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata_json`)),
  `created_at` timestamp(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `paid_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_debts_order` (`order_id`),
  KEY `fk_debts_customer` (`customer_user_id`),
  CONSTRAINT `fk_debts_customer` FOREIGN KEY (`customer_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_debts_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_order_debts`
--

LOCK TABLES `domi_order_debts` WRITE;
/*!40000 ALTER TABLE `domi_order_debts` DISABLE KEYS */;
/*!40000 ALTER TABLE `domi_order_debts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `domi_packages`
--

DROP TABLE IF EXISTS `domi_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `confirmed_at` datetime(6) DEFAULT NULL,
  `confirmed_by` int(11) DEFAULT NULL,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_ref` (`payment_ref`),
  KEY `fk_pkg_store` (`store_id`),
  KEY `fk_pkg_wallet` (`wallet_id`),
  CONSTRAINT `fk_pkg_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`),
  CONSTRAINT `fk_pkg_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de compras de paquetes DOMI por establecimientos.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_packages`
--

LOCK TABLES `domi_packages` WRITE;
/*!40000 ALTER TABLE `domi_packages` DISABLE KEYS */;
/*!40000 ALTER TABLE `domi_packages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `domi_peg_history`
--

DROP TABLE IF EXISTS `domi_peg_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial auditado de todos los cambios de valor del token DOMI. Efecto Trinquete incluido.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_peg_history`
--

LOCK TABLES `domi_peg_history` WRITE;
/*!40000 ALTER TABLE `domi_peg_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `domi_peg_history` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_peg_history_update
BEFORE UPDATE ON domi_peg_history FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El historial de peg del DOMI es inmutable.';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_peg_history_delete
BEFORE DELETE ON domi_peg_history FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El historial de peg del DOMI es inmutable.';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `domi_reserve_alerts`
--

DROP TABLE IF EXISTS `domi_reserve_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cola de alertas de conciliacion bancaria del ecosistema DOMI.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_reserve_alerts`
--

LOCK TABLES `domi_reserve_alerts` WRITE;
/*!40000 ALTER TABLE `domi_reserve_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `domi_reserve_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `domi_reserve_declarations`
--

DROP TABLE IF EXISTS `domi_reserve_declarations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `domi_reserve_declarations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reserva_cop` decimal(20,2) NOT NULL COMMENT 'Saldo bancario real en COP. Fuente de verdad del ratio de colateralizacion.',
  `declared_by` int(11) NOT NULL,
  `fecha_declaracion` date NOT NULL,
  `notas` varchar(1000) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_reserve_date` (`fecha_declaracion` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_reserve_declarations`
--

LOCK TABLES `domi_reserve_declarations` WRITE;
/*!40000 ALTER TABLE `domi_reserve_declarations` DISABLE KEYS */;
/*!40000 ALTER TABLE `domi_reserve_declarations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `domi_store_debts`
--

DROP TABLE IF EXISTS `domi_store_debts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Deudas y compensaciones a pagar por las sedes.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_store_debts`
--

LOCK TABLES `domi_store_debts` WRITE;
/*!40000 ALTER TABLE `domi_store_debts` DISABLE KEYS */;
/*!40000 ALTER TABLE `domi_store_debts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `domi_tier_rules`
--

DROP TABLE IF EXISTS `domi_tier_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_tier_rules`
--

LOCK TABLES `domi_tier_rules` WRITE;
/*!40000 ALTER TABLE `domi_tier_rules` DISABLE KEYS */;
INSERT INTO `domi_tier_rules` VALUES
(1,'standard',6500.00000000,0.00000000,1000.00000000,5,1,2000.00,2000000.00,'2026-07-08 23:36:47'),
(2,'verified_commerce',0.00000000,5000.00000000,125000.00000000,3,1,2000.00,5000000.00,'2026-07-08 23:36:47');
/*!40000 ALTER TABLE `domi_tier_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `domi_withdrawal_log`
--

DROP TABLE IF EXISTS `domi_withdrawal_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de retiros para control del cupo gratuito mensual por billetera';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_withdrawal_log`
--

LOCK TABLES `domi_withdrawal_log` WRITE;
/*!40000 ALTER TABLE `domi_withdrawal_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `domi_withdrawal_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `domi_withdrawal_requests`
--

DROP TABLE IF EXISTS `domi_withdrawal_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cola de retiros fiduciarios. Implementa el Escudo 3 de cooldown del Manifiesto.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domi_withdrawal_requests`
--

LOCK TABLES `domi_withdrawal_requests` WRITE;
/*!40000 ALTER TABLE `domi_withdrawal_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `domi_withdrawal_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driver_priority_counters`
--

DROP TABLE IF EXISTS `driver_priority_counters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `driver_priority_counters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_type` enum('user','delivery_company') NOT NULL,
  `owner_id` int(11) NOT NULL,
  `penalty_points` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_owner` (`owner_type`,`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contadores de prioridad de asignación de repartidores.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_priority_counters`
--

LOCK TABLES `driver_priority_counters` WRITE;
/*!40000 ALTER TABLE `driver_priority_counters` DISABLE KEYS */;
/*!40000 ALTER TABLE `driver_priority_counters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_templates`
--

LOCK TABLES `email_templates` WRITE;
/*!40000 ALTER TABLE `email_templates` DISABLE KEYS */;
INSERT INTO `email_templates` VALUES
(1,'invitation','Invitacion de Afiliacion','affiliations','Invitacion Especial de Afiliacion - Bienestar Digital','<div style=\"font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;\"><div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;\"><div style=\"background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; text-align: center; color: #ffffff;\"><h1 style=\"margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;\">Invitacion de Registro</h1></div><div style=\"padding: 40px;\"><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Estimados representantes de <strong>{{razon_social}}</strong>,</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Te extendemos una invitacion formal para unirse a <strong>Bienestar Digital</strong> como comercio o empresa proveedora autorizada.</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Para iniciar el proceso de registro, por favor completa el formulario publico adjuntando los documentos de ley obligatorios (Logo, RUT, Camara de Comercio y Cedula del Representante Legal):</p><div style=\"text-align: center; margin: 35px 0 25px 0;\"><a href=\"{{registro_url}}\" style=\"background-color: #6366f1; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);\">Completar Registro de Afiliacion</a></div><p style=\"font-size: 14px; line-height: 22px; color: #64748b; text-align: center;\">Este enlace es exclusivo para tu empresa. Si tienes alguna duda, responde a este correo.</p></div><div style=\"background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8;\">Copyright {{year}} Bienestar Digital S.A.S. Todos los derechos reservados.</div></div></div>','[{\"key\":\"razon_social\",\"desc\":\"Razon social de la empresa destinataria\"},{\"key\":\"registro_url\",\"desc\":\"URL del formulario de registro\"},{\"key\":\"year\",\"desc\":\"Ano actual\"}]',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(3,'request_more_info','Solicitud de Correcciones de Registro','affiliations','Se requiere informacion adicional para tu solicitud de afiliacion - Bienestar Digital','<div style=\"font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;\"><div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;\"><div style=\"background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; color: #ffffff;\"><h1 style=\"margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;\">Se requiere corregir informacion</h1></div><div style=\"padding: 40px;\"><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Estimado representante de <strong>{{razon_social}}</strong>,</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Hemos revisado tu solicitud de afiliacion a <strong>Bienestar Digital</strong> y nuestro equipo de auditoria requiere que corrijas o completes algunos datos antes de proceder con la creacion de tu cuenta y wallet corporativa.</p><div style=\"background-color: #fef3c7; border: 1px solid #fde68a; padding: 20px; border-radius: 8px; margin: 25px 0;\"><h3 style=\"margin-top: 0; margin-bottom: 10px; color: #92400e; font-size: 15px; font-weight: 700;\">Detalles a corregir:</h3><ul style=\"margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #78350f;\">{{missing_details_list}}</ul></div><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Por favor ingresa al siguiente enlace seguro para actualizar tu informacion. Encontraras tus datos pre-llenados y los campos a corregir estaran habilitados en color rojo:</p><div style=\"text-align: center; margin: 35px 0 25px 0;\"><a href=\"{{enlace_formulario}}\" style=\"background-color: #d97706; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2);\">Actualizar Informacion de Registro</a></div><p style=\"font-size: 14px; line-height: 22px; color: #64748b; text-align: center;\">Si tienes dudas adicionales, puedes responder directamente a este correo.</p></div><div style=\"background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8;\">Copyright {{year}} Bienestar Digital S.A.S. Todos los derechos reservados.</div></div></div>','[{\"key\":\"razon_social\",\"desc\":\"Razon social del solicitante\"},{\"key\":\"missing_details_list\",\"desc\":\"Lista de campos y documentos desaprobados\"},{\"key\":\"enlace_formulario\",\"desc\":\"Enlace seguro pre-llenado con token JWT\"},{\"key\":\"year\",\"desc\":\"Ano actual\"}]',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(4,'store_admin_password_recovery','Restablecimiento de Contraseña para Admin de Sede','system','Restablecer contraseña de tu cuenta de Sede - Bienestar Digital','<div style=\"font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;\"><div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;\"><div style=\"background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center; color: #ffffff;\"><h1 style=\"margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;\">Restablecer Contraseña</h1></div><div style=\"padding: 40px;\"><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Hola <strong>{{admin_name}}</strong>,</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Se ha solicitado un enlace para restablecer la contraseña de tu cuenta de Administrador de Sede en <strong>Bienestar Digital</strong>.</p><p style=\"font-size: 16px; line-height: 24px; margin-bottom: 20px;\">Para cambiar tu contraseña, por favor haz clic en el siguiente botón. Recuerda que este enlace es válido por 10 minutos:</p><div style=\"text-align: center; margin: 35px 0 25px 0;\"><a href=\"{{recovery_url}}\" style=\"background-color: #10B981; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);\">Restablecer Contraseña</a></div><p style=\"font-size: 14px; line-height: 22px; color: #64748b; text-align: center;\">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p></div><div style=\"background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8;\">Copyright {{year}} Bienestar Digital. Todos los derechos reservados.</div></div></div>','[{\"key\":\"admin_name\",\"desc\":\"Nombre del admin\"},{\"key\":\"recovery_url\",\"desc\":\"Enlace temporal para redefinir clave\"},{\"key\":\"year\",\"desc\":\"Año actual\"}]',1,'2026-07-09 04:36:47','2026-07-09 04:36:47');
/*!40000 ALTER TABLE `email_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `influencer_reels`
--

DROP TABLE IF EXISTS `influencer_reels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `influencer_reels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commerce_id` int(11) NOT NULL,
  `video_url` varchar(255) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `fk_reels_commerce` (`commerce_id`),
  CONSTRAINT `fk_reels_commerce` FOREIGN KEY (`commerce_id`) REFERENCES `commerces` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Videos tipo reels asociados al Estatus de Influencer';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `influencer_reels`
--

LOCK TABLES `influencer_reels` WRITE;
/*!40000 ALTER TABLE `influencer_reels` DISABLE KEYS */;
/*!40000 ALTER TABLE `influencer_reels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingredients`
--

DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ingredients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `es_alergeno` tinyint(1) DEFAULT 0,
  `created_at` timestamp(6) NULL DEFAULT current_timestamp(6),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredients`
--

LOCK TABLES `ingredients` WRITE;
/*!40000 ALTER TABLE `ingredients` DISABLE KEYS */;
INSERT INTO `ingredients` VALUES
(1,'Carne Angus',0,'2026-07-09 04:36:48.503266','2026-07-09 04:36:48.503266'),
(2,'Queso Cheddar',1,'2026-07-09 04:36:48.504985','2026-07-09 04:36:48.504985'),
(3,'Pan Brioche',1,'2026-07-09 04:36:48.506747','2026-07-09 04:36:48.506747'),
(4,'Tomate',0,'2026-07-09 04:36:48.508491','2026-07-09 04:36:48.508491'),
(5,'Lechuga',0,'2026-07-09 04:36:48.510137','2026-07-09 04:36:48.510137'),
(6,'Salchicha Alemana',0,'2026-07-09 04:36:48.511802','2026-07-09 04:36:48.511802'),
(7,'Papas en Cabello de Ángel',0,'2026-07-09 04:36:48.513442','2026-07-09 04:36:48.513442');
/*!40000 ALTER TABLE `ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_bypass_rules`
--

DROP TABLE IF EXISTS `maintenance_bypass_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `maintenance_bypass_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `pattern` varchar(255) NOT NULL COMMENT 'Patrón de URL o prefijo de API (Ej: /api/auth/login, /login, /)',
  `type` enum('api','page') NOT NULL DEFAULT 'api' COMMENT 'Tipo de recurso (API de backend o página del frontend)',
  `description` varchar(255) DEFAULT NULL COMMENT 'Descripción del propósito del bypass.',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_system` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = regla critica del sistema, no eliminable desde el panel',
  PRIMARY KEY (`id`),
  UNIQUE KEY `pattern` (`pattern`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_bypass_rules`
--

LOCK TABLES `maintenance_bypass_rules` WRITE;
/*!40000 ALTER TABLE `maintenance_bypass_rules` DISABLE KEYS */;
INSERT INTO `maintenance_bypass_rules` VALUES
(1,'/api/auth/login','api','Permite a los usuarios acceder al login','2026-07-09 04:36:47',1),
(2,'/api/public/maintenance-status','api','Permite al frontend consultar el estado de mantenimiento','2026-07-09 04:36:47',1),
(3,'/api/manage/system/maintenance/status','api','Permite al dashboard administrativo consultar el estado de mantenimiento','2026-07-09 04:36:47',1),
(4,'/api/manage/system/maintenance/disable','api','Permite al dashboard desactivar el modo mantenimiento','2026-07-09 04:36:47',1),
(5,'/api/manage/system/maintenance/panic','api','Permite activar o desactivar la revocación global crítica','2026-07-09 04:36:47',1),
(6,'/api/manage/system/maintenance/logs','api','Permite leer logs del sistema en la consola','2026-07-09 04:36:47',1),
(7,'/api/manage/system/maintenance/bypass-rules','api','Administrar las excepciones de mantenimiento','2026-07-09 04:36:47',1),
(8,'/api/public/maintenance-bypass-rules','api','Consultar las excepciones de mantenimiento públicamente','2026-07-09 04:36:47',1),
(9,'/login','page','Página de inicio de sesión del frontend','2026-07-09 04:36:47',1),
(10,'/','page','Página principal (Home) pública del frontend','2026-07-09 04:36:47',1);
/*!40000 ALTER TABLE `maintenance_bypass_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menus`
--

DROP TABLE IF EXISTS `menus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menus`
--

LOCK TABLES `menus` WRITE;
/*!40000 ALTER TABLE `menus` DISABLE KEYS */;
INSERT INTO `menus` VALUES
(1,1,'Menú Principal','Catálogo de muestra',0,1,'2026-07-09 04:36:48','2026-07-09 04:36:48.516607',NULL),
(2,1,'Combos y Promos','Catálogo de muestra',0,1,'2026-07-09 04:36:48','2026-07-09 04:36:48.544529',NULL),
(3,1,'Bebidas','Catálogo de muestra',0,1,'2026-07-09 04:36:48','2026-07-09 04:36:48.556624',NULL),
(4,2,'Menú Principal','Catálogo de muestra',0,1,'2026-07-09 04:36:48','2026-07-09 04:36:48.564295',NULL),
(5,2,'Combos y Promos','Catálogo de muestra',0,1,'2026-07-09 04:36:48','2026-07-09 04:36:48.583045',NULL),
(6,2,'Bebidas','Catálogo de muestra',0,1,'2026-07-09 04:36:48','2026-07-09 04:36:48.596337',NULL),
(7,3,'Menú Principal','Catálogo de muestra',0,1,'2026-07-09 04:36:48','2026-07-09 04:36:48.605373',NULL),
(8,3,'Combos y Promos','Catálogo de muestra',0,1,'2026-07-09 04:36:48','2026-07-09 04:36:48.625507',NULL),
(9,3,'Bebidas','Catálogo de muestra',0,1,'2026-07-09 04:36:48','2026-07-09 04:36:48.642765',NULL);
/*!40000 ALTER TABLE `menus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_incidents`
--

DROP TABLE IF EXISTS `order_incidents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de incidencias por pedido.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_incidents`
--

LOCK TABLES `order_incidents` WRITE;
/*!40000 ALTER TABLE `order_incidents` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_incidents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_messages`
--

DROP TABLE IF EXISTS `order_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_messages`
--

LOCK TABLES `order_messages` WRITE;
/*!40000 ALTER TABLE `order_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_offer_rejections`
--

DROP TABLE IF EXISTS `order_offer_rejections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_offer_rejections`
--

LOCK TABLES `order_offer_rejections` WRITE;
/*!40000 ALTER TABLE `order_offer_rejections` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_offer_rejections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `customer_user_id` int(11) NOT NULL,
  `driver_user_id` int(11) DEFAULT NULL,
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
  CONSTRAINT `fk_order_customer` FOREIGN KEY (`customer_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_order_delivery_company` FOREIGN KEY (`delivery_company_id`) REFERENCES `delivery_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_driver` FOREIGN KEY (`driver_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_order_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`),
  CONSTRAINT `fk_orders_current_offer_driver` FOREIGN KEY (`current_offer_driver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pedidos del marketplace.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER enforce_customer_role_on_order_insert
            BEFORE INSERT ON orders FOR EACH ROW
            BEGIN
                DECLARE user_rol VARCHAR(20);
                SELECT rol INTO user_rol FROM users WHERE id = NEW.customer_user_id;
                IF user_rol IS NULL OR user_rol <> 'customer' THEN
                    SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede realizar pedidos.';
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `payment_platforms`
--

DROP TABLE IF EXISTS `payment_platforms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_platforms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo_entidad` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_platforms`
--

LOCK TABLES `payment_platforms` WRITE;
/*!40000 ALTER TABLE `payment_platforms` DISABLE KEYS */;
INSERT INTO `payment_platforms` VALUES
(1,'Wompi','pasarela','2026-07-09 04:36:47','2026-07-09 04:36:47.765652'),
(2,'PSE','banco','2026-07-09 04:36:47','2026-07-09 04:36:47.768103'),
(3,'Efectivo','efectivo','2026-07-09 04:36:47','2026-07-09 04:36:47.769520');
/*!40000 ALTER TABLE `payment_platforms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permission_categories`
--

DROP TABLE IF EXISTS `permission_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permission_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permission_categories`
--

LOCK TABLES `permission_categories` WRITE;
/*!40000 ALTER TABLE `permission_categories` DISABLE KEYS */;
INSERT INTO `permission_categories` VALUES
(1,'Seguridad','Bitácora de auditoría y gestión de roles','2026-07-09 04:36:46'),
(2,'Afiliaciones','Registro y aprobación de comercios y delivery','2026-07-09 04:36:46'),
(3,'Catálogo Maestro','Gestión de comercios, sedes y catálogos globales','2026-07-09 04:36:46'),
(4,'Operaciones','Pedidos, asignaciones y gestión de personal de sedes','2026-07-09 04:36:46'),
(5,'Videos/Reels','Subida y gestión de videos','2026-07-09 04:36:46'),
(6,'Planes','Suscripciones y planes de comercios','2026-07-09 04:36:46'),
(7,'Inteligencia','Estadísticas, autotagging y stop-words','2026-07-09 04:36:46'),
(8,'Finanzas DOMI','Libro mayor y compra/gasto de DOMIs','2026-07-09 04:36:46'),
(9,'Logística','Gestión de repartidores','2026-07-09 04:36:46'),
(10,'IA Generativa','Uso de IA para autotags y generación de contenido','2026-07-09 04:36:46');
/*!40000 ALTER TABLE `permission_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permission_endpoints`
--

DROP TABLE IF EXISTS `permission_endpoints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permission_endpoints` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `permission_id` int(11) NOT NULL,
  `method_path` varchar(255) NOT NULL COMMENT 'Ej: GET /api/management/commerces',
  PRIMARY KEY (`id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `permission_endpoints_ibfk_1` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1388 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permission_endpoints`
--

LOCK TABLES `permission_endpoints` WRITE;
/*!40000 ALTER TABLE `permission_endpoints` DISABLE KEYS */;
INSERT INTO `permission_endpoints` VALUES
(1269,1,'GET /api/management/security-logs'),
(1270,2,'GET /api/manage/roles'),
(1271,2,'POST /api/manage/roles'),
(1272,2,'PUT /api/manage/roles/:id'),
(1273,2,'DELETE /api/manage/roles/:id'),
(1274,2,'PUT /api/manage/users/:id/roles'),
(1275,3,'POST /api/manage/users (implícito)'),
(1276,56,'GET /api/system/maintenance/status'),
(1277,57,'POST /api/system/maintenance/enable'),
(1278,57,'POST /api/system/maintenance/disable'),
(1279,57,'POST /api/system/maintenance/panic'),
(1280,58,'GET /api/system/maintenance/logs'),
(1281,47,'GET /api/management/requests'),
(1282,47,'POST /api/requests/invite'),
(1283,47,'GET /api/requests/invitations'),
(1284,47,'POST /api/requests/:id/reject'),
(1285,47,'POST /api/requests/:id/approve'),
(1286,47,'POST /api/requests/:id/send-info-request'),
(1287,47,'GET /api/requests/:id/history'),
(1288,47,'PATCH /api/requests/:id/verify-progress'),
(1289,51,'GET /api/manage/email-templates'),
(1290,51,'POST /api/manage/email-templates'),
(1291,51,'GET /api/manage/email-templates/:name'),
(1292,51,'PUT /api/manage/email-templates/:name'),
(1293,48,'GET /api/manage/upgrades/active'),
(1294,8,'GET /api/management/commerces'),
(1295,8,'GET /api/management/commerces/:id'),
(1296,9,'POST /api/management/commerces'),
(1297,10,'PUT /api/management/commerces/:id'),
(1298,10,'PATCH /api/management/commerces/:id/status'),
(1299,11,'GET /api/management/my-stores'),
(1300,11,'GET /api/management/stores/:commerceId'),
(1301,11,'GET /api/management/store/:id'),
(1302,12,'POST /api/management/stores'),
(1303,59,'POST /api/management/stores (modo edición básico)'),
(1304,60,'POST /api/management/stores (modo edición avanzado)'),
(1305,14,'GET /api/management/menus/:commerceId'),
(1306,14,'GET /api/management/categories/:menuId'),
(1307,14,'GET /api/management/products'),
(1308,14,'GET /api/management/ingredients'),
(1309,14,'GET /api/management/store-menus/:storeId'),
(1310,14,'GET /api/management/store-categories/:storeId/:menuId'),
(1311,14,'GET /api/management/store-products/:storeId/:categoriaId'),
(1312,61,'POST /api/management/store-menus'),
(1313,61,'POST /api/management/store-categories'),
(1314,62,'POST /api/management/menus'),
(1315,62,'POST /api/management/categories'),
(1316,62,'POST /api/management/products'),
(1317,62,'POST /api/management/store-products'),
(1318,62,'POST /api/upload/:entityType'),
(1319,63,'DELETE /api/management/menus/:id'),
(1320,63,'DELETE /api/management/categories/:id'),
(1321,63,'DELETE /api/management/products/:id'),
(1322,17,'Crear Sede (parámetro cloneSourceStoreId)'),
(1323,18,'GET /api/management/orders'),
(1324,19,'POST /api/orders/:id/status (implícito)'),
(1325,20,'GET /api/management/store-admins'),
(1326,21,'POST /api/management/store-admins'),
(1327,21,'PUT /api/management/store-admins/:id'),
(1328,21,'PUT /api/management/store-admins/:id/status'),
(1329,22,'PATCH /api/management/stores/:id/order-acceptance'),
(1330,23,'POST /api/management/videos'),
(1331,23,'PATCH /api/management/videos/:id/active'),
(1332,24,'DELETE /api/management/videos/:id'),
(1333,49,'POST /api/manage/upgrades/purchase'),
(1334,52,'GET /api/manage/upgrades/catalog'),
(1335,52,'PATCH /api/manage/upgrades/catalog/:key'),
(1336,52,'GET /api/manage/upgrades/admin/all'),
(1337,52,'POST /api/manage/upgrades/admin/grant'),
(1338,52,'PATCH /api/manage/upgrades/admin/:id/revoke'),
(1339,26,'GET /api/management/analytics/popularity'),
(1340,27,'POST /api/management/analytics/trigger'),
(1341,27,'GET /api/management/intelligence/stop-words'),
(1342,27,'POST /api/management/intelligence/stop-words'),
(1343,27,'DELETE /api/management/intelligence/stop-words/:id'),
(1344,27,'POST /api/management/intelligence/generate-tags'),
(1345,33,'POST /api/generate/'),
(1346,32,'GET /api/delivery-company/drivers'),
(1347,32,'POST /api/delivery-company/drivers'),
(1348,32,'DELETE /api/delivery-company/drivers/:userId'),
(1349,28,'GET /api/domi/wallet/system'),
(1350,28,'GET /api/domi/ledger'),
(1351,29,'POST /api/domi/mint'),
(1352,29,'POST /api/domi/wallet/store/:storeId/topup'),
(1353,64,'POST /api/domi/payment/checkout-session'),
(1354,30,'POST /api/orders/'),
(1355,31,'POST /api/domi/withdraw'),
(1356,50,'PUT /api/admin/financial-flags'),
(1357,41,'POST /api/domi/burn-manual'),
(1358,40,'POST /api/domi/mint-manual'),
(1359,38,'POST /api/domi/transfer'),
(1360,39,'POST /api/domi/subscriptions/pay'),
(1361,65,'GET /api/admin/system/parameters'),
(1362,65,'PATCH /api/admin/system/parameters'),
(1363,43,'GET /api/cash/summary'),
(1364,43,'GET /api/cash/transactions'),
(1365,43,'GET /api/cash/bank/deposits'),
(1366,43,'GET /api/cash/operator/history'),
(1367,44,'POST /api/cash/transaction'),
(1368,45,'POST /api/cash/bank/deposit'),
(1369,46,'POST /api/cash/bank/deposit/:id/reconcile'),
(1370,53,'GET /tiers/rules'),
(1371,53,'PUT /tiers/rules/:tier'),
(1372,53,'POST /peg/apply'),
(1373,53,'POST /approve-excess-purchase'),
(1374,54,'GET /treasury/status'),
(1375,54,'GET /treasury/peg/history'),
(1376,55,'GET /treasury/withdrawals'),
(1377,55,'POST /treasury/withdrawals/:id/process'),
(1378,66,'POST /treasury/reserve/declare'),
(1379,67,'POST /treasury/mint/cash'),
(1380,68,'POST /treasury/mint/confirm/:packageId'),
(1381,70,'GET /api/delivery-company/dashboard/stats'),
(1382,70,'GET /api/delivery-company/orders/available'),
(1383,70,'GET /api/delivery-company/orders/history'),
(1384,70,'POST /api/delivery-company/orders/:orderId/accept'),
(1385,70,'POST /api/delivery-company/orders/:orderId/assign-driver'),
(1386,32,'GET /api/delivery-company/drivers/available'),
(1387,14,'GET /api/management/categories/:categoryId/products');
/*!40000 ALTER TABLE `permission_endpoints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permission_impacted_tables`
--

DROP TABLE IF EXISTS `permission_impacted_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permission_impacted_tables` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `permission_id` int(11) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `permission_impacted_tables_ibfk_1` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1490 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permission_impacted_tables`
--

LOCK TABLES `permission_impacted_tables` WRITE;
/*!40000 ALTER TABLE `permission_impacted_tables` DISABLE KEYS */;
INSERT INTO `permission_impacted_tables` VALUES
(1364,1,'security_audit_logs'),
(1365,1,'users'),
(1366,1,'system_users'),
(1367,2,'roles'),
(1368,2,'role_permissions'),
(1369,2,'user_roles'),
(1370,3,'system_users'),
(1371,3,'user_roles'),
(1372,47,'registration_requests'),
(1373,47,'users'),
(1374,47,'profiles'),
(1375,47,'commerces'),
(1376,47,'delivery_companies'),
(1377,51,'email_templates'),
(1378,48,'commerce_upgrades'),
(1379,8,'commerces'),
(1380,8,'users'),
(1381,9,'commerces'),
(1382,9,'users'),
(1383,9,'profiles'),
(1384,10,'commerces'),
(1385,11,'stores'),
(1386,11,'user_stores'),
(1387,12,'stores'),
(1388,12,'user_stores'),
(1389,12,'users'),
(1390,12,'profiles'),
(1391,59,'stores'),
(1392,59,'store_operating_hours'),
(1393,60,'stores'),
(1394,60,'store_accounts'),
(1395,60,'profiles'),
(1396,60,'users'),
(1397,14,'menus'),
(1398,14,'categorias'),
(1399,14,'products'),
(1400,14,'product_ingredients'),
(1401,14,'store_menus'),
(1402,14,'store_categories'),
(1403,14,'store_products'),
(1404,61,'store_menus'),
(1405,61,'store_categories'),
(1406,62,'menus'),
(1407,62,'categorias'),
(1408,62,'products'),
(1409,62,'product_ingredients'),
(1410,62,'store_products'),
(1411,63,'menus'),
(1412,63,'categorias'),
(1413,63,'products'),
(1414,17,'menus'),
(1415,17,'categorias'),
(1416,17,'products'),
(1417,17,'store_menus'),
(1418,17,'store_categories'),
(1419,17,'store_products'),
(1420,18,'orders'),
(1421,18,'order_items'),
(1422,19,'orders'),
(1423,19,'domi_ledger'),
(1424,20,'users'),
(1425,20,'profiles'),
(1426,20,'user_stores'),
(1427,21,'users'),
(1428,21,'profiles'),
(1429,21,'user_stores'),
(1430,22,'stores'),
(1431,23,'commerce_videos'),
(1432,24,'commerce_videos'),
(1433,49,'commerce_upgrades'),
(1434,49,'domi_ledger'),
(1435,52,'upgrade_catalog'),
(1436,52,'commerce_upgrades'),
(1437,52,'domi_ledger'),
(1438,52,'security_audit_logs'),
(1439,26,'product_popularity'),
(1440,26,'orders'),
(1441,26,'order_items'),
(1442,27,'stop_words'),
(1443,27,'product_popularity'),
(1444,27,'products'),
(1445,33,'products'),
(1446,32,'users'),
(1447,32,'profiles'),
(1448,32,'delivery_companies'),
(1449,28,'domi_ledger'),
(1450,28,'token_registry'),
(1451,29,'domi_ledger'),
(1452,29,'token_registry'),
(1453,64,'domi_ledger'),
(1454,64,'token_registry'),
(1455,64,'domi_packages'),
(1456,30,'domi_ledger'),
(1457,31,'domi_ledger'),
(1458,31,'token_registry'),
(1459,50,'system_financial_flags'),
(1460,50,'domi_ledger'),
(1461,41,'domi_ledger'),
(1462,41,'token_registry'),
(1463,40,'domi_ledger'),
(1464,40,'token_registry'),
(1465,38,'domi_ledger'),
(1466,39,'domi_ledger'),
(1467,39,'commerce_upgrades'),
(1468,65,'system_parameters'),
(1469,43,'cash_vault'),
(1470,43,'cash_transactions'),
(1471,44,'cash_vault'),
(1472,44,'cash_transactions'),
(1473,45,'bank_deposits'),
(1474,46,'bank_deposits'),
(1475,46,'cash_vault'),
(1476,53,'token_registry'),
(1477,53,'system_parameters'),
(1478,54,'token_registry'),
(1479,54,'domi_ledger'),
(1480,55,'domi_withdrawal_log'),
(1481,55,'domi_ledger'),
(1482,66,'token_registry'),
(1483,67,'domi_ledger'),
(1484,67,'token_registry'),
(1485,68,'domi_ledger'),
(1486,68,'token_registry'),
(1487,70,'orders'),
(1488,70,'wallets'),
(1489,70,'domi_ledger');
/*!40000 ALTER TABLE `permission_impacted_tables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES
(1,1,'view_security_logs','Ver bitácora de auditoría','Ver Bitácora de Seguridad','Media','Lectura','Permite auditar accesos e intentos de intrusión, pero expone metadatos de IP y actividades de otros administradores.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(2,1,'manage_rbac','Gestionar roles y permisos del sistema','Gestionar Roles y Permisos (RBAC)','Crítica','Escritura','Máximo privilegio de autorización. Permite alterar la matriz de acceso de cualquier rol e indirectamente escalar privilegios. Protegido en DB por triggers.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(3,1,'create_system_user','Crear personal administrativo del sistema','Crear Usuario de Sistema','Alta','Escritura','Permite dar de alta a nuevos empleados en la casa matriz con roles de sistema.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(8,3,'view_commerces','Ver lista y detalle de comercios','Ver Comercios','Baja','Lectura','Visualización de información comercial y cuentas vinculadas.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(9,3,'create_commerce','Crear nuevo comercio','Crear Comercio','Alta','Escritura','Creación directa de comercios asociados a administradores sin pasar por solicitudes.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(10,3,'edit_commerce','Editar datos de comercio','Editar Comercio','Media','Escritura','Permite modificar datos fiscales, teléfonos y estado operacional (activo/inactivo) de un comercio. El NIT se valida como inmutable.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(11,3,'view_stores','Ver lista y detalle de sedes','Ver Sedes','Baja','Lectura','Lectura de sucursales físicas asociadas a comercios.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(12,3,'create_store','Crear nueva sede','Crear Sede','Alta','Escritura','Registra una nueva sucursal comercial y asocia/crea su administrador. Requiere matrícula mercantil única.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(13,3,'edit_store','Editar datos de sede',NULL,'Media','Escritura',NULL,'hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(14,3,'view_catalog','Ver menús, categorías y productos','Ver Catálogo Global','Baja','Lectura','Acceso de lectura al catálogo global de productos y menús.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(15,3,'manage_catalog','Gestionar menús, categorías y productos',NULL,'Media','Escritura',NULL,'hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(16,3,'manage_store_catalog','Gestionar disponibilidad y precios por sede',NULL,'Media','Escritura',NULL,'hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(17,3,'clone_store_catalog','Clonar el catálogo completo de otra sede','Clonar Catálogo de Sede','Media','Escritura','Permite copiar toda la estructura de productos y menús de una sede a otra del mismo comercio.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(18,4,'view_orders','Ver pedidos de la sede','Ver Pedidos','Baja','Lectura','Permite consultar el flujo de comandas entrantes.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(19,4,'manage_orders','Gestionar estados de pedidos','Gestionar Pedidos','Media','Escritura','Permite aceptar, despachar o cancelar pedidos de clientes, impactando el flujo operativo de los repartidores.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(20,4,'view_store_admins','Ver administradores de sede','Ver Admins de Sede','Baja','Lectura','Consulta de gerentes a cargo de cada sucursal.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(21,4,'manage_store_admins','Gestionar administradores de sede','Gestionar Admins de Sede','Media','Escritura','Creación de cuentas y control operativo de acceso de los operadores de sede.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(22,4,'manage_order_acceptance','Gestionar modo de aceptación de pedidos','Gestionar Aceptación Automática','Media','Escritura','Habilita que el backend asigne repartidores y apruebe de forma automatizada los pedidos.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(23,5,'upload_videos','Subir y activar videos','Subir Videos Publicitarios','Baja','Escritura','Gestión del contenido multimedia publicitario visible en la App Móvil.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(24,5,'delete_videos','Eliminar videos','Eliminar Videos Publicitarios','Baja','Escritura','Remoción de videos promocionales del feed público.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(25,6,'manage_plans','Contratar y gestionar planes',NULL,'Media','Escritura',NULL,'ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(26,7,'view_analytics','Ver estadísticas y popularidad','Ver Analíticas y Popularidad','Baja','Lectura','Visualización de métricas de ventas agregadas para inteligencia comercial.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(27,7,'manage_intelligence','Gestionar autotags y stop-words','Gestionar Inteligencia y Stop Words','Media','Escritura','Configuración del indexador semántico y limpieza de palabras clave en productos.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(28,8,'view_ledger','Ver libro mayor y balance del sistema','Ver Libro Mayor','Alta','Lectura','Lectura de saldos, movimientos y acuñación global de tokens. Privilegio de auditoría.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(29,8,'purchase_domis','Comprar/Acuñar tokens DOMI','Comprar/Acuñar Tokens DOMI','Crítica','Escritura','Permite emitir tokens del ecosistema. Afecta directamente el valor financiero circulante.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(30,8,'spend_domis','Gastar tokens DOMI','Gastar Tokens DOMI','Alta','Escritura','Operación transaccional clave de débito de billetera del cliente a favor del comercio/repartidor.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(31,8,'withdraw_domis','Retirar tokens DOMI (máximo privilegio)','Retirar/Fiar Tokens DOMI','Crítica','Escritura','Máximo privilegio financiero. Permite transferir capital fuera del libro mayor transaccional.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(32,9,'manage_drivers','Gestionar repartidores de la empresa de mensajería','Gestionar Repartidores','Media','Escritura','Permite afiliar repartidores a empresas de mensajería para asignación de domicilios.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(33,10,'use_ai_generation','Usar Gemini para generación de textos','Usar Generación por IA','Baja','Escritura','Utiliza el consumo de cuotas del backend para invocar a Gemini.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(38,8,'transfer_domis','Transferir saldo en tokens DOMI a otras cuentas del ecosistema','Transferir DOMIs','Alta','Escritura','Permite transferencias internas de tokens DOMI entre billeteras de usuarios.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(39,8,'pay_subscriptions_domis','Pagar suscripciones de servicios especiales utilizando tokens DOMI','Pagar Suscripciones con DOMIs','Alta','Escritura','Permite el pago de planes de suscripción utilizando tokens DOMI.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(40,8,'mint_manual_domis','Acuñar tokens DOMI de forma manual en representación de dinero fiduciario captado','Acuñar Manualmente DOMIs','Crítica','Escritura','Permite la emisión y acreditación directa de tokens DOMI a billeteras específicas.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(41,8,'burn_manual_domis','Quemar tokens DOMI para retiro o reembolso de dinero fiduciario por operador autorizado','Quemar Manualmente DOMIs','Crítica','Escritura','Permite la destrucción manual de tokens DOMI en billeteras específicas para ajustes de contabilidad.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(43,8,'view_cash_vault','Permite ver el saldo y transacciones de caja física','Ver Bóveda de Efectivo','Alta','Lectura','Permite ver saldos y transacciones físicas en efectivo.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(44,8,'manage_cash_vault','Permite registrar entradas, salidas y ajustes de arqueo en caja','Gestionar Bóveda de Efectivo','Crítica','Escritura','Permite registrar transacciones y movimientos en efectivo físico.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(45,8,'register_bank_deposit','Permite reportar consignaciones bancarias pendientes','Registrar Depósito Bancario','Alta','Escritura','Permite ingresar registros de consignaciones bancarias pendientes de conciliación.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(46,8,'reconcile_bank_deposit','Permite aprobar consignaciones bancarias y acuñar DOMIs','Conciliar Depósito Bancario','Crítica','Escritura','Permite aprobar y conciliar depósitos bancarios de efectivo.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(47,2,'manage_registration_requests','Permite ver, aprobar y rechazar solicitudes de registro de comercios','Gestionar Solicitudes de Afiliación','Alta','Escritura','Permite leer, aprobar, rechazar e invitar solicitudes de registro de comercios y delivery de forma consolidada.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(48,2,'view_upgrades_market','Permite ver el mercado de mejoras y estados de buffs','Ver Mercado de Mejoras','Baja','Lectura','Permite ver el mercado de mejoras y estados de buffs.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(49,2,'purchase_upgrades','Permite adquirir mejoras utilizando tokens DOMI','Adquirir Mejoras','Media','Escritura','Permite adquirir mejoras utilizando tokens DOMI.','ghost','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(50,8,'suspend_withdrawals','Permite suspender o habilitar globalmente los retiros de DOMIs por dinero real.','Suspender Retiros Globales','Crítica','Escritura','Permite suspender o habilitar globalmente los retiros de DOMIs por dinero real. Solo aplicable para el rol root.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(51,2,'manage_email_templates','Crear, leer y editar plantillas de correo electronico del sistema','Gestionar Plantillas de Correo','Media','Escritura','Permite crear, leer y actualizar las plantillas de correo electrónico transaccionales del sistema.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(52,1,'manage_upgrades_catalog','Permite al root ver todas las mejoras del ecosistema, editar el catalogo (precios, duraciones), otorgar mejoras manualmente y revocarlas.','Administrar Catálogo de Mejoras','Alta','Escritura','Permite al root editar el catálogo de mejoras (precios, duraciones, activación), listar todas las mejoras del ecosistema, otorgar mejoras manuales sin cobro y revocar mejoras activas. Cada operación queda registrada en security_audit_logs.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(53,8,'manage_domi_peg','Permiso de tesoreria: manage_domi_peg','Gestionar Paridad DOMI (Treasury)','Crítica','Escritura','Permite regular las tasas, reglas de paridad y compra de excesos de DOMIs en la tesorería.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(54,8,'view_domi_pricing','Permiso de tesoreria: view_domi_pricing','Ver Precios y Estado de Tesorería','Media','Lectura','Visualización de estados financieros, reservas y tasas de cambio en la tesorería.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(55,8,'approve_withdrawals','Permiso de tesoreria: approve_withdrawals','Aprobar Retiros de Tesorería','Crítica','Escritura','Aprobación manual y despacho de transferencias financieras de retiro de fondos.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(56,1,'view_maintenance_status','Ver Estado Mantenimiento','Ver Estado Mantenimiento','Baja','Lectura','Ver el estado de diagnósticos del sistema y si está activo el modo mantenimiento.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(57,1,'manage_maintenance','Gestionar Mantenimiento','Gestionar Mantenimiento','Crítica','Escritura','Activar o desactivar el modo mantenimiento del sistema, así como realizar una revocación crítica global (pánico).','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(58,1,'view_system_logs','Ver Logs del Sistema','Ver Logs del Sistema','Alta','Lectura','Lectura directa de las últimas líneas del archivo combined.log del backend.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(59,3,'edit_store_basic','Editar Datos Básicos Sede','Editar Datos Básicos Sede','Baja','Escritura','Editar datos básicos de la sede (Teléfonos, foto, horarios, estado y fecha de regreso)','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(60,3,'edit_store_advanced','Editar Datos Avanzados Sede','Editar Datos Avanzados Sede','Media','Escritura','Editar datos avanzados de la sede (Nombres/apellidos del admin, dirección, geolocalización, billeteras y cuentas bancarias)','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(61,3,'enable_store_catalog','Habilitar Catálogo en Sede','Habilitar Catálogo en Sede','Media','Escritura','Habilitar menús y categorías para la sede','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(62,3,'write_catalog','Crear/Editar Catálogo','Crear/Editar Catálogo','Media','Escritura','Crear y editar menús, categorías y productos','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(63,3,'delete_catalog','Eliminar Catálogo','Eliminar Catálogo','Media','Escritura','Eliminar menús, categorías y productos','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(64,8,'checkout_domis','Iniciar Pago Wompi para DOMIs','Iniciar Pago Wompi para DOMIs','Alta','Escritura','Permite que un usuario autenticado genere una sesión de pago firmada con SHA256 en Wompi para acuñar DOMIs en su propia billetera.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(65,8,'manage_protocol_rules','Gestionar Reglas de Protocolo','Gestionar Reglas de Protocolo','Alta','Escritura','Permite configurar los parámetros del protocolo financiero del token y el backend.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(66,8,'declare_domi_reserve','Declarar Reserva de Tesorería','Declarar Reserva de Tesorería','Crítica','Escritura','Permite registrar el respaldo oficial en fiat de los tokens en circulación.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(67,8,'mint_domi_cash','Minar Efectivo DOMI (Treasury)','Minar Efectivo DOMI (Treasury)','Crítica','Escritura','Emisión masiva de tokens para liquidez de tesorería.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(68,8,'confirm_domi_reserve','Confirmar Reserva DOMI (Treasury)','Confirmar Reserva DOMI (Treasury)','Crítica','Escritura','Confirmación final de respaldo fiat y liberación de paquetes de liquidez.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46'),
(70,9,'accept_delivery_orders','Aceptar y gestionar pedidos de reparto','Aceptar Pedidos de Reparto','Media','Escritura','Permite aceptar pedidos en estado Listo y asignar repartidores afiliados a la empresa de reparto, debitando la comisión corporativa.','hidden','2026-07-09 04:36:46','2026-07-09 04:36:46');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_ingredients`
--

DROP TABLE IF EXISTS `product_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_ingredients`
--

LOCK TABLES `product_ingredients` WRITE;
/*!40000 ALTER TABLE `product_ingredients` DISABLE KEYS */;
INSERT INTO `product_ingredients` VALUES
(1,1,'2026-07-09 04:36:48.525466','2026-07-09 04:36:48.525466'),
(1,2,'2026-07-09 04:36:48.527756','2026-07-09 04:36:48.527756'),
(1,3,'2026-07-09 04:36:48.528839','2026-07-09 04:36:48.528839'),
(1,4,'2026-07-09 04:36:48.530213','2026-07-09 04:36:48.530213'),
(1,5,'2026-07-09 04:36:48.531431','2026-07-09 04:36:48.531431'),
(2,2,'2026-07-09 04:36:48.535627','2026-07-09 04:36:48.535627'),
(2,6,'2026-07-09 04:36:48.534359','2026-07-09 04:36:48.534359'),
(2,7,'2026-07-09 04:36:48.536787','2026-07-09 04:36:48.536787'),
(6,1,'2026-07-09 04:36:48.568358','2026-07-09 04:36:48.568358'),
(6,2,'2026-07-09 04:36:48.569224','2026-07-09 04:36:48.569224'),
(6,3,'2026-07-09 04:36:48.570194','2026-07-09 04:36:48.570194'),
(6,4,'2026-07-09 04:36:48.571040','2026-07-09 04:36:48.571040'),
(6,5,'2026-07-09 04:36:48.571940','2026-07-09 04:36:48.571940'),
(7,2,'2026-07-09 04:36:48.575036','2026-07-09 04:36:48.575036'),
(7,6,'2026-07-09 04:36:48.574089','2026-07-09 04:36:48.574089'),
(7,7,'2026-07-09 04:36:48.575961','2026-07-09 04:36:48.575961'),
(11,1,'2026-07-09 04:36:48.609663','2026-07-09 04:36:48.609663'),
(11,2,'2026-07-09 04:36:48.610804','2026-07-09 04:36:48.610804'),
(11,3,'2026-07-09 04:36:48.611909','2026-07-09 04:36:48.611909'),
(11,4,'2026-07-09 04:36:48.612820','2026-07-09 04:36:48.612820'),
(11,5,'2026-07-09 04:36:48.613783','2026-07-09 04:36:48.613783'),
(12,2,'2026-07-09 04:36:48.617322','2026-07-09 04:36:48.617322'),
(12,6,'2026-07-09 04:36:48.616372','2026-07-09 04:36:48.616372'),
(12,7,'2026-07-09 04:36:48.618379','2026-07-09 04:36:48.618379');
/*!40000 ALTER TABLE `product_ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_popularity`
--

DROP TABLE IF EXISTS `product_popularity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_popularity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) DEFAULT NULL,
  `sales_count` int(11) DEFAULT 0,
  `last_update` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  CONSTRAINT `product_popularity_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_popularity`
--

LOCK TABLES `product_popularity` WRITE;
/*!40000 ALTER TABLE `product_popularity` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_popularity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES
(1,1,'Hamburguesa Especial','Hamburguesa con carne Angus, queso cheddar, lechuga y tomate.',18000.00,15,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,1,1,1,0,NULL,NULL),
(2,1,'Perro Caliente Premium','Perro caliente con salchicha alemana, queso fundido y papitas.',12000.00,10,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,1,1,1,0,NULL,NULL),
(3,1,'Papas Fritas Medianas','Papas fritas crujientes con sal.',6000.00,8,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,1,2,1,0,NULL,NULL),
(4,1,'Coca-Cola 350ml','Refrescante Coca-Cola sabor original.',4000.00,5,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,3,7,1,0,NULL,NULL),
(5,1,'Sprite 350ml','Refrescante Sprite sabor lima-limón.',3800.00,5,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,3,7,1,0,NULL,NULL),
(6,2,'Hamburguesa Especial','Hamburguesa con carne Angus, queso cheddar, lechuga y tomate.',18000.00,15,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,4,9,1,0,NULL,NULL),
(7,2,'Perro Caliente Premium','Perro caliente con salchicha alemana, queso fundido y papitas.',12000.00,10,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,4,9,1,0,NULL,NULL),
(8,2,'Papas Fritas Medianas','Papas fritas crujientes con sal.',6000.00,8,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,4,10,1,0,NULL,NULL),
(9,2,'Coca-Cola 350ml','Refrescante Coca-Cola sabor original.',4000.00,5,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,6,15,1,0,NULL,NULL),
(10,2,'Sprite 350ml','Refrescante Sprite sabor lima-limón.',3800.00,5,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,6,15,1,0,NULL,NULL),
(11,3,'Hamburguesa Especial','Hamburguesa con carne Angus, queso cheddar, lechuga y tomate.',18000.00,15,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,7,17,1,0,NULL,NULL),
(12,3,'Perro Caliente Premium','Perro caliente con salchicha alemana, queso fundido y papitas.',12000.00,10,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,7,17,1,0,NULL,NULL),
(13,3,'Papas Fritas Medianas','Papas fritas crujientes con sal.',6000.00,8,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,7,18,1,0,NULL,NULL),
(14,3,'Coca-Cola 350ml','Refrescante Coca-Cola sabor original.',4000.00,5,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,9,23,1,0,NULL,NULL),
(15,3,'Sprite 350ml','Refrescante Sprite sabor lima-limón.',3800.00,5,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL,9,23,1,0,NULL,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profiles`
--

DROP TABLE IF EXISTS `profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profiles`
--

LOCK TABLES `profiles` WRITE;
/*!40000 ALTER TABLE `profiles` DISABLE KEYS */;
INSERT INTO `profiles` VALUES
(1,1,'Carlos','Commerce Uno','1000000001',NULL,'3000000001',NULL,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(2,2,'Sandro','Sede Uno','1000000002',NULL,'3000000002',NULL,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(3,3,'Silvia','Sede Dos','1000000003',NULL,'3000000003',NULL,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(4,4,'Tomás','Taco Loco Admin','1000000004',NULL,'3000000004',NULL,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(5,5,'Yuli','Yopal Sede','1000000005',NULL,'3000000005',NULL,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(6,6,'Diego','Delivery Admin','1000000006',NULL,'3000000006',NULL,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(7,7,'Danilo','Driver Uno','2000000001',NULL,'3100000001',1,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(8,8,'Doris','Driver Dos','2000000002',NULL,'3100000002',1,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(9,9,'Darío','Driver Tres','2000000003',NULL,'3100000003',1,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(10,10,'Camila','Cliente Uno','3000000001',NULL,'3200000001',NULL,'2026-07-09 04:36:48','2026-07-09 04:36:48'),
(11,11,'César','Cliente Dos','3000000002',NULL,'3200000002',NULL,'2026-07-09 04:36:48','2026-07-09 04:36:48');
/*!40000 ALTER TABLE `profiles` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER auto_create_user_wallet
  AFTER INSERT ON profiles FOR EACH ROW
  BEGIN
    INSERT INTO wallets (owner_type, owner_id)
    VALUES ('user', NEW.usuario_id);
  END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `protocol_rules`
--

DROP TABLE IF EXISTS `protocol_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `effective_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_singleton_rules` CHECK (`id` = 1),
  CONSTRAINT `chk_rates_sum` CHECK (`retention_penalty_rate` + `refund_standard_rate` = 1.000000),
  CONSTRAINT `chk_cust_cancel_prep_sum` CHECK (`customer_cancel_store_refund_prep_rate` + `customer_cancel_client_refund_prep_rate` + `customer_cancel_sys_retain_prep_rate` = 1.000000),
  CONSTRAINT `chk_cust_cancel_delivery_pct_dispatch` CHECK (`customer_cancel_driver_delivery_pct_dispatch` between 0.000000 and 1.000000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Parametros financieros del protocolo. READ-ONLY para la app.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `protocol_rules`
--

LOCK TABLES `protocol_rules` WRITE;
/*!40000 ALTER TABLE `protocol_rules` DISABLE KEYS */;
INSERT INTO `protocol_rules` VALUES
(1,50000.00,1.0000,0.010000,0.300000,0.700000,0.300000,400.00,300.00000000,0.0100,0,0.5000,5,600.00000000,50000.00,300.00,3100.00,3.00,400.00,9.00,2000000.00,1,2000.00,0.100000,105.0000,50.0000,100.0000,1500,5,5,1,4,2,40,60,50,0.500000,0.300000,1.000000,0.900000,0.040000,0.060000,0.750000,0.750000,0.900000,0.500000,0.004000,0.700000,30,3,2,1,3000.00,3,0.500000,0.2500,1,2,1,2,3,0.500000,0.250000,0.500000,0.900000,'2026-07-01','Reglas iniciales completas del protocolo DOMI','2026-07-08 23:36:47','2026-07-09 04:36:47.726628');
/*!40000 ALTER TABLE `protocol_rules` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_protocol_rules_update BEFORE UPDATE ON protocol_rules FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: Reglas de protocolo protegidas. Operación UPDATE no autorizada en esta capa.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_protocol_rules_delete BEFORE DELETE ON protocol_rules FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: Reglas de protocolo protegidas. Operación DELETE no autorizada en esta capa.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `protocol_rules_history`
--

DROP TABLE IF EXISTS `protocol_rules_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `protocol_rules_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `original_rule_id` int(11) NOT NULL DEFAULT 1,
  `snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copia completa de protocol_rules + token_registry en ese momento.' CHECK (json_valid(`snapshot`)),
  `changed_by` int(11) DEFAULT NULL COMMENT 'ID del system_user que autorizo el cambio.',
  `change_reason` varchar(500) DEFAULT NULL,
  `effective_from` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `idx_prh_effective` (`effective_from` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial inmutable de cambios de protocolo. Auditoria del tipo de cambio con snapshot.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `protocol_rules_history`
--

LOCK TABLES `protocol_rules_history` WRITE;
/*!40000 ALTER TABLE `protocol_rules_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `protocol_rules_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `protocol_rules_metadata`
--

DROP TABLE IF EXISTS `protocol_rules_metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Metadatos descriptivos de los parametros de reglas del protocolo';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `protocol_rules_metadata`
--

LOCK TABLES `protocol_rules_metadata` WRITE;
/*!40000 ALTER TABLE `protocol_rules_metadata` DISABLE KEYS */;
INSERT INTO `protocol_rules_metadata` VALUES
('customer_cancel_client_refund_prep_rate','Reembolso Cliente en Preparación','Fracción del costo de los productos reembolsada al cliente si cancela estando en preparación.','Cliente','Cliente','El cliente cancela el pedido en estado Aceptado, Preparando o Listo.','aceptado, preparando, listo','Ambos','Valor de productos * tasa','El cliente recupera el {val_pct} del valor de los productos en DOMIs como abono de fidelización.','2026-07-09 04:36:47.808236'),
('customer_cancel_driver_commission_refund_dispatch_rate','Anticipo Comisión Repartidor en Despacho (COD)','Porcentaje de la comisión de servicio del repartidor (snapshot) que el sistema le devuelve como anticipo al cancelar un pedido COD en estado Listo para Despacho. Se recupera automáticamente cuando el cliente paga su deuda.','Repartidor','Cliente','El cliente cancela el pedido COD en estado Listo para Despacho.','listo_despacho','COD','Comisión del repartidor (snapshot) * tasa','El repartidor recibe el {val_pct} de su comisión de servicio como anticipo de compensación. Este anticipo se recupera cuando el cliente pague su deuda.','2026-07-09 04:36:47.816561'),
('customer_cancel_driver_commission_refund_transit_rate','Anticipo de Comisión Repartidor en Tránsito (COD)','Porcentaje de la comisión de servicio del repartidor (snapshot) que el sistema le devuelve como anticipo al cancelar un pedido COD en estado En Camino. Se recupera automáticamente cuando el cliente paga su Compensación Automática.','Repartidor','Cliente','El cliente cancela el pedido COD en estado En Camino. El repartidor ya tiene los productos consigo y los retiene físicamente.','en_camino','COD','Comisión del repartidor (snapshot) * tasa','El repartidor recibe el {val_pct} de su comisión como anticipo de compensación. Este anticipo se recupera cuando el cliente pague su deuda.','2026-07-09 04:36:47.813465'),
('customer_cancel_driver_delivery_pct_dispatch','Porcentaje Domicilio cobrado al cliente en listo_despacho','Fracción de la tarifa de envío cobrada al cliente cuando cancela en listo_despacho. El repartidor fue asignado pero no recogió.','Cliente','Cliente','El cliente cancela el pedido en estado Listo para Despacho.','listo_despacho','Ambos','Tarifa de envío * tasa','El cliente es cargado con el {val_pct} de la tarifa de envío.','2026-07-09 04:36:47.810354'),
('customer_cancel_driver_delivery_pct_dispatch_rate','Porcentaje Domicilio Repartidor en Despacho (Cliente)','Fracción de la tarifa del envío cobrada al cliente y pagada al repartidor si cancela en listo_despacho.','Repartidor','Cliente','El cliente cancela en listo_despacho.','listo_despacho','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.839988'),
('customer_cancel_store_commission_refund_dispatch_rate','Anticipo Comisión Sede en Despacho (COD)','Porcentaje de la comisión de servicio de la sede (snapshot) que el sistema le devuelve como anticipo al cancelar un pedido COD en estado Listo para Despacho. Se recupera automáticamente cuando el cliente paga su deuda.','Sede','Cliente','El cliente cancela el pedido COD en estado Listo para Despacho.','listo_despacho','COD','Comisión de la sede (snapshot) * tasa','La sede recibe el {val_pct} de su comisión de servicio como anticipo de compensación. Este anticipo se recupera cuando el cliente pague su deuda.','2026-07-09 04:36:47.815514'),
('customer_cancel_store_refund_prep_rate','Reembolso Sede en Preparación','Fracción del costo de los productos transferida a la sede si el cliente cancela mientras el pedido está en preparación.','Sede / Cliente','Cliente','El cliente cancela el pedido en estado Aceptado, Preparando o Listo.','aceptado, preparando, listo','Ambos','Valor de productos * tasa','La sede es compensada con el {val_pct} del valor de los productos preparados.','2026-07-09 04:36:47.807168'),
('customer_cancel_sys_retain_prep_rate','Retención Sistema en Preparación','Fracción del costo de los productos retenida por la plataforma como costo administrativo en preparación.','Sistema / Cliente','Cliente','El cliente cancela el pedido en estado Aceptado, Preparando o Listo.','aceptado, preparando, listo','Ambos','Valor de productos * tasa','El sistema retiene el {val_pct} para el fondo de fidelización.','2026-07-09 04:36:47.809219'),
('delivery_base_distance_km','Distancia Base Incluida (km)','Radio de cobertura en kilómetros incluido en la tarifa base sin costo adicional.','Cliente / Repartidor','Cliente','El cliente realiza un pedido y se calcula la tarifa de domicilio.','pendiente','Ambos','Radio base','Pedidos dentro de {val} km pagan solo la tarifa base.','2026-07-09 04:36:47.818770'),
('delivery_base_fare_cop','Tarifa Base del Domicilio (COP)','Costo mínimo del domicilio en pesos colombianos. Aplica para distancias iguales o menores a la distancia base.','Cliente / Repartidor','Cliente','El cliente realiza un pedido y se calcula la tarifa de domicilio.','pendiente','Ambos','Fija para distancias ≤ distancia base','El cliente paga mínimo {val} COP por su domicilio.','2026-07-09 04:36:47.817595'),
('delivery_extra_rate_cop_per_km','Tarifa Extra por Km Adicional (COP)','Valor en COP cobrado por cada kilómetro que supere la distancia base.','Cliente / Repartidor','Cliente','El cliente realiza un pedido a una distancia superior a la distancia base.','pendiente','Ambos','(distancia - base) * tasa','Por cada km extra se suman {val} COP al total del domicilio.','2026-07-09 04:36:47.819783'),
('delivery_max_distance_km','Distancia Máxima de Cobertura (km)','Límite de cobertura del servicio (punta a punta de la ciudad).','Sistema','Cliente','El cliente intenta realizar un pedido a cualquier distancia.','pendiente','Ambos','Límite de cobertura','El servicio cubre hasta {val} km. Pedidos más lejanos son rechazados.','2026-07-09 04:36:47.820778'),
('driver_cancel_post_pickup_penalty_rate','Penalización Repartidor Post-Pickup','Multiplicador de penalización del valor de los productos cobrado al repartidor si cancela después de retirar el pedido.','Repartidor','Repartidor','El repartidor cancela de manera autónoma después de realizar la recogida (en ruta).','en_camino','Ambos','Valor de productos * tasa','Se genera una deuda de Compensación Automática al repartidor por el {val_pct} del valor de los productos que quedaron en su poder.','2026-07-09 04:36:47.806138'),
('driver_cancel_pre_pickup_refund_rate','Reembolso Repartidor Pre-Pickup','Fracción de la comisión de servicio devuelta al repartidor si cancela la entrega antes de retirar los productos.','Repartidor','Repartidor','El repartidor cancela de manera autónoma antes de realizar la recogida (pickup).','listo_despacho','Ambos','Comisión del repartidor * tasa','El repartidor recupera el {val_pct} de su comisión, perdiendo el resto como costo de penalización.','2026-07-09 04:36:47.805135'),
('driver_cancellation_compensation_rate','Tasa de Compensación al Repartidor','Porcentaje de la tarifa de envío que recibe el repartidor si el pedido se cancela tardíamente por la sede o el cliente.','Repartidor / Sede','Cliente / Sede','Cancelación en estado Listo para Despacho (repartidor ya aceptó pero no ha salido).','listo_despacho','Ambos','Tarifa de envío * tasa','Se transfiere el {val_pct} de la tarifa del envío de la sede al repartidor. Si la sede no tiene saldo, se genera compensación automática (deuda).','2026-07-09 04:36:47.803962'),
('driver_commission_refund_on_store_cancel_rate','Reembolso Comisión Repartidor por Cancelación de Sede','Porcentaje de la comisión de servicio devuelto al repartidor (del sistema) si la sede cancela.','Repartidor','Sede','La sede cancela el pedido.','preparando, listo, listo_despacho','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.841305'),
('driver_penalty_points_dispatch','Penalización Conductor en Despacho','Puntos acumulados de penalización de prioridad aplicados al conductor si cancela en listo_despacho.','Repartidor','Repartidor','El repartidor cancela asignación en listo_despacho.','listo_despacho','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.835367'),
('driver_penalty_points_prep','Penalización Conductor en Preparación','Puntos acumulados de penalización de prioridad aplicados al conductor si cancela la asignación en preparación.','Repartidor','Repartidor','El repartidor cancela asignación en preparando/listo.','preparando, listo','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.834112'),
('driver_penalty_points_rescue_original','Puntos Penalización Conductor Rescatado','Puntos de penalización de prioridad aplicados al conductor original cuando su pedido es rescatado con éxito.','Repartidor Original','Sistema','Rescate exitoso del pedido.','en_rescate','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.824920'),
('driver_penalty_points_transit','Penalización Conductor en Tránsito','Puntos acumulados de penalización de prioridad aplicados al conductor por abandono en tránsito.','Repartidor','Repartidor','El repartidor desiste del pedido en tránsito.','en_camino','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.836488'),
('driver_rescue_chain_penalty_points','Puntos Penalización Rescatista que Falla','Puntos de penalización de prioridad aplicados a un rescatista que acepta el servicio de rescate y desiste.','Repartidor Rescatista','Repartidor','El rescatista cancela el rescate asignado.','en_rescate','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.825974'),
('driver_rescue_commission_refund_rate','Tasa de Reembolso Comisión en Rescate','Fracción de la comisión de servicio devuelta al repartidor original si el rescatista completa la entrega con éxito.','Repartidor Original','Sistema','Rescate de orden completado con éxito.','en_rescate','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.821810'),
('driver_rescue_max_attempts','Intentos Máximos de Rescate','Cantidad de veces máxima que un rescatista puede aceptar y fallar antes de cancelar el pedido definitivamente.','Sistema','Sistema','El rescatista asignado desiste del rescate.','en_rescate','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.823875'),
('driver_rescue_timeout_minutes','Tiempo Límite de Rescate (Minutos)','Tiempo en minutos para encontrar un rescatista y completar la entrega antes de auto-cancelar la orden.','Sistema','Sistema','La orden entra en estado en_rescate.','en_rescate','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.822884'),
('minimum_delivery_rate','Tarifa Mínima de Domicilio (COP)','Costo fiduciario mínimo por un servicio de domicilio en el ecosistema. Es la base para calcular la solvencia de la sede.','Sede','Sistema','Cálculo de solvencia de apertura de turno de la sede.','pendiente','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.827078'),
('platform_processing_fee_rate','Tasa de Procesamiento de la Plataforma','Porcentaje estándar retenido por la plataforma sobre pagos de deudas por cancelación. Se aplica al total efectivamente cobrado al cliente al saldar una Compensación Automática.','Sistema','Cliente','El cliente paga su Compensación Automática originada por cancelar un pedido COD en estado En Camino o Listo para Despacho.','listo_despacho, en_camino','COD','Total pagado * tasa','El sistema retiene el {val_pct} del total pagado como costo de procesamiento. Por ejemplo: sobre 10.000 COP se retienen 40 COP.','2026-07-09 04:36:47.814509'),
('refund_standard_rate','Tasa Reembolso Estándar de Incidente','Fracción de la comisión de servicio del repartidor que se le devuelve si el pedido no se concreta por culpa del cliente.','Repartidor','Cliente / Repartidor','Cancelación en Listo para Despacho por cliente, o reporte de Incidente COD sin entrega.','listo_despacho, en_camino','Ambos','Comisión del repartidor * tasa','El repartidor/empresa de reparto recupera el {val_pct} de su costo de servicio pagado a la plataforma por la asignación.','2026-07-09 04:36:47.801961'),
('rescue_cashback_rate','Tasa Reembolso Cashback de Rescate','Fracción de la comisión de servicio devuelta al repartidor original que fue rescatado una vez que se completa el servicio.','Repartidor Original','Repartidor','Rescate exitoso del pedido por otro repartidor y entrega completada.','entregado','Ambos','Comisión de servicio * tasa','El conductor original que reportó el incidente recibe un cashback de fidelidad del {val_pct}.','2026-07-09 04:36:47.802979'),
('retention_penalty_rate','Tasa Penalización Retención','Fracción de la tarifa de servicio retenida por la plataforma cuando la sede cancela el pedido.','Sede','Sede','La sede cancela el pedido estando en estado Aceptado, Preparando, Listo o Listo para Despacho.','aceptado, preparando, listo, listo_despacho','Ambos','Comisión de plataforma * tasa','La plataforma retiene esta fracción ({val_pct}). El resto se le reembolsa a la sede.','2026-07-09 04:36:47.799885'),
('score_penalty_cash_cancel_dispatch','Penalización Score cancelación COD listo_despacho','Puntos de Score que se descuentan al cliente cuando cancela un pedido COD en estado Listo para Despacho.','Cliente','Cliente','El cliente cancela el pedido COD en estado Listo para Despacho.','listo_despacho','Ambos','Valor de la penalización','Se restan {val} puntos de Score al cliente.','2026-07-09 04:36:47.811461'),
('score_penalty_domi_cancel_dispatch','Penalización Score cancelación DOMI listo_despacho','Puntos de Score que se descuentan al cliente cuando cancela un pedido pagado con DOMIs en estado Listo para Despacho.','Cliente','Cliente','El cliente cancela el pedido pagado con DOMIs en estado Listo para Despacho.','listo_despacho','Ambos','Valor de la penalización','Se restan {val} puntos de Score al cliente.','2026-07-09 04:36:47.812474'),
('solvency_commission_guarantee_fraction','Fracción de Garantía de Solvencia (Comisiones)','Porcentaje de las comisiones operativas (sede + repartidor) requerido como respaldo al aceptar/crear una orden.','Repartidor / Sede','Sistema','Aceptación de oferta de reparto o creación de orden.','pendiente, aceptado','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.829314'),
('store_cancel_client_indemnity_domi_amount','Indemnización Cliente por Cancelación de Sede (DOMIs)','Bono fijo en DOMIs pagado al cliente por la sede como indemnización cuando ésta cancela unilateralmente un pedido.','Sede','Sede','La sede cancela el pedido en estado preparando o despacho.','aceptado, preparando, listo, listo_despacho','DOMI',NULL,NULL,'2026-07-09 04:36:47.830426'),
('store_cancel_client_indemnity_rate','Porcentaje Indemnización Cliente por Cancelación de Sede','Porcentaje de indemnización por perjuicios en valor de productos transferido al cliente por la sede al cancelar.','Cliente','Sede','La sede cancela el pedido.','aceptado, preparando, listo_despacho','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.838805'),
('store_cancel_driver_delivery_pct_rate','Porcentaje Domicilio Repartidor por Cancelación de Sede','Porcentaje de la tarifa de envío que el sistema paga al repartidor compensándolo si la sede cancela.','Repartidor','Sede','La sede cancela en preparando o listo_despacho.','preparando, listo, listo_despacho','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.837656'),
('store_penalty_points_dispatch','Penalización Confiabilidad Sede en Despacho','Puntos acumulados de penalización de confiabilidad aplicados a la sede al cancelar en listo_despacho.','Sede','Sede','La sede cancela en listo_despacho.','listo_despacho','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.833003'),
('store_penalty_points_prep','Penalización Confiabilidad Sede en Preparación','Puntos acumulados de penalización de confiabilidad aplicados a la sede al cancelar en preparación.','Sede','Sede','La sede cancela estando en aceptado, preparando o listo.','aceptado, preparando, listo','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.831568'),
('store_solvency_delivery_multiplier','Multiplicador de Tarifa Mínima para Solvencia de Sede','Factor multiplicador aplicado a la tarifa mínima de domicilio para calcular el saldo de garantía requerido para operar.','Sede','Sistema','Apertura de turno o inicio de sesión de sede.','pendiente','DOMI / COD',NULL,NULL,'2026-07-09 04:36:47.828226');
/*!40000 ALTER TABLE `protocol_rules_metadata` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `redis_sync_queue`
--

DROP TABLE IF EXISTS `redis_sync_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `redis_sync_queue`
--

LOCK TABLES `redis_sync_queue` WRITE;
/*!40000 ALTER TABLE `redis_sync_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `redis_sync_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registration_requests`
--

DROP TABLE IF EXISTS `registration_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registration_requests`
--

LOCK TABLES `registration_requests` WRITE;
/*!40000 ALTER TABLE `registration_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `registration_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rescue_assignments`
--

DROP TABLE IF EXISTS `rescue_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Asignaciones de rescate a repartidores suplentes.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rescue_assignments`
--

LOCK TABLES `rescue_assignments` WRITE;
/*!40000 ALTER TABLE `rescue_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `rescue_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_rp_permission` (`permission_id`),
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES
(1,1),
(2,1),
(3,1),
(1,2),
(1,3),
(1,8),
(2,8),
(4,8),
(1,9),
(2,9),
(1,10),
(2,10),
(4,10),
(1,11),
(2,11),
(4,11),
(5,11),
(1,12),
(2,12),
(4,12),
(1,13),
(2,13),
(4,13),
(1,14),
(2,14),
(4,14),
(5,14),
(7,14),
(9,14),
(1,15),
(2,15),
(1,16),
(2,16),
(4,16),
(5,16),
(7,16),
(9,16),
(1,17),
(2,17),
(4,17),
(1,18),
(2,18),
(4,18),
(5,18),
(7,18),
(8,18),
(1,19),
(2,19),
(4,19),
(5,19),
(7,19),
(8,19),
(1,20),
(2,20),
(4,20),
(1,21),
(2,21),
(4,21),
(1,22),
(2,22),
(5,22),
(7,22),
(8,22),
(1,23),
(2,23),
(4,23),
(5,23),
(7,23),
(1,24),
(2,24),
(4,24),
(1,25),
(2,25),
(4,25),
(1,26),
(2,26),
(3,26),
(1,27),
(2,27),
(1,28),
(2,28),
(3,28),
(1,29),
(2,29),
(10,29),
(1,30),
(2,30),
(10,30),
(1,31),
(1,32),
(2,32),
(6,32),
(1,33),
(2,33),
(1,38),
(2,38),
(4,38),
(5,38),
(10,38),
(11,38),
(1,39),
(2,39),
(4,39),
(5,39),
(1,40),
(2,40),
(1,41),
(2,41),
(1,43),
(2,43),
(1,44),
(2,44),
(1,45),
(2,45),
(4,45),
(1,46),
(2,46),
(1,47),
(2,47),
(1,48),
(4,48),
(1,49),
(4,49),
(1,50),
(1,51),
(2,51),
(1,52),
(1,53),
(1,54),
(1,55),
(1,56),
(1,57),
(1,58),
(1,59),
(4,59),
(5,59),
(1,60),
(4,60),
(5,60),
(1,61),
(4,61),
(5,61),
(1,62),
(4,62),
(5,62),
(1,63),
(4,63),
(5,63),
(1,64),
(10,64),
(1,65),
(1,66),
(1,67),
(1,68),
(1,70),
(6,70),
(11,70);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER rbac_role_permissions_before_insert
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER rbac_role_permissions_before_update
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER rbac_role_permissions_before_delete
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES
(1,'Super Administrador','root','Acceso total sin restricciones',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(2,'Gerente del Sistema','system_manager','Gestión operativa del sistema',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(3,'Auditor','auditor','Solo lectura de seguridad y finanzas',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(4,'Gerente de Comercio','commerce_manager','Administración total del comercio y sus sedes',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(5,'Admin de Sede','store_admin','Administración operativa de una sede',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(6,'Admin de Mensajería','delivery_company_admin','Gestión de repartidores',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(7,'Operador Completo','operator_full','Operador con acceso a pedidos y catálogo',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(8,'Operador de Pedidos','operator_orders','Operador dedicado a despachar pedidos',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(9,'Operador de Catálogo','operator_catalog','Operador enfocado en stock de productos',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(10,'Cliente','customer','Usuario consumidor final',1,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(11,'Repartidor','driver','Repartidor de domicilios',1,'2026-07-09 04:36:47','2026-07-09 04:36:47');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER rbac_roles_before_insert
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER rbac_roles_before_update
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER rbac_roles_before_delete
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `security_audit_logs`
--

DROP TABLE IF EXISTS `security_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `security_audit_logs`
--

LOCK TABLES `security_audit_logs` WRITE;
/*!40000 ALTER TABLE `security_audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `security_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stop_words`
--

DROP TABLE IF EXISTS `stop_words`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stop_words` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `word` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `word` (`word`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stop_words`
--

LOCK TABLES `stop_words` WRITE;
/*!40000 ALTER TABLE `stop_words` DISABLE KEYS */;
/*!40000 ALTER TABLE `stop_words` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_accounts`
--

DROP TABLE IF EXISTS `store_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_accounts`
--

LOCK TABLES `store_accounts` WRITE;
/*!40000 ALTER TABLE `store_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `store_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_operating_hours`
--

DROP TABLE IF EXISTS `store_operating_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_operating_hours`
--

LOCK TABLES `store_operating_hours` WRITE;
/*!40000 ALTER TABLE `store_operating_hours` DISABLE KEYS */;
INSERT INTO `store_operating_hours` VALUES
(1,1,0,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.439150','2026-07-09 04:36:48.439150'),
(2,1,1,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.441227','2026-07-09 04:36:48.441227'),
(3,1,2,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.442436','2026-07-09 04:36:48.442436'),
(4,1,3,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.443523','2026-07-09 04:36:48.443523'),
(5,1,4,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.444600','2026-07-09 04:36:48.444600'),
(6,1,5,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.445819','2026-07-09 04:36:48.445819'),
(7,1,6,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.447131','2026-07-09 04:36:48.447131'),
(8,2,0,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.452475','2026-07-09 04:36:48.452475'),
(9,2,1,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.453405','2026-07-09 04:36:48.453405'),
(10,2,2,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.454296','2026-07-09 04:36:48.454296'),
(11,2,3,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.455210','2026-07-09 04:36:48.455210'),
(12,2,4,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.456137','2026-07-09 04:36:48.456137'),
(13,2,5,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.457077','2026-07-09 04:36:48.457077'),
(14,2,6,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.458512','2026-07-09 04:36:48.458512'),
(15,3,0,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.463927','2026-07-09 04:36:48.463927'),
(16,3,1,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.464961','2026-07-09 04:36:48.464961'),
(17,3,2,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.465907','2026-07-09 04:36:48.465907'),
(18,3,3,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.466954','2026-07-09 04:36:48.466954'),
(19,3,4,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.467977','2026-07-09 04:36:48.467977'),
(20,3,5,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.468902','2026-07-09 04:36:48.468902'),
(21,3,6,'abierto','08:00:00','22:00:00',0,'2026-07-09 04:36:48.469850','2026-07-09 04:36:48.469850');
/*!40000 ALTER TABLE `store_operating_hours` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_operators`
--

DROP TABLE IF EXISTS `store_operators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_operators`
--

LOCK TABLES `store_operators` WRITE;
/*!40000 ALTER TABLE `store_operators` DISABLE KEYS */;
/*!40000 ALTER TABLE `store_operators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_reliability_counters`
--

DROP TABLE IF EXISTS `store_reliability_counters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `store_reliability_counters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `store_id` int(11) NOT NULL,
  `penalty_points` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp(6) NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_store` (`store_id`),
  CONSTRAINT `fk_store_reliability` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contadores de confiabilidad y penalizaciones de sedes.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_reliability_counters`
--

LOCK TABLES `store_reliability_counters` WRITE;
/*!40000 ALTER TABLE `store_reliability_counters` DISABLE KEYS */;
/*!40000 ALTER TABLE `store_reliability_counters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stores`
--

DROP TABLE IF EXISTS `stores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stores`
--

LOCK TABLES `stores` WRITE;
/*!40000 ALTER TABLE `stores` DISABLE KEYS */;
INSERT INTO `stores` VALUES
(1,1,2,'Sede Chapinero','MAT-ST-001',NULL,'3009998881',NULL,'Calle 60 #10-20, Bogotá',4.64820000,-74.06120000,NULL,'operativo','2026-07-09 04:36:48',NULL,NULL,NULL,0,NULL,'2026-07-09 04:36:48.432845','automatico'),
(2,1,3,'Sede Cedritos','MAT-ST-002',NULL,'3009998882',NULL,'Calle 140 #19-40, Bogotá',4.72120000,-74.04120000,NULL,'operativo','2026-07-09 04:36:48',NULL,NULL,NULL,0,NULL,'2026-07-09 04:36:48.448560','automatico'),
(3,2,5,'Sede Yopal','MAT-ST-003',NULL,'3009998883',NULL,'Carrera 20 #12-30, Yopal',5.33780000,-72.39580000,NULL,'operativo','2026-07-09 04:36:48',NULL,NULL,NULL,0,NULL,'2026-07-09 04:36:48.459782','automatico');
/*!40000 ALTER TABLE `stores` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER auto_create_store_wallet
  AFTER INSERT ON stores FOR EACH ROW
  BEGIN
    INSERT INTO wallets (owner_type, owner_id)
    VALUES ('store', NEW.id);
  END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER auto_assign_store_admin_role
  AFTER INSERT ON stores FOR EACH ROW
  BEGIN
    DECLARE role_id_var INT;
    DECLARE old_root INT;
    SET old_root = @domi_is_root;
    SET @domi_is_root = 1;
    IF NEW.usuario_id IS NOT NULL THEN
      SELECT id INTO role_id_var FROM roles WHERE code = 'store_admin' LIMIT 1;
      IF role_id_var IS NOT NULL THEN
        INSERT IGNORE INTO user_roles (user_type, user_id, role_id)
        VALUES ('user', NEW.usuario_id, role_id_var);
      END IF;
    END IF;
    SET @domi_is_root = old_root;
  END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER prevent_store_manager_change BEFORE UPDATE ON stores FOR EACH ROW BEGIN IF OLD.usuario_id IS NOT NULL AND NEW.usuario_id IS NOT NULL AND OLD.usuario_id <> NEW.usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El gerente responsable de una sede no puede reasignarse directamente. Requiere proceso administrativo.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `system_financial_flags`
--

DROP TABLE IF EXISTS `system_financial_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_financial_flags`
--

LOCK TABLES `system_financial_flags` WRITE;
/*!40000 ALTER TABLE `system_financial_flags` DISABLE KEYS */;
INSERT INTO `system_financial_flags` VALUES
(1,'withdrawals_enabled',1,'Retiros de DOMI','Permite ejecutar retiros reales a usuarios con permiso withdraw_domis',NULL,'2026-07-09 04:36:47'),
(2,'purchases_enabled',1,'Compra de DOMIs','Permite comprar via Wompi a usuarios con permiso purchase_domis',NULL,'2026-07-09 04:36:47'),
(3,'minting_enabled',1,'Acunacion Manual','Permite acunar DOMIs manualmente a administradores con mint_manual_domis',NULL,'2026-07-09 04:36:47');
/*!40000 ALTER TABLE `system_financial_flags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_parameters`
--

DROP TABLE IF EXISTS `system_parameters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_parameters`
--

LOCK TABLES `system_parameters` WRITE;
/*!40000 ALTER TABLE `system_parameters` DISABLE KEYS */;
INSERT INTO `system_parameters` VALUES
(1,'free_tier_categories_limit','3','Max categorias de menu en el tier gratuito','upgrades','2026-07-08 23:36:47.793784','2026-07-08 23:36:47.793784'),
(2,'free_tier_products_limit','3','Max productos en el tier gratuito','upgrades','2026-07-08 23:36:47.796662','2026-07-08 23:36:47.796662'),
(3,'influencer_reels_limit','3','Max reels con Estatus Influencer activo','upgrades','2026-07-08 23:36:47.797719','2026-07-08 23:36:47.797719'),
(4,'free_tier_stores_limit','1','Max sedes operativas en el tier gratuito','upgrades','2026-07-08 23:36:47.798744','2026-07-08 23:36:47.798744');
/*!40000 ALTER TABLE `system_parameters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_users`
--

DROP TABLE IF EXISTS `system_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_users`
--

LOCK TABLES `system_users` WRITE;
/*!40000 ALTER TABLE `system_users` DISABLE KEYS */;
INSERT INTO `system_users` VALUES
(1,'root@trendy.sytes.net','$2a$10$M3CRZ37SIQqPREpkYcccFOi1/uTH/ZcX9McP1FDgWzrcf264MREGe','Root','SuperAdmin','root','activo',0,'2026-07-09 04:36:47','2026-07-09 04:36:47'),
(2,'system@trendy.sytes.net','$2a$10$M3CRZ37SIQqPREpkYcccFOi1/uTH/ZcX9McP1FDgWzrcf264MREGe','System','Admin','system','activo',0,'2026-07-09 04:36:47','2026-07-09 04:36:47');
/*!40000 ALTER TABLE `system_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_registry`
--

DROP TABLE IF EXISTS `token_registry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_registry`
--

LOCK TABLES `token_registry` WRITE;
/*!40000 ALTER TABLE `token_registry` DISABLE KEYS */;
INSERT INTO `token_registry` VALUES
(1,'DOMI','DomiToken',2,400.0000,'1.0.0','710a5b05fba854d979a5e5df4f3525079e2d3a0e598d78a04388c7d4912a4c06','2026-07-08 23:36:47','2026-07-08 23:36:47');
/*!40000 ALTER TABLE `token_registry` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_token_registry_update BEFORE UPDATE ON token_registry FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El registro de tokens es inmutable. No se permite UPDATE.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_token_registry_delete BEFORE DELETE ON token_registry FOR EACH ROW BEGIN IF @domi_bypass_security IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El registro de tokens es inmutable. No se permite DELETE.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `upgrade_catalog`
--

DROP TABLE IF EXISTS `upgrade_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `target_role` varchar(60) NOT NULL DEFAULT 'commerce_manager' COMMENT 'Rol de usuario al que esta dirigida esta mejora',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0 = desactivada, no aparece en el mercado de mejoras',
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `upgrade_key` (`upgrade_key`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catalogo de configuracion de mejoras. Los precios aqui son la fuente de verdad para purchaseUpgrade()';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `upgrade_catalog`
--

LOCK TABLES `upgrade_catalog` WRITE;
/*!40000 ALTER TABLE `upgrade_catalog` DISABLE KEYS */;
INSERT INTO `upgrade_catalog` VALUES
(1,'estado_empresarial','Estado Empresarial','Desbloquea sedes adicionales, productos y categorias ilimitadas en el catalogo del comercio.','building',80.0000,30,1,1,'commerce_manager',1,'2026-07-08 23:36:47.740542','2026-07-08 23:36:47.740542'),
(2,'estatus_influencer','Estatus Influencer','Habilita la subida de hasta 3 reels de video en el perfil publico del comercio.','video',40.0000,30,0,NULL,'commerce_manager',1,'2026-07-08 23:36:47.755264','2026-07-08 23:36:47.755264'),
(3,'adicionar_sede','Sede Adicional','Suma una (1) sede operativa adicional al limite del comercio por 30 dias.','store',50.0000,30,0,NULL,'commerce_manager',1,'2026-07-08 23:36:47.756702','2026-07-08 23:36:47.756702'),
(8,'sin_publicidad','Elimina la publicidad','Quita los anuncios y navega con tranquilidad.','star',15.0000,30,1,1,'customer',1,'2026-07-08 23:36:47.758067','2026-07-08 23:36:47.758067');
/*!40000 ALTER TABLE `upgrade_catalog` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_upgrade_catalog_update
BEFORE UPDATE ON upgrade_catalog
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL AND @domi_is_root IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: El catalogo de mejoras solo puede ser modificado por el motor de aplicacion autorizado.';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER protect_upgrade_catalog_delete
BEFORE DELETE ON upgrade_catalog
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL AND @domi_is_root IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: Las entradas del catalogo de mejoras no pueden ser eliminadas directamente.';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `user_addresses`
--

DROP TABLE IF EXISTS `user_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_addresses`
--

LOCK TABLES `user_addresses` WRITE;
/*!40000 ALTER TABLE `user_addresses` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_moderation_logs`
--

DROP TABLE IF EXISTS `user_moderation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_moderation_logs`
--

LOCK TABLES `user_moderation_logs` WRITE;
/*!40000 ALTER TABLE `user_moderation_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_moderation_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_push_tokens`
--

DROP TABLE IF EXISTS `user_push_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_push_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `fcm_token` varchar(512) NOT NULL,
  `platform` enum('ios','android') NOT NULL DEFAULT 'android',
  `updated_at` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_platform` (`user_id`,`platform`),
  CONSTRAINT `fk_push_token_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_push_tokens`
--

LOCK TABLES `user_push_tokens` WRITE;
/*!40000 ALTER TABLE `user_push_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_push_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_roles` (
  `user_type` enum('user','system_user','operator') NOT NULL,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  PRIMARY KEY (`user_type`,`user_id`,`role_id`),
  KEY `fk_ur_role` (`role_id`),
  CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES
('system_user',1,1),
('system_user',2,2),
('user',1,4),
('user',4,4),
('user',2,5),
('user',3,5),
('user',5,5),
('user',6,6),
('user',7,10),
('user',8,10),
('user',9,10),
('user',10,10),
('user',11,10),
('user',7,11),
('user',8,11),
('user',9,11);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER rbac_user_roles_before_insert
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER rbac_user_roles_before_update
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER rbac_user_roles_before_delete
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `user_stores`
--

DROP TABLE IF EXISTS `user_stores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_stores` (
  `user_id` int(11) NOT NULL,
  `store_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`store_id`),
  KEY `fk_user_stores_store` (`store_id`),
  CONSTRAINT `fk_user_stores_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_stores_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_stores`
--

LOCK TABLES `user_stores` WRITE;
/*!40000 ALTER TABLE `user_stores` DISABLE KEYS */;
INSERT INTO `user_stores` VALUES
(2,1,'2026-07-09 04:36:48'),
(3,2,'2026-07-09 04:36:48'),
(5,3,'2026-07-09 04:36:48');
/*!40000 ALTER TABLE `user_stores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'admin_commerce_1@trendy.sytes.net','$2a$10$T7pyuz5pACGSKPjdXgxIAuliXeoGps12EJfXzesUnH5SLUDJ6pQ5S',NULL,0,0,'admin',0,0,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(2,'admin_store_1@trendy.sytes.net','$2a$10$T7pyuz5pACGSKPjdXgxIAuliXeoGps12EJfXzesUnH5SLUDJ6pQ5S',NULL,0,0,'admin',0,0,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(3,'admin_store_2@trendy.sytes.net','$2a$10$T7pyuz5pACGSKPjdXgxIAuliXeoGps12EJfXzesUnH5SLUDJ6pQ5S',NULL,0,0,'admin',0,0,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(4,'admin_commerce_2@trendy.sytes.net','$2a$10$T7pyuz5pACGSKPjdXgxIAuliXeoGps12EJfXzesUnH5SLUDJ6pQ5S',NULL,0,0,'admin',0,0,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(5,'admin_store_3@trendy.sytes.net','$2a$10$T7pyuz5pACGSKPjdXgxIAuliXeoGps12EJfXzesUnH5SLUDJ6pQ5S',NULL,0,0,'admin',0,0,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(6,'admin_delivery_1@trendy.sytes.net','$2a$10$T7pyuz5pACGSKPjdXgxIAuliXeoGps12EJfXzesUnH5SLUDJ6pQ5S',NULL,0,0,'admin',0,0,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(7,'driver_1@trendy.sytes.net','$2a$10$sRxRPhsQwr3//PoJnx32N.A6IdRbYzdzlyyPi3aP81MT6jfzzHD56',NULL,0,0,'customer',1,1,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(8,'driver_2@trendy.sytes.net','$2a$10$sRxRPhsQwr3//PoJnx32N.A6IdRbYzdzlyyPi3aP81MT6jfzzHD56',NULL,0,0,'customer',1,1,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(9,'driver_3@trendy.sytes.net','$2a$10$sRxRPhsQwr3//PoJnx32N.A6IdRbYzdzlyyPi3aP81MT6jfzzHD56',NULL,0,0,'customer',1,1,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(10,'customer_1@trendy.sytes.net','$2a$10$PzncXCQceCutJutQFO9gYeiaPXjLiuh3psOZkz1tPL2QLeX3o3Qd.',NULL,0,0,'customer',0,0,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL),
(11,'customer_2@trendy.sytes.net','$2a$10$PzncXCQceCutJutQFO9gYeiaPXjLiuh3psOZkz1tPL2QLeX3o3Qd.',NULL,0,0,'customer',0,0,NULL,'activo',0,0,0,'2026-07-09 04:36:48','2026-07-09 04:36:48',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER enforce_driver_role_insert BEFORE INSERT ON users FOR EACH ROW BEGIN IF NEW.es_repartidor = 1 AND NEW.rol <> 'customer' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede activar el modo repartidor.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER sync_user_roles_after_insert
            AFTER INSERT ON users FOR EACH ROW
            BEGIN
                DECLARE customer_role_id_var INT;
                DECLARE driver_role_id_var INT;
                SET @old_domi_is_root = @domi_is_root;
                SET @domi_is_root = 1;
                IF NEW.rol = 'customer' THEN
                    SELECT id INTO customer_role_id_var FROM roles WHERE code = 'customer' LIMIT 1;
                    IF customer_role_id_var IS NOT NULL THEN
                        INSERT IGNORE INTO user_roles (user_type, user_id, role_id)
                        VALUES ('user', NEW.id, customer_role_id_var);
                    END IF;
                    IF NEW.es_repartidor = 1 THEN
                        SELECT id INTO driver_role_id_var FROM roles WHERE code = 'driver' LIMIT 1;
                        IF driver_role_id_var IS NOT NULL THEN
                            INSERT IGNORE INTO user_roles (user_type, user_id, role_id)
                            VALUES ('user', NEW.id, driver_role_id_var);
                        END IF;
                    END IF;
                END IF;
                SET @domi_is_root = @old_domi_is_root;
                SET @old_domi_is_root = NULL;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER enforce_driver_role_update BEFORE UPDATE ON users FOR EACH ROW BEGIN IF NEW.es_repartidor = 1 AND NEW.rol <> 'customer' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede activar el modo repartidor.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER prevent_active_driver_without_flag BEFORE UPDATE ON users FOR EACH ROW BEGIN IF NEW.repartidor_activo = 1 AND NEW.es_repartidor = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regla de negocio: No se puede activar el turno de repartidor sin haber habilitado el modo repartidor primero.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER `trigger_repartidor_disponibilidad`
BEFORE UPDATE ON `users`
FOR EACH ROW
BEGIN
  IF NEW.repartidor_activo = 1 AND OLD.repartidor_activo = 0 THEN
    SET NEW.repartidor_disponible_desde = NOW(6);
  ELSEIF NEW.repartidor_activo = 0 AND OLD.repartidor_activo = 1 THEN
    SET NEW.repartidor_disponible_desde = NULL;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER sync_user_roles_after_update
            AFTER UPDATE ON users FOR EACH ROW
            BEGIN
                DECLARE customer_role_id_var INT;
                DECLARE driver_role_id_var INT;
                SET @old_domi_is_root = @domi_is_root;
                SET @domi_is_root = 1;
                IF NEW.rol = 'customer' THEN
                    SELECT id INTO customer_role_id_var FROM roles WHERE code = 'customer' LIMIT 1;
                    IF customer_role_id_var IS NOT NULL THEN
                        INSERT IGNORE INTO user_roles (user_type, user_id, role_id)
                        VALUES ('user', NEW.id, customer_role_id_var);
                    END IF;
                ELSE
                    SELECT id INTO customer_role_id_var FROM roles WHERE code = 'customer' LIMIT 1;
                    IF customer_role_id_var IS NOT NULL THEN
                        DELETE FROM user_roles WHERE user_type = 'user' AND user_id = NEW.id AND role_id = customer_role_id_var;
                    END IF;
                END IF;
                SELECT id INTO driver_role_id_var FROM roles WHERE code = 'driver' LIMIT 1;
                IF driver_role_id_var IS NOT NULL THEN
                    IF NEW.es_repartidor = 1 AND NEW.rol = 'customer' THEN
                        INSERT IGNORE INTO user_roles (user_type, user_id, role_id)
                        VALUES ('user', NEW.id, driver_role_id_var);
                    ELSE
                        DELETE FROM user_roles WHERE user_type = 'user' AND user_id = NEW.id AND role_id = driver_role_id_var;
                    END IF;
                END IF;
                SET @domi_is_root = @old_domi_is_root;
                SET @old_domi_is_root = NULL;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `wallet_aliases`
--

DROP TABLE IF EXISTS `wallet_aliases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_aliases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallet_id` int(11) NOT NULL,
  `alias` varchar(50) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_alias` (`alias`),
  KEY `fk_alias_wallet` (`wallet_id`),
  CONSTRAINT `fk_alias_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Alias de billeteras de usuarios (Bre-b)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_aliases`
--

LOCK TABLES `wallet_aliases` WRITE;
/*!40000 ALTER TABLE `wallet_aliases` DISABLE KEYS */;
INSERT INTO `wallet_aliases` VALUES
(1,1,'sys000','2026-07-08 23:36:47.992514'),
(2,2,'caco100','2026-07-08 23:36:48.402612'),
(3,3,'sase100','2026-07-08 23:36:48.406356'),
(4,4,'sise100','2026-07-08 23:36:48.409110'),
(5,5,'tota100','2026-07-08 23:36:48.413162'),
(6,6,'yuyo100','2026-07-08 23:36:48.415876'),
(7,7,'dide100','2026-07-08 23:36:48.418934'),
(8,8,'alim901','2026-07-08 23:36:48.421206'),
(9,10,'taco901','2026-07-08 23:36:48.427901'),
(10,12,'alim9011','2026-07-08 23:36:48.432845'),
(11,14,'alim9012','2026-07-08 23:36:48.448560'),
(12,16,'taco9011','2026-07-08 23:36:48.459782'),
(13,18,'serv900','2026-07-08 23:36:48.471260'),
(14,20,'dadr200','2026-07-08 23:36:48.477480'),
(15,21,'wallet000','2026-07-08 23:36:48.479374'),
(16,22,'dodr200','2026-07-08 23:36:48.482609'),
(17,23,'wallet0001','2026-07-08 23:36:48.484683'),
(18,24,'dadr2001','2026-07-08 23:36:48.487781'),
(19,25,'wallet0002','2026-07-08 23:36:48.490532'),
(20,26,'cacl300','2026-07-08 23:36:48.493451'),
(21,27,'wallet0003','2026-07-08 23:36:48.495196'),
(22,28,'cscl300','2026-07-08 23:36:48.498253'),
(23,29,'wallet0004','2026-07-08 23:36:48.499962');
/*!40000 ALTER TABLE `wallet_aliases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallets`
--

DROP TABLE IF EXISTS `wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_type` enum('system','user','store','commerce','delivery_company') NOT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `usuario_id` int(11) DEFAULT NULL,
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
  UNIQUE KEY `uq_owner` (`owner_type`,`owner_id`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_balances` CHECK (`balance_custody` >= 0 and `balance_utility` >= 0 and `locked_balance` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Billeteras de usuarios, tiendas, comercios, empresas de reparto y sistema.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallets`
--

LOCK TABLES `wallets` WRITE;
/*!40000 ALTER TABLE `wallets` DISABLE KEYS */;
INSERT INTO `wallets` VALUES
(1,'system',NULL,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:47.992514','2026-07-08 23:36:47.992514',0,'system',NULL,0,NULL),
(2,'user',1,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.402612','2026-07-08 23:36:48.402612',0,'standard',NULL,0,NULL),
(3,'user',2,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.406356','2026-07-08 23:36:48.406356',0,'standard',NULL,0,NULL),
(4,'user',3,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.409110','2026-07-08 23:36:48.409110',0,'standard',NULL,0,NULL),
(5,'user',4,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.413162','2026-07-08 23:36:48.413162',0,'standard',NULL,0,NULL),
(6,'user',5,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.415876','2026-07-08 23:36:48.415876',0,'standard',NULL,0,NULL),
(7,'user',6,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.418934','2026-07-08 23:36:48.418934',0,'standard',NULL,0,NULL),
(8,'commerce',1,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.421206','2026-07-08 23:36:48.421206',0,'standard',NULL,0,NULL),
(10,'commerce',2,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.427901','2026-07-08 23:36:48.427901',0,'standard',NULL,0,NULL),
(12,'store',1,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.432845','2026-07-08 23:36:48.432845',0,'standard',NULL,0,NULL),
(14,'store',2,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.448560','2026-07-08 23:36:48.448560',0,'standard',NULL,0,NULL),
(16,'store',3,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.459782','2026-07-08 23:36:48.459782',0,'standard',NULL,0,NULL),
(18,'delivery_company',1,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.471260','2026-07-08 23:36:48.471260',0,'standard',NULL,0,NULL),
(20,'user',7,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.477480','2026-07-08 23:36:48.477480',0,'standard',NULL,0,NULL),
(21,'user',NULL,7,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.479374','2026-07-08 23:36:48.479374',0,'standard',NULL,0,NULL),
(22,'user',8,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.482609','2026-07-08 23:36:48.482609',0,'standard',NULL,0,NULL),
(23,'user',NULL,8,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.484683','2026-07-08 23:36:48.484683',0,'standard',NULL,0,NULL),
(24,'user',9,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.487781','2026-07-08 23:36:48.487781',0,'standard',NULL,0,NULL),
(25,'user',NULL,9,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.490532','2026-07-08 23:36:48.490532',0,'standard',NULL,0,NULL),
(26,'user',10,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.493451','2026-07-08 23:36:48.493451',0,'standard',NULL,0,NULL),
(27,'user',NULL,10,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.495196','2026-07-08 23:36:48.495196',0,'standard',NULL,0,NULL),
(28,'user',11,NULL,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.498253','2026-07-08 23:36:48.498253',0,'standard',NULL,0,NULL),
(29,'user',NULL,11,0.00000000,0.00000000,0.00000000,'2026-07-08 23:36:48.499962','2026-07-08 23:36:48.499962',0,'standard',NULL,0,NULL);
/*!40000 ALTER TABLE `wallets` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER enforce_single_wallet_per_user BEFORE INSERT ON wallets FOR EACH ROW BEGIN DECLARE wallet_count INT; IF NEW.usuario_id IS NOT NULL THEN SELECT COUNT(*) INTO wallet_count FROM wallets WHERE usuario_id = NEW.usuario_id; IF wallet_count > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Integridad: Este usuario ya posee una billetera DOMI. Solo se permite una por cuenta.'; END IF; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER auto_generate_wallet_alias
  AFTER INSERT ON wallets FOR EACH ROW
  BEGIN
    DECLARE initials VARCHAR(50) DEFAULT 'wallet';
    DECLARE docDigits VARCHAR(10) DEFAULT '000';
    DECLARE baseAlias VARCHAR(60);
    DECLARE candidate VARCHAR(60);
    DECLARE counter INT DEFAULT 1;
    DECLARE exists_alias INT DEFAULT 0;
    IF NEW.owner_type = 'user' THEN
      SELECT
        LOWER(CONCAT(
          SUBSTRING(REGEXP_REPLACE(nombres, '[^a-zA-Z0-9]', ''), 1, 2),
          IFNULL(SUBSTRING(REGEXP_REPLACE(apellidos, '[^a-zA-Z0-9]', ''), 1, 2), '')
        )),
        IFNULL(SUBSTRING(REGEXP_REPLACE(cedula, '[^0-9]', ''), 1, 3), '000')
      INTO initials, docDigits
      FROM profiles WHERE usuario_id = NEW.owner_id LIMIT 1;
    ELSEIF NEW.owner_type = 'commerce' THEN
      SELECT
        LOWER(SUBSTRING(REGEXP_REPLACE(nombre, '[^a-zA-Z0-9]', ''), 1, 4)),
        IFNULL(SUBSTRING(REGEXP_REPLACE(nit, '[^0-9]', ''), 1, 3), '000')
      INTO initials, docDigits
      FROM commerces WHERE id = NEW.owner_id LIMIT 1;
    ELSEIF NEW.owner_type = 'store' THEN
      SELECT
        LOWER(SUBSTRING(REGEXP_REPLACE(c.nombre, '[^a-zA-Z0-9]', ''), 1, 4)),
        IFNULL(SUBSTRING(REGEXP_REPLACE(c.nit, '[^0-9]', ''), 1, 3), '000')
      INTO initials, docDigits
      FROM stores s
      JOIN commerces c ON s.commerce_id = c.id
      WHERE s.id = NEW.owner_id LIMIT 1;
    ELSEIF NEW.owner_type = 'delivery_company' THEN
      SELECT
        LOWER(SUBSTRING(REGEXP_REPLACE(razon_social, '[^a-zA-Z0-9]', ''), 1, 4)),
        IFNULL(SUBSTRING(REGEXP_REPLACE(nit, '[^0-9]', ''), 1, 3), '000')
      INTO initials, docDigits
      FROM delivery_companies WHERE id = NEW.owner_id LIMIT 1;
    ELSEIF NEW.owner_type = 'system' THEN
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
  END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`bienestar_admin_prod`@`localhost`*/ /*!50003 TRIGGER prevent_wallet_owner_change BEFORE UPDATE ON wallets FOR EACH ROW BEGIN IF OLD.usuario_id IS NOT NULL AND NEW.usuario_id IS NOT NULL AND OLD.usuario_id <> NEW.usuario_id THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: La billetera no puede reasignarse a otro usuario. La propiedad es inmutable.'; END IF; END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `withdrawal_accounts`
--

DROP TABLE IF EXISTS `withdrawal_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cuentas bancarias registradas para retiros via Wompi Dispersiones.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `withdrawal_accounts`
--

LOCK TABLES `withdrawal_accounts` WRITE;
/*!40000 ALTER TABLE `withdrawal_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `withdrawal_accounts` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-07-09 11:44:21
