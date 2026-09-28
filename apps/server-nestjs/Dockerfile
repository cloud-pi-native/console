# Base / dev stage ----------------------------------------------------------------
FROM docker.io/node:26.7.0-bullseye-slim AS dev

RUN mkdir /app && chown -R node:node /app

USER node

WORKDIR /app

# Copier les manifestes workspace (nécessaires pour que pnpm résolve les dépendances)
# NOTE: les `--chown=node:node` sont NÉCESSAIRES pour éviter que tout soit copié en root
# (UID 0 et GID 0)
COPY --chown=node:node package.json ./
COPY --chown=node:node pnpm-workspace.yaml pnpm-lock.yaml ./

# Manifestes des packages workspace dont server-nestjs dépend
COPY --chown=node:node apps/server-nestjs/package.json    ./apps/server-nestjs/package.json

COPY --chown=node:node packages/eslintconfig/package.json ./packages/eslintconfig/package.json
COPY --chown=node:node packages/shared/package.json       ./packages/shared/package.json
COPY --chown=node:node packages/logger/package.json       ./packages/logger/package.json
COPY --chown=node:node packages/hooks/package.json        ./packages/hooks/package.json
COPY --chown=node:node packages/test-utils/package.json   ./packages/test-utils/package.json
COPY --chown=node:node packages/tsconfig/package.json     ./packages/tsconfig/package.json

COPY --chown=node:node plugins/argocd/package.json        ./plugins/argocd/package.json
COPY --chown=node:node plugins/gitlab/package.json        ./plugins/gitlab/package.json
COPY --chown=node:node plugins/harbor/package.json        ./plugins/harbor/package.json
COPY --chown=node:node plugins/keycloak/package.json      ./plugins/keycloak/package.json
COPY --chown=node:node plugins/nexus/package.json         ./plugins/nexus/package.json
COPY --chown=node:node plugins/sonarqube/package.json     ./plugins/sonarqube/package.json
COPY --chown=node:node plugins/vault/package.json         ./plugins/vault/package.json

# Il ne faut plus installer PNPM depuis Corepack !
# (cf: https://github.com/pnpm/pnpm/issues/11732#issuecomment-5267508169)
ENV SHELL="bash"
RUN npx get-pnpm
ENV PATH="/home/node/.local/share/pnpm/bin:$PATH"

# Installer toutes les dépendances afin de permettre le build des libs partagées
RUN pnpm install --frozen-lockfile

# Copier les sources des packages workspace
COPY --chown=node:node plugins/  ./plugins/
COPY --chown=node:node packages/ ./packages/
COPY --chown=node:node apps/server-nestjs/ ./apps/server-nestjs/

RUN pnpm --filter @cpn-console/logger run build
RUN pnpm --filter @cpn-console/shared run build
RUN pnpm --filter @cpn-console/hooks run build

# Réinjecter les libs buildées dans node_modules (injectWorkspacePackages copie au moment de l'install)
RUN pnpm --filter @cpn-console/server-nestjs install --frozen-lockfile

# Générer le client Prisma (schéma multi-fichiers : il faut pointer sur le dossier)
RUN pnpm --filter @cpn-console/server-nestjs exec prisma generate --schema=src/prisma/schema

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["pnpm", "--filter", "server-nestjs", "run"]
CMD ["start:dev"]

# Build stage ----------------------------------------------------------------------
FROM dev AS build

USER node

# Build shared (génère dist/ et types/)
RUN pnpm --filter @cpn-console/logger run build
RUN pnpm --filter @cpn-console/shared run build

# Build hooks (génère dist/ et types/ nécessaires aux imports)
RUN pnpm --filter @cpn-console/hooks run build

# Réinjecter shared buildé dans node_modules (injectWorkspacePackages copie au moment de l'install)
RUN pnpm --filter @cpn-console/server-nestjs install --frozen-lockfile

# Build server-nestjs
RUN pnpm --filter @cpn-console/server-nestjs run build

# Export @cpn-console/server-nestjs to target build directory
RUN pnpm --filter @cpn-console/server-nestjs --prod deploy build

# Prod stage -----------------------------------------------------------------------
FROM docker.io/node:26.7.0-bullseye-slim AS prod

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

VOLUME ["/plugins"]
WORKDIR /app

RUN mkdir -p /home/node/logs && chmod 770 -R /home/node/logs \
  && mkdir -p /home/node/.npm  && chmod 770 -R /home/node/.npm \
  && chown node:root /app

# Copier l'artefact de build et les node_modules de production
COPY --from=build --chown=node:node /app/build .
COPY --from=build --chown=node:node /app/apps/server-nestjs/dist ./dist

# Regénérer le client Prisma dans l'image de production
RUN npm run db:generate

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["node", "dist/src/main"]
