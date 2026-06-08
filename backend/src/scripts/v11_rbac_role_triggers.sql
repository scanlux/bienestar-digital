-- Script de triggers para proteccion de las tablas RBAC (roles, role_permissions, user_roles)
-- Solo permite modificaciones si el usuario de base de datos es 'root' o 'bienestar_deployer',
-- o si el backend establece la variable de sesion @domi_is_root = 1.

DELIMITER //

-- 1. Triggers para roles
DROP TRIGGER IF EXISTS rbac_roles_before_insert//
CREATE TRIGGER rbac_roles_before_insert
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
END//

DROP TRIGGER IF EXISTS rbac_roles_before_update//
CREATE TRIGGER rbac_roles_before_update
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
END//

DROP TRIGGER IF EXISTS rbac_roles_before_delete//
CREATE TRIGGER rbac_roles_before_delete
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
END//


-- 2. Triggers para role_permissions
DROP TRIGGER IF EXISTS rbac_role_permissions_before_insert//
CREATE TRIGGER rbac_role_permissions_before_insert
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
END//

DROP TRIGGER IF EXISTS rbac_role_permissions_before_update//
CREATE TRIGGER rbac_role_permissions_before_update
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
END//

DROP TRIGGER IF EXISTS rbac_role_permissions_before_delete//
CREATE TRIGGER rbac_role_permissions_before_delete
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
END//


-- 3. Triggers para user_roles
DROP TRIGGER IF EXISTS rbac_user_roles_before_insert//
CREATE TRIGGER rbac_user_roles_before_insert
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
END//

DROP TRIGGER IF EXISTS rbac_user_roles_before_update//
CREATE TRIGGER rbac_user_roles_before_update
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
END//

DROP TRIGGER IF EXISTS rbac_user_roles_before_delete//
CREATE TRIGGER rbac_user_roles_before_delete
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
END//

DELIMITER ;
