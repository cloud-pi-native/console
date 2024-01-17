# Base stage
FROM docker.io/node:20.10.0-bullseye-slim AS dev

WORKDIR /app
RUN npm install --location=global pnpm@8.6.10
COPY --chown=node:root package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=node:root patches ./patches
COPY --chown=node:root apps/server/package.json ./apps/server/package.json
COPY --chown=node:root packages/eslintconfig/package.json ./packages/eslintconfig/package.json
COPY --chown=node:root packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:root packages/test-utils/package.json ./packages/test-utils/package.json
COPY --chown=node:root packages/tsconfig/package.json ./packages/tsconfig/package.json
RUN pnpm install
COPY --chown=node:root packages/ ./packages/
RUN pnpm --filter shared run build
COPY --chown=node:root apps/server/ ./apps/server/
ENTRYPOINT [ "pnpm", "--filter", "server", "run", "dev" ]


# Build stage
FROM dev AS build

RUN pnpm --filter server run build
RUN pnpm --filter server --prod deploy build


# Prod stage
FROM docker.io/node:20.10.0-bullseye-slim AS prod

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
WORKDIR /app
RUN mkdir -p /home/node/logs && chmod 770 -R /home/node/logs \
  && mkdir -p /home/node/.npm && chmod 770 -R /home/node/.npm
RUN chown node:root /app
COPY --chown=node:root --from=build /app/build .
RUN npm run db:generate
USER node
EXPOSE 8080
ENTRYPOINT ["npm", "start"]
