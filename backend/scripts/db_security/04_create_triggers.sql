USE `marketplace_db`;

DELIMITER //

-- Triggers para domi_ledger
CREATE OR REPLACE TRIGGER protect_ledger_update
BEFORE UPDATE ON domi_ledger
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El libro mayor (domi_ledger) es inmutable. No se permite UPDATE.';
  END IF;
END;
//

CREATE OR REPLACE TRIGGER protect_ledger_delete
BEFORE DELETE ON domi_ledger
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El libro mayor (domi_ledger) es inmutable. No se permite DELETE.';
  END IF;
END;
//

-- Triggers para token_registry
CREATE OR REPLACE TRIGGER protect_token_registry_update
BEFORE UPDATE ON token_registry
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El registro de tokens es inmutable. No se permite UPDATE.';
  END IF;
END;
//

CREATE OR REPLACE TRIGGER protect_token_registry_delete
BEFORE DELETE ON token_registry
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: El registro de tokens es inmutable. No se permite DELETE.';
  END IF;
END;
//

-- Triggers para protocol_rules
CREATE OR REPLACE TRIGGER protect_protocol_rules_update
BEFORE UPDATE ON protocol_rules
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: Reglas de protocolo protegidas. Operación UPDATE no autorizada en esta capa.';
  END IF;
END;
//

CREATE OR REPLACE TRIGGER protect_protocol_rules_delete
BEFORE DELETE ON protocol_rules
FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad V3: Reglas de protocolo protegidas. Operación DELETE no autorizada en esta capa.';
  END IF;
END;
//

-- ==============================================================================
-- 🌟 TRIGGERS DE IDENTIDAD, ROLES Y PROPIEDAD (REDESIGN 2026)
-- ==============================================================================

-- Categoria 1: Integridad de Identidad (Usuario root no logueable)
CREATE OR REPLACE TRIGGER prevent_root_activation_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF NEW.rol = 'root' AND NEW.estado = 'activo' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: El rol root no puede tener estado activo. Es una cuenta de sistema interna.';
  END IF;
END;
//

CREATE OR REPLACE TRIGGER prevent_root_activation_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.rol = 'root' AND NEW.estado = 'activo' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: El rol root no puede tener estado activo. Es una cuenta de sistema interna.';
  END IF;
END;
//

-- Categoria 1: Unicidad de Wallet por Usuario
CREATE OR REPLACE TRIGGER enforce_single_wallet_per_user
BEFORE INSERT ON wallets
FOR EACH ROW
BEGIN
  DECLARE wallet_count INT;
  IF NEW.usuario_id IS NOT NULL THEN
    SELECT COUNT(*) INTO wallet_count
    FROM wallets WHERE usuario_id = NEW.usuario_id;
    IF wallet_count > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integridad: Este usuario ya posee una billetera DOMI. Solo se permite una por cuenta.';
    END IF;
  END IF;
END;
//

-- Categoria 1: Inmutabilidad de Propietario de Wallet
CREATE OR REPLACE TRIGGER prevent_wallet_owner_change
BEFORE UPDATE ON wallets
FOR EACH ROW
BEGIN
  IF OLD.usuario_id IS NOT NULL
     AND NEW.usuario_id IS NOT NULL
     AND OLD.usuario_id <> NEW.usuario_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: La billetera no puede reasignarse a otro usuario. La propiedad es inmutable.';
  END IF;
END;
//

-- Categoria 1: Autocreación de Wallet para nuevos usuarios
CREATE OR REPLACE TRIGGER auto_create_user_wallet
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO wallets (owner_type, owner_id, usuario_id, balance_custody, balance_utility, locked_balance)
  VALUES ('user', NEW.id, NEW.id, 0.0000, 0.0000, 0.0000);
END;
//

-- Categoria 2: Integridad de Roles (Solo customer puede ser es_repartidor)
CREATE OR REPLACE TRIGGER enforce_driver_role_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF NEW.es_repartidor = 1 AND NEW.rol <> 'customer' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede activar el modo repartidor.';
  END IF;
END;
//

CREATE OR REPLACE TRIGGER enforce_driver_role_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.es_repartidor = 1 AND NEW.rol <> 'customer' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede activar el modo repartidor.';
  END IF;
END;
//

-- Categoria 2: Integridad de Roles (repartidor_activo requiere es_repartidor)
CREATE OR REPLACE TRIGGER prevent_active_driver_without_flag
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.repartidor_activo = 1 AND NEW.es_repartidor = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio: No se puede activar el turno de repartidor sin haber habilitado el modo repartidor primero.';
  END IF;
END;
//

-- Categoria 3: Integridad de Propiedad (Solo admin puede tener comercio)
CREATE OR REPLACE TRIGGER enforce_single_commerce_insert
BEFORE INSERT ON commerces
FOR EACH ROW
BEGIN
  DECLARE user_rol VARCHAR(20);
  IF NEW.usuario_id IS NOT NULL THEN
    SELECT rol INTO user_rol FROM users WHERE id = NEW.usuario_id;
    IF user_rol <> 'admin' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol admin puede ser propietario de un comercio.';
    END IF;
  END IF;
END;
//

-- Categoria 3: Integridad de Propiedad (Inmutabilidad de Propietario de Comercio)
CREATE OR REPLACE TRIGGER prevent_commerce_owner_change
BEFORE UPDATE ON commerces
FOR EACH ROW
BEGIN
  IF OLD.usuario_id IS NOT NULL
     AND NEW.usuario_id IS NOT NULL
     AND OLD.usuario_id <> NEW.usuario_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: El propietario de un comercio no puede reasignarse. Requiere proceso administrativo.';
  END IF;
END;
//

-- Categoria 3: Integridad de Propiedad (Inmutabilidad de Gerente de Sede)
CREATE OR REPLACE TRIGGER prevent_store_manager_change
BEFORE UPDATE ON stores
FOR EACH ROW
BEGIN
  IF OLD.usuario_id IS NOT NULL
     AND NEW.usuario_id IS NOT NULL
     AND OLD.usuario_id <> NEW.usuario_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: El gerente responsable de una sede no puede reasignarse directamente. Requiere proceso administrativo.';
  END IF;
END;
//

DELIMITER ;
