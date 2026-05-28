# Configuracion del Servidor Micro-USA (Presentacion y Frontend)

Este directorio contiene las configuraciones necesarias para desplegar la capa de presentacion (Nginx proxy reverso y el Frontend Next.js) en la instancia Micro-USA.

## 1. Prerrequisitos en el Servidor (Ejecutar en la Micro-USA)

Conectate por SSH a la Micro-USA y ejecuta los siguientes comandos para preparar la maquina:

### 1.1 Instalar Docker y Docker Compose
```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
sudo apt install docker.io -y
sudo systemctl enable --now docker

# Agregar tu usuario al grupo docker para ejecutar sin sudo
sudo usermod -aG docker $USER
# (Es necesario cerrar sesion y volver a entrar para aplicar los cambios de grupo)

# Instalar Docker Compose
sudo apt install docker-compose-v2 -y
```

### 1.2 Instalar Certbot y Obtener SSL Certificado
Asegurate de que tu dominio (ej: trendy.sytes.net) ya apunte a la IP publica de esta Micro-USA antes de ejecutar:

```bash
# Instalar Certbot
sudo apt install certbot -y

# Detener cualquier servicio temporalmente en el puerto 80 para la verificacion
# Obtener el certificado SSL standalone
sudo certbot certonly --standalone -d trendy.sytes.net
```

Los certificados se guardaran en la ruta por defecto: `/etc/letsencrypt/live/trendy.sytes.net/`

---

## 2. Despliegue de Servicios (Directorio /opt/bienestar)

### 2.1 Estructura en el Servidor
Crea y copia el contenido de esta carpeta `infra/micro-usa/` en la ruta `/opt/bienestar/` del servidor:

```
/opt/bienestar/
  ├── docker-compose.yml
  ├── safe_service_update.sh
  └── nginx/
        └── nginx.prod.conf
```

### 2.2 Iniciar por primera vez
```bash
cd /opt/bienestar

# Iniciar los contenedores Next.js y Nginx
docker compose up -d
```

---

## 3. Automatizacion de Renovacion SSL (Cronjob)

Para asegurar que los certificados SSL no venzan, configura una tarea programada:

1. Abre el editor de crontab:
   ```bash
   sudo crontab -e
   ```
2. Añade la siguiente linea al final del archivo (ejecuta la renovacion diaria a las 03:00 AM y recarga Nginx sin caida de servicio):
   ```
   0 3 * * * certbot renew --quiet && docker exec bienestar-nginx nginx -s reload
   ```
