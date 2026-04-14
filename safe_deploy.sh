#!/bin/bash
# ==============================================================================
# Script de Despliegue Seguro (Safe Deploy)
# ==============================================================================
# Propósito: Reconstruir y levantar los contenedores de Docker de forma
# secuencial para evitar problemas de Out of Memory (OOM) en servidores
# pequeños como la capa gratuita de Oracle Cloud (1GB RAM).
# ==============================================================================

echo "🚀 Iniciando despliegue seguro para entornos de bajos recursos..."

echo "\n🛑 1. Deteniendo los contenedores actuales para liberar RAM..."
docker compose down

# Limpiar cache colgante de docker ahorra espacio y a veces ayuda con ram residual
echo "\n🧹 2. Limpiando cache de constructores (opcional)..."
docker builder prune -f

echo "\n📦 3. Compilando el Frontend (Proceso con alto consumo de memoria)..."
# Solo compila el frontend
docker compose build frontend

echo "\n📦 4. Compilando el Backend..."
# Solo compila el backend
docker compose build backend

echo "\n🚀 5. Levantando la infraestructura base (MariaDB y Redis)..."
docker compose up -d mariadb redis

echo "\n⏳ Esperando 10 segundos para que la base de datos MySQL esté lista para conexiones..."
sleep 10

echo "\n🚀 6. Levantando la aplicación web (Frontend y Backend)..."
docker compose up -d frontend backend

echo "\n✅ ¡Despliegue finalizado con éxito! Estado de los contenedores:"
docker ps
