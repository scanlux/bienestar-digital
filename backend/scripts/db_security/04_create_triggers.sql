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

DELIMITER ;
