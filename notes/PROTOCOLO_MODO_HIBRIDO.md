# Propuesta de Protocolo: Modo Híbrido (Docker Bind Mounts)

> [!NOTE]
> Esta propuesta fue pospuesta el 11 de Abril de 2026 debido a limitaciones de RAM en el servidor Oracle Cloud (1GB). Se recomienda implementar cuando se escale la instancia o se optimice el consumo de Next.js.

## Concepto
Ejecutar el entorno de desarrollo (`npm run dev`) dentro de contenedores Docker en el servidor, vinculando las carpetas de código mediante volúmenes.

## Ventajas
- No requiere `docker compose build` para cada cambio.
- Hot-reload instantáneo a través de Rclone.
- Entorno de ejecución idéntico al de producción pero con herramientas de desarrollo.

## Archivos Preparados
- `docker-compose.dev.yml`: Ya configurado con `WATCHPACK_POLLING=true` y bind mounts.
- `Dockerfile` (Backend/Frontend): Configurados con `CMD ["npm", "run", "dev"]`.

## Script de Inicio Sugerido (`safe_hybrid_dev.sh`)
```bash
#!/bin/bash
# Levanta el modo hibrido de forma secuencial para ahorrar memoria
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d mariadb redis
sleep 10
docker compose -f docker-compose.dev.yml up -d backend
sleep 5
docker compose -f docker-compose.dev.yml up -d frontend nginx
```

## Impedimentos Actuales
1. **RAM:** `next dev` consume ~600MB-800MB solo en el frontend.
2. **CPU:** El polling de archivos sobre FUSE (Rclone) puede generar carga alta en el servidor.
