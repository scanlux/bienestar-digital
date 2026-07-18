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

-- Categoria 1: Unicidad de Wallet por Propietario (Redesign v8)
CREATE OR REPLACE TRIGGER enforce_single_wallet_per_user
BEFORE INSERT ON wallets
FOR EACH ROW
BEGIN
  DECLARE wallet_count INT;
  IF NEW.owner_type IS NOT NULL AND NEW.owner_id IS NOT NULL THEN
    SELECT COUNT(*) INTO wallet_count
    FROM wallets WHERE owner_type = NEW.owner_type AND owner_id = NEW.owner_id;
    IF wallet_count > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Integridad: Este propietario (owner_type+owner_id) ya posee una billetera DOMI.';
    END IF;
  END IF;
END;
//

-- Categoria 1: Inmutabilidad de Propietario de Wallet (Redesign v8)
CREATE OR REPLACE TRIGGER prevent_wallet_owner_change
BEFORE UPDATE ON wallets
FOR EACH ROW
BEGIN
  IF (OLD.owner_type <> NEW.owner_type) OR (OLD.owner_id <> NEW.owner_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seguridad: La propiedad de la billetera (owner_type+owner_id) es inmutable.';
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

-- Categoria 4: Snapshots y Auditoria Financiera DOMI
CREATE OR REPLACE TRIGGER auto_snapshot_protocol_rules
AFTER UPDATE ON protocol_rules FOR EACH ROW
BEGIN
  INSERT INTO protocol_rules_history (original_rule_id, snapshot, changed_by)
  VALUES (OLD.id, JSON_OBJECT(
    'threshold_fiat_cop', OLD.threshold_fiat_cop,
    'base_cost_domis', OLD.base_cost_domis,
    'percentage_rate', OLD.percentage_rate,
    'effective_date', OLD.effective_date
  ), @domi_session_user_id);
END;
//

CREATE OR REPLACE TRIGGER protect_peg_history_update
BEFORE UPDATE ON domi_peg_history FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El historial de peg del DOMI es inmutable.';
  END IF;
END;
//

CREATE OR REPLACE TRIGGER protect_peg_history_delete
BEFORE DELETE ON domi_peg_history FOR EACH ROW
BEGIN
  IF @domi_bypass_security IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seguridad: El historial de peg del DOMI es inmutable.';
  END IF;
END;
//

-- Categoria 5: Seguridad de Pedidos (Solo customer puede hacer pedidos)
CREATE OR REPLACE TRIGGER enforce_customer_role_on_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  DECLARE user_rol VARCHAR(20);
  SELECT rol INTO user_rol FROM users WHERE id = NEW.customer_user_id;
  IF user_rol IS NULL OR user_rol <> 'customer' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio: Solo un usuario con rol customer puede realizar pedidos.';
  END IF;
END;
//

-- Categoria 6: Sincronización Automática de Roles RBAC
CREATE OR REPLACE TRIGGER auto_assign_customer_role
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  SET @domi_is_root = 1;
  IF NEW.rol = 'customer' THEN
    IF NEW.es_repartidor = 1 THEN
      INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES ('user', NEW.id, 11);
    ELSE
      INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES ('user', NEW.id, 10);
    END IF;
  END IF;
  SET @domi_is_root = NULL;
END;
//

CREATE OR REPLACE TRIGGER auto_sync_customer_role_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  SET @domi_is_root = 1;
  IF OLD.rol = 'customer' AND NEW.rol = 'customer' THEN
    IF OLD.es_repartidor = 0 AND NEW.es_repartidor = 1 THEN
      DELETE FROM user_roles WHERE user_type = 'user' AND user_id = NEW.id AND role_id = 10;
      INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES ('user', NEW.id, 11);
    ELSEIF OLD.es_repartidor = 1 AND NEW.es_repartidor = 0 THEN
      DELETE FROM user_roles WHERE user_type = 'user' AND user_id = NEW.id AND role_id = 11;
      INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES ('user', NEW.id, 10);
    END IF;
  ELSEIF OLD.rol <> 'customer' AND NEW.rol = 'customer' THEN
    IF NEW.es_repartidor = 1 THEN
      INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES ('user', NEW.id, 11);
    ELSE
      INSERT IGNORE INTO user_roles (user_type, user_id, role_id) VALUES ('user', NEW.id, 10);
    END IF;
  ELSEIF OLD.rol = 'customer' AND NEW.rol <> 'customer' THEN
    DELETE FROM user_roles WHERE user_type = 'user' AND user_id = NEW.id AND role_id IN (10, 11);
  END IF;
  SET @domi_is_root = NULL;
END;
//

DELIMITER ;

