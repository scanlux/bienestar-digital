FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY telemetry/package.json ./telemetry/
RUN node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json')); delete pkg.scripts.prepare; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2))"
RUN pnpm install --filter telemetry --frozen-lockfile --prod
COPY telemetry ./telemetry
WORKDIR /app/telemetry
EXPOSE 4001
CMD ["pnpm", "start"]
