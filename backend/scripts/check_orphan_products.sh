#!/bin/bash
PW="$(sudo docker exec bienestar-db printenv MYSQL_ROOT_PASSWORD 2>/dev/null || true)"
sudo docker exec -i bienestar-db mariadb -u root -p"$PW" marketplace_db -e "
SELECT p.id, p.nombre, p.categoria_id, c.nombre AS cat
FROM products p
LEFT JOIN categorias c ON c.id = p.categoria_id
WHERE p.commerce_id IN (6,12,13)
LIMIT 15;
"
