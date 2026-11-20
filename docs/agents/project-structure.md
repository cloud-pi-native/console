# Project structure

Read when locating code or understanding workspace boundaries.

- `apps/client`: Vue 3 + Vite + vue-dsfr (French government design system), Pinia, UnoCSS.
- `apps/backend`: NestJS backend with Prisma (PostgreSQL) and shared @ts-rest API contracts; the only backend target.
- `apps/backend/src/modules/integrations/`: internal integrations with external services.
- The legacy server, nginx strangler and standalone plugins are removed. Use Git history for legacy comparisons.
- `packages/shared`: API contracts (@ts-rest), types, permissions (BigInt bitmasks).
- `packages/test-utils`, `packages/eslintconfig`, `packages/tsconfig`: shared test and tooling configuration.
- `playwright/`: dedicated E2E workspace.
- `docker/`: Compose files for local, dev, integration, production and CI.
- `ci/scripts/`: `init-env.sh`, `setup.sh`, `cleanup.sh`, `run-tests.sh`.
- `keycloak/`: DSFR theme and development realm data.
