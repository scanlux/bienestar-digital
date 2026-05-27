#!/bin/bash
sudo docker exec bienestar-db mariadb -u root -p'7hda}rGb_yuX2@pL9*qN4!zB1vM8' -e "ALTER TABLE marketplace_db.products ADD COLUMN IF NOT EXISTS tags TEXT;"
echo "✅ SQL ejecutado correctamente."
