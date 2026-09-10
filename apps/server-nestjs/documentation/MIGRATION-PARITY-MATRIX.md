# Migration parity matrix — `apps/server` (legacy) → `apps/server-nestjs`

Verified audit of plugin-sync behavior between the legacy Fastify backend and the
NestJS target. Purpose: locate incompatibilities that would break at cutover.

## Method

- Legacy trigger surface: `hook.<entity>.<verb>(...)` calls in `apps/server/src/resources/*/business.ts`.
- NestJS trigger surface: `AppEventsService.emit*` → `EventEmitter2.emitAsync('<event>')`.
- NestJS consumer surface: `@OnEvent('<event>')` handlers (each bridges into the plugin system via `capturePluginResult`).
- Severity rule (cpn-dev-workflow): if `apps/server` still owns the route, the gap is latent (breaks at cutover); if `apps/server-nestjs` already owns it, the breakage is LIVE.

## Findings (baseline: 2026-08-25)

Unit suite before any change: **578 passed / 59 skipped** (`pnpm --filter @cpn-console/server-nestjs run test`, Node 24).

### Event / hook parity

| Entity.verb (legacy hook) | Emitted in nestjs | `@OnEvent` consumer | Status | Severity |
| --- | --- | --- | --- | --- |
| `project.upsert` | ✅ `project.service`, `deployment`, `environment`, `project-roles`, `project-hooks`, `repository` | ✅ gitlab, argocd, keycloak, nexus, registry, sonarqube, observability, vault, plugin | wired | — |
| `project.delete` | ✅ `project.service` | ✅ gitlab, argocd, keycloak, nexus, registry, sonarqube, observability, vault | wired | — |
| `repository.sync` | ✅ `repository.service` | ✅ gitlab | wired | — |
| `projectMember.upsert` / `.delete` | ✅ `project-members.service` | ❌ none | emitted, no consumer — member sync is folded into `project.upsert` (gitlab/keycloak re-sync on upsert) | low (redundant, not a regression) |
| `zone.upsert` / `.delete` | ❌ NOT emitted (no zone module in nestjs) | ✅ vault (`vault.service`) | **dangling consumer** — vault zone-sync has no emitter yet | HIGH at cutover (legacy still owns zone route today) |
| `adminRole.upsert` / `.delete` | ❌ not migrated | ❌ | legacy-only (no admin-role module in nestjs) | cutover-blocker when admin-role route moves |
| `cluster.upsert` / `.delete` | ❌ not migrated | ❌ | legacy-only (no cluster module in nestjs) | cutover-blocker when cluster route moves |
| `projectRole.upsert` / `.delete` | folded → emits `project.upsert` (`project-roles.service:128`) | (via project.upsert consumers) | by-design folding | — |
| `misc.sync` (legacy repository) | folded → `repository.sync` | gitlab | by-design folding | — |

### Interpretation

1. **LIVE regressions: none.** All events `apps/server-nestjs` currently emits have matching consumers.
2. **Latent cutover gaps (must close before the corresponding route moves off legacy):**
   - `zone.*` — vault already listens; nestjs must emit it once a zone module exists.
   - `adminRole.*`, `cluster.*` — no nestjs module yet; these are the next migration units, not bugs today.
3. **Redundant emission:** `projectMember.*` events have no consumer. Either add a thin `@OnEvent('projectMember.upsert')` that no-ops intentionally, or stop emitting. Not a bug; note for cleanup.

## In-progress work preserved (do NOT clobber)

Three files are modified-but-uncommitted in this checkout and must survive any
parity work:

- `apps/server-nestjs/src/modules/gitlab/gitlab-client.service.ts` — adds `withTransientRetry` (linear backoff, 3 attempts) around group/project creation (GitLab 500/502/503/504).
- `apps/server-nestjs/src/modules/gitlab/gitlab-client.service.spec.ts` — covers the retry (52 lines added).
- `apps/server-nestjs/src/modules/system-settings/system-settings.controller.ts` — `@Put(':key')` → `@Post()` for upsert.

## Integration reachability (BLOCKER for "test against integration")

The integration hosts (`*.dso.cpin-hp.numerique-interieur.fr`) are **DNS-unreachable
from the dev host** (getent → DNS FAIL; no VPN route into that zone from this
machine). `E2E`-gated e2e specs (`test/*.e2e-spec.ts`, 16 files) therefore cannot
connect here. They are runnable on a host with VPN/network access to the
integration environment, or in CI.

→ Recovery: run e2e specs on a connected host (`E2E=1 pnpm --filter @cpn-console/server-nestjs exec vitest run test/`), or stand up the VPN/tailscale route to `dso.cpin-hp`.
