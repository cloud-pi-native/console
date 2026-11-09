# Project structure

Read when locating code or understanding workspace boundaries.

- `apps/client`: Vue 3 + Vite + vue-dsfr (French government design system), Pinia, UnoCSS.
- `apps/server`: Fastify 4 + Prisma 6 (PostgreSQL), contract-first API via @ts-rest; frozen, read-only reference.
- `apps/server-nestjs`: NestJS rewrite in progress; the only modifiable backend target.
- `plugins/*`: argocd, gitlab, harbor, keycloak, kubernetes, nexus, sonarqube, vault.
- `packages/shared`: API contracts (@ts-rest), types, permissions (BigInt bitmasks).
- `packages/hooks`: plugin hook system.
- `packages/test-utils`, `packages/eslintconfig`, `packages/tsconfig`: shared test and tooling configuration.
- `playwright/`: dedicated E2E workspace.
- `docker/`: Compose files for local, dev, integration, production and CI.
- `ci/scripts/`: `init-env.sh`, `setup.sh`, `cleanup.sh`, `run-tests.sh`.
- `keycloak/`: DSFR theme and development realm data.
