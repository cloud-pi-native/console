---
name: cpn-code-authoring
description:
  "Use when writing or reviewing domain code in cloud-pi-native/console:
  naming consensus, client-service verb vocabulary, layer discipline,
  fixture shape, and migration parity rules for apps/server-nestjs and
  nginx routing."
version: 1.2.0
license: Apache-2.0
---

# Console code authoring

Conventions ratified across the strangler-fig PR fleet.
Every rule below was decided in review, with a production reason; when code
and this skill disagree, fix the code or cite the exception here.

## Boundaries

This skill covers writing and reviewing domain code only. Commits: `cpn-commit`.
PRs and bodies: `cpn-pr`. Review findings and thread reconciliation: `cpn-review`.
Repo structure and environment chains stay in `AGENTS.md`.

## Code structure

`apps/server-nestjs/src/` layout:

- `main.ts`, `main.module.ts` — bootstrap and root module.
- `config/` — one `*.config.ts` per external system (argocd, gitlab, harbor,
  keycloak, nexus, sonarqube, service-chain, base), each a
  `registerAs` factory injected as `@Inject(xxxConfigFactory.KEY)`;
  colocated `*.config.spec.ts`.
- `modules/<domain>/` — one directory per domain, self-contained. The
  domain file set: `<domain>.module.ts`, `<domain>.controller.ts` +
  `.spec.ts`, `<domain>.service.ts` + `.spec.ts`,
  `<domain>-queries.utils.ts` (Prisma selects + where-builders; record
  types flow from its selects), `<domain>.utils.ts` (`to<Thing>` mappers,
  guards), `<domain>.constants.ts` (incl. `PLUGIN_NAME`), and
  `<domain>-testing.utils.ts` (`makeXxx` factories). Not every domain has
  every file — add the file when the concern first appears, never before.
- `modules/infrastructure/` — cross-domain concerns, same file pattern
  per concern: `auth/` (JWT, DSO token, decorators), `database/` (Prisma),
  `events/` (event bus + `@OnEvent` bridges), `logger/`, `permission/`
  (BigInt bitmasks), `pipe/` (ZodValidationPipe), `telemetry/`.
- `utils/`, `prisma/`, `__mocks__/` — repo-wide helpers, generated client,
  test doubles.

A new domain is a new `modules/<domain>/` directory following that file
set; it never reaches into another domain's internals — cross-domain calls
go through the target's controller-exported service.

## Layer discipline

- Services return raw Prisma records; the record types come from the selects
  in `<module>-queries.utils.ts`. No intermediate DTOs in services. Services
  are orchestration only (parse, delegate to query functions, fold results,
  map errors); DB access lives in the queries utils, wrapped in
  `$transaction` when several queries must be atomic.
- Controllers map records to contract shapes via `to<Thing>` mappers in
  `<module>.utils.ts`. Controllers contain no business logic.
- Where-builders are named `generate<Domain><PrismaType>`
  (`generateZoneWhere`, `generateUserWhere`).
- `*-queries.utils.ts` exports plain functions, never a class or DI: first
  parameter `tx: Prisma.TransactionClient` (a `PrismaService` satisfies it);
  verbs `list*` for `findMany`, `upsert*`/`get*` otherwise; private
  where-builders named `<model>Where`. Services pass their injected Prisma
  or a `$transaction` client. Select-based record types are named
  `<Domain>Record` (`UserRecord`, `StageRecord`) and live in the same file,
  derived from the selects (`Prisma.XGetPayload<{ select: ... }>`).
- Defaults belong in zod `.default()` at the contract, never as optional
  service arguments.
- Configuration arrives by injection (`@Inject(xxxConfigFactory.KEY)` +
  `ConfigType<...>`), never `process.env`.

## Client-service vocabulary

External-system client services (`gitlab-`, `keycloak-`, `nexus-`,
`registry-`, `sonarqube-`, `vault-`) expose three verbs, decided in #2832:

