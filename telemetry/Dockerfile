# Etapa 1 (builder): Corre en la plataforma destino (ARM64) para instalar
# las dependencias nativas correctas.
ARG BUILDPLATFORM
ARG TARGETPLATFORM
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY telemetry/package.json ./telemetry/
RUN node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json')); delete pkg.scripts.prepare; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2))"
RUN pnpm install --filter telemetry --frozen-lockfile --prod
COPY telemetry ./telemetry

# Etapa 2 (final): Imagen minima que corre en ARM64 (destino del servidor).
# Solo copia el codigo y node_modules ya instalados desde el builder.
FROM --platform=$TARGETPLATFORM node:22-alpine
WORKDIR /app/telemetry
COPY --from=builder /app/telemetry ./
COPY --from=builder /app/node_modules ../node_modules
EXPOSE 4001
CMD ["node", "src/server.js"]
