#!/bin/bash
if [ -f /opt/bienestar/.env ]; then
  export $(grep -v '^#' /opt/bienestar/.env | xargs)
fi
sudo docker exec bienestar-db mariadb -u root -p"${DB_ROOT_PASSWORD}" -e "ALTER TABLE marketplace_db.products ADD COLUMN IF NOT EXISTS tags TEXT;"
echo "SQL ejecutado correctamente."
