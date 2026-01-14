# Plataforma de Análisis de Discurso Público - Entorno de Desarrollo

Este proyecto utiliza Docker Compose para orquestar un entorno de desarrollo local completo.

## Requisitos Previos

- Docker Desktop instalado y ejecutándose.
- Git (opcional, para control de versiones).

## Estructura del Proyecto

- `infra/nginx`: Configuración del proxy inverso.
- `backend`: API Node.js (Express/Fastify).
- `frontend`: Aplicación Next.js.
- `docker-compose.dev.yml`: Definición de servicios.

## Cómo Iniciar

1.  **Copiar variables de entorno:**
    ```bash
    cp .env.example .env
    ```
    *(Nota: En Windows PowerShell puede usar `copy .env.example .env`)*

2.  **Levantar los servicios:**
    ```bash
    docker compose -f docker-compose.dev.yml up --build
    ```

3.  **Acceder a la aplicación:**
    - Frontend: [http://localhost](http://localhost)
    - Backend API: [http://localhost/api/health](http://localhost/api/health)
    - Base de datos: Puerto 3306 (usuario/pass en `.env`)

## Servicios

| Servicio | Puerto Interno | Descripción |
| :--- | :--- | :--- |
| `nginx` | 80 | Proxy inverso y punto de entrada. |
| `frontend` | 3000 | Servidor de desarrollo Next.js. |
| `backend` | 4000 | API Node.js. |
| `mariadb` | 3306 | Base de datos relacional. |
| `redis` | 6379 | Caché y colas de mensajes. |
