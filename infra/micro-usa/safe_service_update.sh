#!/bin/bash
# ==============================================================================
# Script de Actualizacion de Servicio Individual para Micro-USA (Safe Service Update)
# ==============================================================================
# Proposito: Descargar e iniciar un servicio desde GHCR sin compilar localmente.
# Uso: ./safe_service_update.sh <nombre_del_servicio>
# ==============================================================================

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "[ERROR] Debes especificar un servicio (ej: frontend, nginx)."
    exit 1
fi

echo "[INFO] Iniciando actualizacion segura del servicio: $SERVICE..."

echo ""
echo "[1/4] Descargando la ultima imagen de $SERVICE desde GHCR..."
docker compose pull $SERVICE

echo ""
echo "[2/4] Deteniendo $SERVICE para liberar RAM..."
docker compose stop $SERVICE

echo ""
echo "[3/4] Levantando $SERVICE con la nueva imagen..."
docker compose up -d --no-deps $SERVICE

echo ""
echo "[4/4] Limpiando imagenes huerfanas antiguas..."
docker image prune -f

echo ""
echo "[SUCCESS] Actualizacion de $SERVICE finalizada con exito!"
docker ps | grep $SERVICE
