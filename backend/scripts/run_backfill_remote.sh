#!/bin/bash
set -euo pipefail

PW="$(sudo docker exec bienestar-db printenv MYSQL_ROOT_PASSWORD 2>/dev/null || true)"
if [ -z "$PW" ] && [ -f /opt/bienestar/.env ]; then
  PW="$(grep -m1 '^MYSQL_ROOT_PASSWORD=' /opt/bienestar/.env | cut -d= -f2- || true)"
fi
if [ -z "$PW" ] && [ -f /opt/bienestar/.env ]; then
  PW="$(grep -m1 '^DB_PASSWORD=' /opt/bienestar/.env | cut -d= -f2- || true)"
fi
if [ -z "$PW" ]; then
  echo "No se encontro MYSQL_ROOT_PASSWORD ni DB_PASSWORD" >&2
  exit 1
fi

sudo docker exec -i bienestar-db mariadb -u root -p"$PW" marketplace_db < /tmp/backfill_catalog_enable_all.sql
echo "Backfill completado."
