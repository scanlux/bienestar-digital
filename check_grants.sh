#!/bin/bash
DB_PASS=$(cat ~/db_pass.txt)
docker exec bienestar_db_prod mariadb -u root -p"$DB_PASS" -e "SHOW GRANTS FOR 'bienestar_admin_prod'@'%'; SHOW GRANTS FOR 'bienestar_deployer'@'%';"
