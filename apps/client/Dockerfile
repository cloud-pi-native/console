# Base stage
FROM docker.io/node:18.17.1-bullseye-slim AS base

RUN npm install --location=global pnpm@8.6.10
WORKDIR /app
RUN chown node:node /app
COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:node apps/client/ ./apps/client/
COPY --chown=node:node packages/ ./packages/


# Dev stage
FROM base AS dev

USER node
RUN pnpm install --no-optional
RUN pnpm --filter shared run build 
ENTRYPOINT [ "pnpm", "--filter", "client", "run", "dev" ]


# Build stage
FROM base AS build

ARG APP_VERSION
RUN pnpm install --no-optional
RUN pnpm --filter shared run build 
RUN pnpm --filter client run build


# Prod stage
FROM docker.io/bitnami/nginx:1.24.0 AS prod

USER 0
COPY --chown=1001:0 --chmod=770 --from=build /app/apps/client/dist /opt/bitnami/nginx/html/
COPY --chown=1001:0 --chmod=660 ./apps/client/nginx/default.conf /opt/bitnami/nginx/conf/server_blocks/default.conf
COPY --chown=1001:0 ./apps/client/nginx/entrypoint.sh /docker-entrypoint-initdb.d/load-env.sh
USER 1001
EXPOSE 8080
