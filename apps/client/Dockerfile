# Dev stage ------------------------------------------------------------------------
FROM docker.io/node:24.13.1-bullseye-slim AS dev

WORKDIR /app

COPY package.json  ./

# Install pnpm version defined in package.json "packageManager" property
RUN npm install --global corepack@latest && corepack enable && corepack enable pnpm

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/client/package.json ./apps/client/package.json
COPY packages/eslintconfig/package.json ./packages/eslintconfig/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/hooks/package.json ./packages/hooks/package.json
COPY packages/test-utils/package.json ./packages/test-utils/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json

RUN pnpm install --ignore-scripts # --no-optional

COPY packages/ ./packages/
RUN pnpm --filter @cpn-console/logger run build
RUN pnpm --filter @cpn-console/shared run build

COPY apps/client/ ./apps/client/
RUN pnpm --filter client run icons

ENTRYPOINT [ "pnpm", "--filter", "client", "run", "dev" ]

# Build stage ----------------------------------------------------------------------
FROM dev AS build

ARG APP_VERSION
RUN pnpm --filter @cpn-console/client run build

# Prod stage -----------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.31-alpine AS prod

COPY --from=build /app/apps/client/dist /etc/nginx/html/
COPY --chmod=660 ./apps/client/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=750 ./apps/client/nginx/entrypoint.sh /docker-entrypoint.d/99-envsubst-js-assets.sh

EXPOSE 8080
