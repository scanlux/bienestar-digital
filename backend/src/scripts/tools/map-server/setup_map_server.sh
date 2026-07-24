#!/bin/bash
# Setup script for self-hosted map server on arm-bogota

MAP_DIR="/opt/bienestar/map-server"
echo "=== Creando directorios en $MAP_DIR ==="
sudo mkdir -p "$MAP_DIR/data"
sudo chown -R $USER:$USER "$MAP_DIR"
cd "$MAP_DIR"

echo "=== Descargando docker-compose.yml ==="
cat << 'EOF' > docker-compose.yml
version: '3.8'

services:
  tileserver:
    image: maptiler/tileserver-gl:latest
    container_name: map-tileserver
    ports:
      - "8080:80"
    volumes:
      - ./data:/data
    command: ["-p", "80", "--mbtiles", "colombia.mbtiles"]
    restart: always
EOF

echo "=== Descargando datos geográficos de Colombia (OpenStreetMap) ==="
# Descarga de un extracto de vector tiles de Colombia desde mirror de la Uni Freiburg
curl -L -o data/colombia.mbtiles "https://cplx.vm.uni-freiburg.de/storage/enroute-GeoJSONv003/South%20America/Colombia.mbtiles"

echo "=== Levantando contenedor Docker de TileServer GL ==="
sudo docker compose up -d

echo "=== Servidor de Mapas OSM Iniciado Correctamente ==="
echo "Accede localmente a través de: http://localhost:8080"
