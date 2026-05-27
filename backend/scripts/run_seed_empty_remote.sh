#!/bin/bash
set -euo pipefail

HOST_SCRIPT="/opt/bienestar/backend/scripts/seed_empty_commerces_catalog.js"
sudo docker cp "$HOST_SCRIPT" bienestar-backend:/app/scripts/seed_empty_commerces_catalog.js
sudo docker exec bienestar-backend node scripts/seed_empty_commerces_catalog.js
