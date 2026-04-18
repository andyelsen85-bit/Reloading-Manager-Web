################################
# Stage 1 – Install all dependencies
################################
FROM node:22-alpine AS deps

RUN npm install -g pnpm@10

WORKDIR /workspace

# Copy manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/api-spec/package.json         ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-zod/package.json          ./lib/api-zod/
COPY lib/db/package.json               ./lib/db/
COPY artifacts/api-server/package.json         ./artifacts/api-server/
COPY artifacts/reloading-manager/package.json  ./artifacts/reloading-manager/

RUN pnpm install --frozen-lockfile

################################
# Stage 2 – Build the React frontend
################################
FROM deps AS build-frontend

COPY lib/ ./lib/
COPY artifacts/reloading-manager/ ./artifacts/reloading-manager/

# BASE_PATH=/ because in Docker we serve from the root path
# PORT is required by vite.config.ts at config-load time
ENV BASE_PATH=/ PORT=3000 NODE_ENV=production

RUN pnpm --filter @workspace/reloading-manager run build

################################
# Stage 3 – Build the API server + migration bundle
################################
FROM deps AS build-api

COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

RUN pnpm --filter @workspace/api-server run build

# Bundle the standalone migration script using esbuild
RUN node_modules/.bin/esbuild \
      lib/db/migrate.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --outfile=artifacts/api-server/dist/migrate.mjs \
      --external:pg-native \
      --banner:js="import { createRequire as __cr } from 'node:module'; globalThis.require = __cr(import.meta.url);"

################################
# Stage 4 – Production image
################################
FROM node:22-alpine AS production

WORKDIR /app

# Copy bundled server (index.mjs + pino workers + migration script)
COPY --from=build-api /workspace/artifacts/api-server/dist ./dist

# Copy compiled frontend into the server's public directory
# (Express serves it via express.static in production mode)
COPY --from=build-frontend /workspace/artifacts/reloading-manager/dist/public ./dist/public

# Copy drizzle migration metadata (the migrator tracks applied migrations via a table)
COPY lib/db/drizzle ./drizzle

# Simple entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
