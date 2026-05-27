#!/bin/bash
set -euo pipefail
PW="$(sudo docker exec bienestar-db printenv MYSQL_ROOT_PASSWORD 2>/dev/null || true)"
if [ -z "$PW" ]; then
  PW="$(grep -m1 '^MYSQL_ROOT_PASSWORD=' /opt/bienestar/.env | cut -d= -f2-)"
fi
sudo docker exec -i bienestar-db mariadb -u root -p"$PW" marketplace_db < /tmp/fix_orphan_products_after_seed.sql
echo "Orphan products fixed."
