# Base stage
FROM docker.io/node:18.16.0-bullseye-slim AS base

RUN npm install --location=global pnpm
WORKDIR /app
RUN chown node:root /app
COPY --chown=node:root pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:root apps/server/ ./apps/server/
COPY --chown=node:root packages/shared/ ./packages/shared/
COPY --chown=node:root packages/tsconfig/ ./packages/tsconfig/
COPY --chown=node:root packages/test-utils/ ./packages/test-utils/
COPY --chown=node:root patches/ ./patches/


# Dev stage
FROM base AS dev

USER node
RUN pnpm install
RUN pnpm --filter shared run build
ENTRYPOINT [ "pnpm", "--filter", "server", "run", "dev" ]


# Build stage
FROM base AS build

RUN pnpm install
RUN pnpm --filter shared run build
RUN pnpm --filter server run build
RUN pnpm --filter server run db:generate
RUN pnpm --filter server --prod deploy build

# Prod stage
FROM docker.io/node:18.16.0-bullseye-slim AS prod

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
RUN mkdir -p /home/node/logs && chmod 770 -R /home/node/logs \
  && mkdir -p /home/node/.npm && chmod 770 -R /home/node/.npm
WORKDIR /app
RUN chown node:root /app
COPY --chown=node:root --from=build /app/build .
USER node
ENTRYPOINT ["npm", "start"]
