# Base stage
FROM node:18.12.1-bullseye-slim as base

RUN npm install --global pnpm

WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:node apps/server/ ./apps/server/
COPY --chown=node:node packages/shared/ ./packages/shared/
COPY --chown=node:node packages/test-utils/ ./packages/test-utils/


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
RUN chown node:node /app

COPY --chown=node:node --from=build /app/build .
USER node

ENTRYPOINT ["node", "src/server.js"]
