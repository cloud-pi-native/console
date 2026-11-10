# Console Cloud Pi Native

pnpm monorepo. Node >= 26, pnpm v11.8

## Structure

- `apps/client` : Vue 3 + Vite + vue-dsfr (French gov design system), Pinia, UnoCSS
- `apps/server-nestjs` : NestJS + Fastify + Prisma 6 (PostgreSQL), contract-first API via @ts-rest — the only modifiable backend target
- Legacy `apps/server` and `apps/nginx-strangler` were removed; use Git history for migration comparisons.
- External-system integrations live in `apps/server-nestjs/src/modules/integrations/`; legacy `plugins/` is available in Git history.
- `packages/shared` : API contracts (@ts-rest), types, permissions (BigInt bitmasks)
- `packages/hooks` : plugin hook system (core of plugin architecture)
- `packages/test-utils`, `packages/eslintconfig`, `packages/tsconfig`
- `playwright/` : E2E tests (dedicated workspace)
- `docker/` : docker-compose files (local, dev, integ, prod, ci)
- `ci/scripts/` : init-env.sh, setup.sh, cleanup.sh, run-tests.sh
- `keycloak/` : DSFR theme and dev realm data

## Backend architecture (NestJS)

Domain modules live in `apps/server-nestjs/src/modules/core/`, integrations in
`modules/integrations/`, and cross-cutting services in `modules/infrastructure/`.
Controllers handle HTTP contracts and mapping, services orchestrate business logic,
and `*-queries.utils.ts` functions perform Prisma queries.

API contracts are defined in `@cpn-console/shared`, shared with the client via @ts-rest.
Auth: Keycloak and access tokens. Permissions: BigInt bitmasks (`ProjectAuthorized`, `AdminAuthorized`).

server-nestjs services receive configuration via injection
(`@Inject(xxxConfigFactory.KEY)` + `ConfigType<typeof xxxConfigFactory>`),
never `process.env`.

## Integration events and shared hooks

NestJS integration modules consume domain events and bridge plugin results through `capturePluginResult`.
External plugin loading was retired after Observability was internalized; see #3005.
`packages/hooks` still provides shared types and utilities; its legacy hook engine is not the NestJS startup model.
Decoupling its consumers and removing the package is a separate delivery tracked in #3006.

server-nestjs parity: every `eventEmitter.emitAsync('<entity>.<verb>')` must
have a matching `@OnEvent` consumer bridging to `capturePluginResult`, or
Keycloak/GitLab group syncs silently stop at cutover.

## Database (Prisma)

Multi-file schema in `apps/server-nestjs/src/prisma/schema/*.prisma` (project, user, token, admin, topography).
Migrations: standard Prisma Migrate. Major version data migrations in `migrations/v9/`.

`deleteMany`/`updateMany` with an `undefined` filter value matches ALL rows —
always filter by concrete id. `ProjectRole`/`Repository` foreign keys do not cascade.

## Environment config

- Files: `.env`, `.env.docker`, `.env.integ` in `apps/client/` and `apps/server-nestjs/`
- Templates: `*-example` suffix (not `.example`; git-tracked), active files gitignored
- Override chain (weakest to strongest): `.env` < `.env.docker` (if DOCKER=true) < `.env.integ` (if INTEGRATION=true) < explicit env vars
- Backend loading: `apps/server-nestjs/src/utils/dotenv.utils.ts` and `src/main.module.ts` | Client: `apps/client/vite.config.ts`
- `ci/scripts/init-env.sh` copies `*-example` to active equivalents (non-destructive)

## Testing

- **Vitest**: unit tests in backend, client and packages — colocated `*.spec.ts` files
- **Playwright**: the E2E suite in `playwright/` (Chromium + Firefox,
  parallel) requires the CI stack and its fixtures.
- Commands: `pnpm test` (all unit), `pnpm docker:e2e-ci` (the only Docker
  E2E runner; starts the CI stack and runs the full Playwright suite).
- If required `.env` files are missing, run `bash ci/scripts/init-env.sh`.
  Stop an active dev stack with `pnpm docker:dev:clean` before E2E;
  `docker:dev` does not provide E2E fixtures. Clean up with
  `pnpm docker:e2e-ci:delete` after the suite, including a failed run.
- For one-spec manual debugging only, start the CI stack with `pnpm docker:ci`,
  run `pnpm --dir playwright exec playwright test e2e-tests/dashboard.spec.ts -g 'Should display a project statuses'`, then stop it with `pnpm docker:ci:clean`.

## Code quality

- Comments: `//` only, never `/** */` blocks; two lines max, why not what.
- ESLint 9 flat config based on `@antfu/eslint-config` (no Prettier, except server-nestjs)
- Stylelint for CSS/Vue in client
- Husky hooks: pre-commit (lint-staged), commit-msg (commitlint), pre-push (unit tests)
- Conventional commits enforced: `feat`, `fix`, `chore`, `docs`, `refactor`, `revert`, `build`
- Fix at the shared source all callers route through, not a guard duplicated in
  every caller.
- Before reporting done, format: `pnpm format`, then run the gates — `pnpm lint`
  plus the targeted vitest specs.

## TypeScript

- Shared base: `packages/tsconfig/tsconfig.base.json` — ESNext, NodeNext, strict, `@/* -> src/*` alias
- Client: does NOT extend shared base, uses `Bundler` module resolution
- server-nestjs: standalone config with `emitDecoratorMetadata` + `experimentalDecorators`
- Strict type safety: no `as` casts (including `as any`), no `any`, and no
  unchecked escapes of `unknown` — anything that breaks the type-checking
  chain. Narrow with `if` type guards (include the offending identifier in the
  error message). Parse, don't validate: at the input boundary, turn external
  data into the most precise type it allows — the returned type is the proof —
  so nothing downstream re-checks; a check-and-throw that returns nothing
  preserves nothing.

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
