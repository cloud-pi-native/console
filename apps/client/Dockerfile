# Dev stage
FROM docker.io/node:20.14.0-bullseye-slim AS dev

WORKDIR /app
RUN npm install --ignore-scripts --location=global pnpm@9.4.0
COPY --chown=node:root package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:root patches ./patches
COPY --chown=node:root apps/client/package.json ./apps/client/package.json
COPY --chown=node:root packages/eslintconfig/package.json ./packages/eslintconfig/package.json
COPY --chown=node:root packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:root packages/test-utils/package.json ./packages/test-utils/package.json
COPY --chown=node:root packages/tsconfig/package.json ./packages/tsconfig/package.json
RUN pnpm install --ignore-scripts # --no-optional
COPY --chown=node:root packages/ ./packages/
RUN pnpm --filter shared run build
COPY --chown=node:root apps/client/ ./apps/client/
ENTRYPOINT [ "pnpm", "--filter", "client", "run", "dev" ]


# Build stage
FROM dev AS build

ARG APP_VERSION
RUN pnpm --filter client run build


# Prod stage
FROM docker.io/bitnami/nginx:1.26.1 AS prod

USER 0
COPY --chown=1001:0 --chmod=770 --from=build /app/apps/client/dist /opt/bitnami/nginx/html/
COPY --chown=1001:0 --chmod=660 ./apps/client/nginx/default.conf /opt/bitnami/nginx/conf/server_blocks/default.conf
COPY --chown=1001:0 ./apps/client/nginx/entrypoint.sh /docker-entrypoint-initdb.d/load-env.sh
USER 1001
EXPOSE 8080
