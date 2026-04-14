#!/bin/bash
# ==============================================================================
# Script de Actualización de Servicio Individual (Safe Service Update)
# ==============================================================================
# Propósito: Actualizar un solo servicio (ej: backend) liberando RAM primero.
# Uso: ./safe_service_update.sh <nombre_del_servicio>
# ==============================================================================

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "⚠️ Error: Debes especificar un servicio (ej: backend, frontend)."
    exit 1
fi

echo "🚀 Iniciando actualización segura del servicio: $SERVICE..."

echo "\n🛑 1. Deteniendo $SERVICE para liberar RAM..."
docker compose stop $SERVICE

echo "\n🧹 2. Limpiando cache de construcción..."
docker builder prune -f

echo "\n📦 3. Reconstruyendo $SERVICE..."
docker compose build $SERVICE

echo "\n🚀 4. Levantando $SERVICE..."
docker compose up -d --no-deps $SERVICE

echo "\n✅ ¡Actualización de $SERVICE finalizada con éxito!"
docker ps | grep $SERVICE
