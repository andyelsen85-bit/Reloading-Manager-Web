################################
# Stage 1 – Install all dependencies
################################
FROM node:22-slim AS deps

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
COPY docker/build-migrate.mjs ./docker/build-migrate.mjs

RUN pnpm --filter @workspace/api-server run build

# Bundle the standalone migration script via a Node.js build script
# (avoids relying on a specific binary path in pnpm's virtual store)
RUN node docker/build-migrate.mjs

################################
# Stage 4 – Production image
# Use slim (Debian/glibc) to match the lockfile platform — do NOT use alpine
# (musl) because the pnpm lockfile was generated on a glibc system and the
# native rollup/esbuild binaries are glibc-only.
################################
FROM node:22-slim AS production

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
