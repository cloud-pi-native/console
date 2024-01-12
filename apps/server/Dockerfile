# Base stage
FROM docker.io/node:20.11.0-bullseye-slim AS dev

WORKDIR /app
RUN npm install --ignore-scripts --location=global pnpm@8.14.1
RUN mkdir /plugins
VOLUME [ "/plugins" ]

COPY --chown=node:root package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc turbo.json ./
COPY --chown=node:root patches ./patches
COPY --chown=node:root apps/server/package.json ./apps/server/package.json

COPY --chown=node:root packages/eslintconfig/package.json ./packages/eslintconfig/package.json
COPY --chown=node:root packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:root packages/hooks/package.json ./packages/hooks/package.json
COPY --chown=node:root packages/test-utils/package.json ./packages/test-utils/package.json
COPY --chown=node:root packages/tsconfig/package.json ./packages/tsconfig/package.json

COPY --chown=node:root plugins/argo/package.json ./plugins/argo/package.json
COPY --chown=node:root plugins/gitlab/package.json ./plugins/gitlab/package.json
COPY --chown=node:root plugins/harbor/package.json ./plugins/harbor/package.json
COPY --chown=node:root plugins/keycloak/package.json ./plugins/keycloak/package.json
COPY --chown=node:root plugins/kubernetes/package.json ./plugins/kubernetes/package.json
COPY --chown=node:root plugins/nexus/package.json ./plugins/nexus/package.json
COPY --chown=node:root plugins/sonarqube/package.json ./plugins/sonarqube/package.json
COPY --chown=node:root plugins/vault/package.json ./plugins/vault/package.json

RUN pnpm install
COPY --chown=node:root packages/ ./packages/
COPY --chown=node:root plugins/ ./plugins/
RUN pnpm run build

COPY --chown=node:root apps/server/ ./apps/server/
ENTRYPOINT [ "pnpm", "--filter", "server", "run", "dev" ]


# Build stage
FROM dev AS build

RUN pnpm --filter server run build
RUN pnpm --filter server --prod deploy build


# Prod stage
FROM docker.io/node:20.11.0-bullseye-slim AS prod

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
RUN mkdir /plugins
VOLUME [ "/plugins" ]
WORKDIR /app
RUN mkdir -p /home/node/logs && chmod 770 -R /home/node/logs \
  && mkdir -p /home/node/.npm && chmod 770 -R /home/node/.npm
RUN chown node:root /app
COPY --chown=node:root --from=build /app/build .
RUN npm run db:generate
USER node
EXPOSE 8080
ENTRYPOINT ["npm", "start"]
