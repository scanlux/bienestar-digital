#!/bin/bash
sudo docker exec bienestar-db mariadb -u root -p'7hda}rGb_yuX2@pL9*qN4!zB1vM8' -e "SHOW GRANTS FOR 'bienestar_admin_prod'@'%'; SHOW GRANTS FOR 'bienestar_deployer'@'%';"
