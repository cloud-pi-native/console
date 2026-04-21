# Base / dev stage ----------------------------------------------------------------
FROM docker.io/node:24.13.1-bullseye-slim AS dev

WORKDIR /app

COPY --chown=node:root package.json ./

# Activer pnpm via corepack (version définie dans package.json "packageManager")
RUN npm install --global corepack@latest && corepack enable && corepack enable pnpm

# Copier les manifestes workspace (nécessaires pour que pnpm résolve les dépendances)
COPY --chown=node:root pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:root patches ./patches

# Manifestes des packages workspace dont server-nestjs dépend
COPY --chown=node:root apps/server-nestjs/package.json           ./apps/server-nestjs/package.json

COPY --chown=node:root packages/eslintconfig/package.json        ./packages/eslintconfig/package.json
COPY --chown=node:root packages/shared/package.json              ./packages/shared/package.json
COPY --chown=node:root packages/logger/package.json              ./packages/logger/package.json
COPY --chown=node:root packages/hooks/package.json               ./packages/hooks/package.json
COPY --chown=node:root packages/test-utils/package.json          ./packages/test-utils/package.json
COPY --chown=node:root packages/tsconfig/package.json            ./packages/tsconfig/package.json

COPY --chown=node:root plugins/argocd/package.json               ./plugins/argocd/package.json
COPY --chown=node:root plugins/gitlab/package.json               ./plugins/gitlab/package.json
COPY --chown=node:root plugins/harbor/package.json               ./plugins/harbor/package.json
COPY --chown=node:root plugins/keycloak/package.json             ./plugins/keycloak/package.json
COPY --chown=node:root plugins/nexus/package.json                ./plugins/nexus/package.json
COPY --chown=node:root plugins/sonarqube/package.json            ./plugins/sonarqube/package.json
COPY --chown=node:root plugins/vault/package.json                ./plugins/vault/package.json

# Installer toutes les dépendances afin de permettre le build des libs partagées
RUN pnpm install --frozen-lockfile

# Copier les sources des packages workspace
COPY --chown=node:root plugins/  ./plugins/
COPY --chown=node:root packages/ ./packages/
COPY --chown=node:root apps/server-nestjs/ ./apps/server-nestjs/

# Build des libs partagées (génère dist/ et types/)
RUN pnpm --filter @cpn-console/logger run build
RUN pnpm --filter @cpn-console/shared run build

# Build hooks (génère dist/ et types/ nécessaires aux imports)
RUN pnpm --filter @cpn-console/hooks run build

# Réinjecter les libs buildées dans node_modules (injectWorkspacePackages copie au moment de l'install)
RUN pnpm --filter @cpn-console/server-nestjs install --frozen-lockfile

# Générer le client Prisma (schéma multi-fichiers : pointer sur le dossier)
RUN pnpm --filter @cpn-console/server-nestjs exec prisma generate \
      --schema=src/prisma/schema

ENTRYPOINT ["pnpm", "--filter", "server-nestjs", "run"]
CMD ["start:dev"]

# Build stage ----------------------------------------------------------------------
FROM dev AS build

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
FROM docker.io/node:24.13.1-bullseye-slim AS prod

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

VOLUME ["/plugins"]
WORKDIR /app

RUN mkdir -p /home/node/logs && chmod 770 -R /home/node/logs \
  && mkdir -p /home/node/.npm  && chmod 770 -R /home/node/.npm \
  && chown node:root /app

# Copier l'artefact de build et les node_modules de production
COPY --chown=node:root --from=build /app/build .
COPY --chown=node:root --from=build /app/apps/server-nestjs/dist ./dist
# COPY --chown=node:root --from=build /app/build/node_modules ./node_modules

# Regénérer le client Prisma dans l'image de production
RUN npm run db:generate

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/system/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["node", "dist/src/main"]