- `get*` — read. No side effects, no convergence.
- `create*` — non-idempotent write. Fails on collision; the raw API call.
- `ensure*` — desired state in, converged state out. Must route through the
  module's `ensure({ create, reload, onCollision })` util in
  `<module>.utils.ts` (module-specific, never shared); a collision reloads
  and returns the existing entity. Never deletes.
- `reconcile*` — level-triggered drift correction over a collection, called
  for effect (no consumed return value); may create, update and delete.
  Reserve for scheduled sweeps (vault cron `reconcileZones`/`reconcileProjects`).

External-API verbs are mirrored verbatim (`Upsert*Request` types, vault
`read`/`write`, nexus `update*`): the client is the API's shadow, not its
translator. DB layer keeps Prisma vocabulary (`prisma.upsert`,
`upsert*` in queries-utils).

An `ensure*` that must reuse a scarce side effect (secret, token) checks
first instead of creating and catching the collision — util's create-first
would rotate it every sync (`ensureAuthApproleRoleSecretId`).

## Naming consensus

- `make<Domain>` for plain factories; `make<Domain>Record` only where the
  module exports a `<Domain>Record` type. Enriched shapes take a
  `With<Property>` suffix (`AdminTokenRecordWithHash`, `makeZoneWithDetails`).
- Factory overrides are `Partial<Thing>`; an `Omit`-intersection on top of
  `Partial` is redundant. Nested-object builders (`makeAdminTokenOwner`) are
  extracted only when no existing factory produces the exact select shape —
  otherwise reuse the shared make (`makeUser()`).
- No aliased imports (`createStage as createStageQuery`); class methods do
  not shadow module-scope imports, so the alias is never needed.
- Factories need explicit return annotations: spreading overrides widens
  the inferred type silently.

## Fixtures and tests

- `makeXxx` factories live only in test lifecycle (`*-testing.utils.ts`),
  never imported by prod code.
- Fixtures must match the exact selected-payload shape: `adminTokenSelect`
  excludes `hash`, hence `makeListedToken` and
  `ListedAdminToken = Omit<AdminTokenRecord, 'hash'>`.
- A faker draw must never be able to cross a branch threshold (pin the draw
  window), otherwise CI flakes.
- Doubles are `mockDeep` (type safety over `vi.fn()` or hand-rolled mocks);
  no describe-scope calls.
- Failed-plugin-event errors are thrown by the calling service
  (UnprocessableEntity/InternalServerError), not by AppEventsService; mock
  `appEvents.emitClusterEvent.mockResolvedValue({ keycloak: { status: 'KO',
  message: 'ko' } })`.

## Migration parity (strangler-fig)

- `apps/server` is frozen: read-only reference, never edited.
- Every `eventEmitter.emitAsync('<entity>.<verb>')` needs a matching
  `@OnEvent` consumer bridging to `capturePluginResult`; the Fastify->Nest
  break is silent — group syncs stop at cutover without it.
- `@ts-rest` contracts in `packages/shared` must stay in sync: changing one
  side without the other compiles fine and breaks at runtime.
- nginx `routing.conf` order matters: specific locations (e.g.
  `/api/v1/stages`) above the `/api/` catch-all; upstreams `server-legacy` /
  `server-nestjs`.
- BigInt permission bitmasks (`ProjectAuthorized`/`AdminAuthorized`) are
  never downcast to number.
- `crypto.ts` unsalted sha256 token hash is intentional (cross-server
  compatibility): do not "fix" it, including for CodeQL.

## Realigning an open branch

Survey before renaming: grep the exported names across all open branches,
aggregate, adopt the majority pattern, rename outliers. Scope is what the
PR introduced (diff vs main), not what it inherited from main. Verify with
the module's targeted specs
(`cd apps/server-nestjs && pnpm vitest run src/modules/<module>`);
Playwright E2E needs Docker and is judged in CI, not locally.

## Known exceptions

- `auth-testing.utils.ts` `makeAdminToken` keeps custom overrides: its owner
  shape `{ id, adminRoleIds, type }` is not `AdminTokenRecord['owner']`.
- `ZodValidationPipe` collapses to a bare string message when all issues
  share one, matching legacy `parseZodError` 400 bodies.
