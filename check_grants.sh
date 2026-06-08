#!/bin/bash
if [ -f /opt/bienestar/.env ]; then
  export $(grep -v '^#' /opt/bienestar/.env | xargs)
fi
sudo docker exec bienestar-db mariadb -u root -p"${DB_ROOT_PASSWORD}" -e "SHOW GRANTS FOR 'bienestar_admin_prod'@'%'; SHOW GRANTS FOR 'bienestar_deployer'@'%';"
