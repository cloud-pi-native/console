# Dev stage ------------------------------------------------------------------------
FROM docker.io/node:24.13.1-bullseye-slim AS dev

WORKDIR /app

COPY --chown=node:root package.json  ./

# Install pnpm version defined in package.json "packageManager" property
RUN npm install --global corepack@latest && corepack enable && corepack enable pnpm

COPY --chown=node:root pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:root apps/client/package.json ./apps/client/package.json
COPY --chown=node:root packages/eslintconfig/package.json ./packages/eslintconfig/package.json
COPY --chown=node:root packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:root packages/logger/package.json ./packages/logger/package.json
COPY --chown=node:root packages/test-utils/package.json ./packages/test-utils/package.json
COPY --chown=node:root packages/tsconfig/package.json ./packages/tsconfig/package.json

RUN pnpm install --ignore-scripts # --no-optional

COPY --chown=node:root packages/ ./packages/
RUN pnpm --filter @cpn-console/logger run build
RUN pnpm --filter @cpn-console/shared run build

COPY --chown=node:root apps/client/ ./apps/client/
RUN pnpm --filter client run icons

ENTRYPOINT [ "pnpm", "--filter", "client", "run", "dev" ]


# Build stage ----------------------------------------------------------------------
FROM dev AS build

ARG APP_VERSION
RUN pnpm --filter @cpn-console/client run build


# Prod stage -----------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.31-alpine AS prod

COPY --chown=nginx:root --from=build /app/apps/client/dist /etc/nginx/html/
COPY --chown=nginx:root --chmod=660 ./apps/client/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:root --chmod=750 ./apps/client/nginx/entrypoint.sh /docker-entrypoint.d/99-envsubst-js-assets.sh

RUN chmod -R g=u /etc/nginx/html

EXPOSE 8080
