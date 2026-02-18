# Base stage -----------------------------------------------------------------------
FROM docker.io/node:24.13.1-bullseye-slim AS dev

WORKDIR /app

COPY --chown=node:root package.json ./

# Install pnpm version defined in package.json "packageManager" property
RUN npm install --global corepack@latest && corepack enable && corepack enable pnpm

COPY --chown=node:root pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:root patches ./patches
COPY --chown=node:root apps/server/package.json ./apps/server/package.json

COPY --chown=node:root packages/eslintconfig/package.json ./packages/eslintconfig/package.json
COPY --chown=node:root packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:root packages/hooks/package.json ./packages/hooks/package.json
COPY --chown=node:root packages/test-utils/package.json ./packages/test-utils/package.json
COPY --chown=node:root packages/tsconfig/package.json ./packages/tsconfig/package.json

COPY --chown=node:root plugins/argocd/package.json ./plugins/argocd/package.json
COPY --chown=node:root plugins/gitlab/package.json ./plugins/gitlab/package.json
COPY --chown=node:root plugins/harbor/package.json ./plugins/harbor/package.json
COPY --chown=node:root plugins/keycloak/package.json ./plugins/keycloak/package.json
COPY --chown=node:root plugins/nexus/package.json ./plugins/nexus/package.json
COPY --chown=node:root plugins/sonarqube/package.json ./plugins/sonarqube/package.json
COPY --chown=node:root plugins/vault/package.json ./plugins/vault/package.json

RUN pnpm install --frozen-lockfile
COPY --chown=node:root plugins/ ./plugins/
COPY --chown=node:root packages/ ./packages/

COPY --chown=node:root apps/server/ ./apps/server/
# Generate Prisma client
RUN pnpm --filter server run db:generate
ENTRYPOINT [ "pnpm", "--filter", "server", "run" ]
CMD [ "dev" ]


# Build stage ----------------------------------------------------------------------
FROM dev AS build

# Build @cpn-console/server console-related dependencies
RUN pnpm run build
# Build @cpn-console/server
RUN pnpm --filter @cpn-console/server run build
# Export @cpn-console/server to target build directory
RUN pnpm --filter @cpn-console/server --prod deploy build


# Prod stage -----------------------------------------------------------------------
FROM docker.io/node:24.13.1-bullseye-slim AS prod

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
VOLUME [ "/plugins" ]
WORKDIR /app
RUN mkdir -p /home/node/logs && chmod 770 -R /home/node/logs \
  && mkdir -p /home/node/.npm && chmod 770 -R /home/node/.npm \
  && chown node:root /app
COPY --chown=node:root --from=build /app/build .
RUN npm run db:generate
USER node
EXPOSE 8080
ENTRYPOINT ["npm", "start"]
