-- MIGRACIÓN: Agregar campo telefono a la tabla stores
-- Fecha: 2026-04-17

USE marketplace_db;

ALTER TABLE stores ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) NULL AFTER nombre_sucursal;
