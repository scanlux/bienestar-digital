#!/bin/bash
# Script maestro para restaurar la configuración de seguridad y roles en MariaDB.

echo "--- Iniciando Restauración de Seguridad de Base de Datos ---"

if [ -z "$1" ]; then
  echo "Error: Se requiere proporcionar el host/IP de MariaDB."
  echo "Uso: ./restore_security.sh <DB_HOST>"
  exit 1
fi

DB_HOST=$1
DB_PASS=$(cat ~/db_pass.txt)

if [ -z "$DB_PASS" ]; then
  echo "Error: No se encontró la contraseña root en ~/db_pass.txt"
  exit 1
fi

# Navegar al directorio donde están los scripts para poder usarlos con rutas relativas
cd "$(dirname "$0")"

echo ">> Configurando usuarios del sistema..."
mysql -u root -p"$DB_PASS" -h "$DB_HOST" < 01_create_users.sql

echo ">> Otorgando permisos a bienestar_admin_prod..."
mysql -u root -p"$DB_PASS" -h "$DB_HOST" < 02_grant_admin_prod.sql

echo ">> Otorgando permisos a bienestar_deployer..."
mysql -u root -p"$DB_PASS" -h "$DB_HOST" < 03_grant_deployer.sql

echo ">> Recreando triggers de inmutabilidad (Capa Motor)..."
mysql -u root -p"$DB_PASS" -h "$DB_HOST" < 04_create_triggers.sql

echo "--- ¡Configuración de Seguridad Restaurada con Éxito! ---"
