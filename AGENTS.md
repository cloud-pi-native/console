# Console Cloud Pi Native

pnpm monorepo. Node >= 24, pnpm v10.33

## Structure

- `apps/client` : Vue 3 + Vite + vue-dsfr (French gov design system), Pinia, UnoCSS
- `apps/server` : Fastify 4 + Prisma 6 (PostgreSQL), contract-first API via @ts-rest
- `apps/server-nestjs` : NestJS rewrite (in progress)
- `plugins/*` : argocd, gitlab, harbor, keycloak, kubernetes, nexus, sonarqube, vault
- `packages/shared` : API contracts (@ts-rest), types, permissions (BigInt bitmasks)
- `packages/hooks` : plugin hook system (core of plugin architecture)
- `packages/test-utils`, `packages/eslintconfig`, `packages/tsconfig`
- `playwright/` : E2E tests (dedicated workspace)
- `docker/` : docker-compose files (local, dev, integ, prod, ci)
- `ci/scripts/` : init-env.sh, setup.sh, cleanup.sh, run-tests.sh
- `keycloak/` : DSFR theme and dev realm data

## Server architecture (Fastify)

Resource-based organization in `apps/server/src/resources/`. Each resource follows a 3-file pattern:
- `router.ts` : route handlers (auth, permissions, delegates to business)
- `business.ts` : business logic, orchestrates queries + hook calls
- `queries.ts` : Prisma database queries

API contracts defined in `@cpn-console/shared`, shared with client via @ts-rest.
Auth: Keycloak + Fastify session. Permissions: BigInt bitmasks (`ProjectAuthorized`, `AdminAuthorized`).

## Plugin / Hook system

Hook lifecycle: `pre` -> `main` -> `post` (sequential steps, parallel plugin execution). On failure: `revert`.
Plugins are statically imported in `apps/server/src/plugins.ts`, then external plugins dynamically loaded from `/plugins`.
Each plugin: `index.ts` (Plugin interface), `infos.ts` (metadata/config), `functions.ts` (hook handlers).
Plugins use TS module augmentation to extend `ProjectStore` and `Config` interfaces.

## Database (Prisma)

Multi-file schema in `apps/server/src/prisma/schema/*.prisma` (project, user, token, admin, topography).
Singleton PrismaClient in `apps/server/src/prisma.ts`. Queries centralized per resource, re-exported via `queries-index.ts`.
Migrations: standard Prisma Migrate. Major version data migrations in `migrations/v9/`.

## Environment config

- Files: `.env`, `.env.docker`, `.env.integ` in `apps/client/`, `apps/server/`, `apps/server-nestjs/`
- Templates: `*-example` suffix (git-tracked), active files gitignored
- Override chain (weakest to strongest): `.env` < `.env.docker` (if DOCKER=true) < `.env.integ` (if INTEGRATION=true) < explicit env vars
- Server loading: `apps/server/src/utils/env.ts` | Client: `apps/client/vite.config.ts`

## Testing

- **Vitest**: unit tests everywhere (server, client, packages, plugins) — colocated `*.spec.ts` files
- **Playwright**: E2E in `playwright/` (Chromium + Firefox, parallel)
- Commands: `pnpm test` (all unit), `pnpm playwright:test`

## Code quality

- ESLint 9 flat config based on `@antfu/eslint-config` (no Prettier, except server-nestjs)
- Stylelint for CSS/Vue in client
- Husky hooks: pre-commit (lint-staged), commit-msg (commitlint), pre-push (unit tests)
- Conventional commits enforced: `feat`, `fix`, `chore`, `docs`, `refactor`, `revert`, `build`

## TypeScript

- Shared base: `packages/tsconfig/tsconfig.base.json` — ESNext, NodeNext, strict, `@/* -> src/*` alias
- Server: extends shared base, uses `ts-patch`/`tspc` for path transform in emitted JS
- Client: does NOT extend shared base, uses `Bundler` module resolution
- server-nestjs: standalone config with `emitDecoratorMetadata` + `experimentalDecorators`

## Main commands

- `pnpm dev` : local Docker infra (keycloak, postgres, pgadmin) + server/client
- `pnpm docker:dev` : fully containerized with Docker Compose Watch
- `pnpm docker:integ` / `pnpm integ` : integration mode (remote env)
- `pnpm fullsetup` : full install (deps, prisma generate, build, Docker images)
- `pnpm fullclean` : full cleanup (builds, node_modules, Docker images)

## Git & Release

- Branches: `main` (protected) + `hotfix/*`
- Release Please for automated versioning, changelogs, npm publish, Docker images, Helm chart updates
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`

## Conventions

- Template env files use `-example` suffix (not `.example`)
- `ci/scripts/init-env.sh` copies `*-example` to active equivalents (non-destructive)
