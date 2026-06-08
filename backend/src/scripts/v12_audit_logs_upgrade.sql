-- Script de actualizacion para la tabla security_audit_logs
-- Amplia el tamaño de user_agent, agrega contexto de recursos e indices optimizados.

-- 1. Ampliar user_agent a TEXT
ALTER TABLE security_audit_logs
  MODIFY COLUMN user_agent TEXT NULL;

-- 2. Agregar columnas de contexto de recurso despues de details
ALTER TABLE security_audit_logs
  ADD COLUMN resource_type VARCHAR(50) NULL COMMENT 'Ej: commerce, store, role, video, request'
      AFTER details,
  ADD COLUMN resource_id   INT          NULL COMMENT 'ID del recurso afectado'
      AFTER resource_type;

-- 3. Indices para busquedas paginadas y filtradas en el dashboard de seguridad
CREATE INDEX idx_sal_event_type  ON security_audit_logs (event_type);
CREATE INDEX idx_sal_severity    ON security_audit_logs (severity);
CREATE INDEX idx_sal_actor       ON security_audit_logs (actor_type, actor_id);
CREATE INDEX idx_sal_resource    ON security_audit_logs (resource_type, resource_id);
CREATE INDEX idx_sal_created_at  ON security_audit_logs (created_at DESC);

-- 4. Asegurar permisos para el usuario de la aplicacion
GRANT SELECT, INSERT ON marketplace_db.security_audit_logs TO 'bienestar_admin_prod'@'%';
FLUSH PRIVILEGES;
