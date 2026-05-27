#!/bin/bash
PW="$(sudo docker exec bienestar-db printenv MYSQL_ROOT_PASSWORD 2>/dev/null || true)"
if [ -z "$PW" ]; then
  PW="$(grep -m1 '^MYSQL_ROOT_PASSWORD=' /opt/bienestar/.env | cut -d= -f2-)"
fi
sudo docker exec -i bienestar-db mariadb -u root -p"$PW" marketplace_db -N -e "
SELECT c.id, c.nombre,
  (SELECT COUNT(*) FROM stores s WHERE s.commerce_id=c.id),
  (SELECT COUNT(*) FROM menus m WHERE m.commerce_id=c.id),
  (SELECT COUNT(*) FROM products p WHERE p.commerce_id=c.id)
FROM commerces c ORDER BY c.id;
"
