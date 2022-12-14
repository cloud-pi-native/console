# Base stage
FROM node:18.12.1-bullseye-slim as base

RUN npm install --global pnpm

WORKDIR /app
RUN chown node:root /app

COPY --chown=node:root pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:root apps/server/ ./apps/server/
COPY --chown=node:root packages/shared/ ./packages/shared/
COPY --chown=node:root packages/test-utils/ ./packages/test-utils/


# Dev stage
FROM base as dev

WORKDIR /app

USER node
RUN pnpm install

ENTRYPOINT [ "pnpm", "--filter", "server", "run", "dev" ]


# Build stage
FROM base as build

WORKDIR /app

RUN pnpm --filter server --prod deploy build


# Prod stage
FROM node:18.12.1-bullseye-slim as prod

WORKDIR /app
RUN chown node:root /app

COPY --chown=node:root --from=build /app/build .

USER node
CMD ["node", "src/server.js"]
