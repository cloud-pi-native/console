# Dev stage ------------------------------------------------------------------------
FROM docker.io/node:24.12.0-bullseye-slim AS dev

WORKDIR /app

COPY --chown=node:root package.json  ./

RUN npm install --global corepack@latest && corepack enable && corepack enable pnpm

COPY --chown=node:root pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:root patches ./patches
COPY --chown=node:root apps/client/package.json ./apps/client/package.json
COPY --chown=node:root packages/eslintconfig/package.json ./packages/eslintconfig/package.json
COPY --chown=node:root packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:root packages/test-utils/package.json ./packages/test-utils/package.json
COPY --chown=node:root packages/tsconfig/package.json ./packages/tsconfig/package.json

# Install pnpm version defined in package.json "packageManager" property
RUN npm install --global corepack@latest && corepack enable && corepack enable pnpm

RUN pnpm install --ignore-scripts # --no-optional

COPY --chown=node:root packages/ ./packages/
RUN pnpm --filter @cpn-console/shared run build

COPY --chown=node:root apps/client/ ./apps/client/
RUN pnpm --filter client run icons

ENTRYPOINT [ "pnpm", "--filter", "client", "run", "dev" ]


# Build stage ----------------------------------------------------------------------
FROM dev AS build

ARG APP_VERSION
RUN pnpm --filter @cpn-console/client run build


# Prod stage -----------------------------------------------------------------------
FROM docker.io/bitnamilegacy/nginx:1.29.1 AS prod

USER 0
COPY --chown=1001:0 --chmod=770 --from=build /app/apps/client/dist /opt/bitnami/nginx/html/
COPY --chown=1001:0 --chmod=660 ./apps/client/nginx/default.conf /opt/bitnami/nginx/conf/server_blocks/default.conf
COPY --chown=1001:0 ./apps/client/nginx/entrypoint.sh /docker-entrypoint-initdb.d/load-env.sh
USER 1001
EXPOSE 8080
