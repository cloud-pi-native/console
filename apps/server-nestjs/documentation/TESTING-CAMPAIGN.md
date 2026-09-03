# Console usage → server-nestjs testing campaign

## Scope of work (per user)

1. **Catalogue every usage** of the console driven by the legacy `apps/server` (Fastify) + `apps/client` (Vue). This is the source-of-truth surface.
2. **Diff each usage against `apps/server-nestjs`** to find bugs / incoherences.
3. **Automated testing campaign**, layered: unit (vitest) → e2e (`apps/server-nestjs/test/*.e2e-spec.ts`, E2E-gated) → Playwright (`console/playwright/`).
4. **File an issue per bug found**, then iterate (re-run, re-test, re-issue) until the campaign converges.

## Constraints locked in

- `apps/server` (legacy) is **frozen** — never modify.
- The 3 in-progress files (gitlab-client retry, system-settings controller PUT→POST) are **uncommitted WIP** — must not be clobbered.
- Integration hosts `*.dso.cpin-hp.numerique-interieur.fr` are **DNS-unreachable** from this dev host. E2E/Playwright against integration run only on a connected host/CI. Unit tests run here (Node 24).
- Baseline (2026-08-25): **578 passed / 59 skipped** unit suite, green.

## Inventory seed (legacy apps/server resources)

Resources with `business.ts` (the hook call site = plugin-sync surface):

- project, project-member, project-role, repository, deployment, environment, zone, admin-role, cluster, project-service, service-chain, service-monitor, stage, admin-token, system, user, log.

### Legacy hook inventory (the contract surface, by entity.verb count)

```
43 hook.project.upsert         ← nestjs: emitted @ project.service, consumed by 8 plugins ✅ parity
 8 hook.adminRole.upsert      ← nestjs: NO module (u5) cutover-blocker
 5 hook.zone.upsert           ← nestjs: zone.* LISTENER exists (vault) but NO EMITTER (u4/u8) GAP
 5 hook.project.delete        ← nestjs: emitted @ project.service, consumed ✅ parity
 4 hook.project.getSecrets    ← nestjs: handled in vault/project-secrets (check)
 4 hook.cluster.upsert        ← nestjs: NO module (u6) cutover-blocker
 3 hook.projectRole.upsert     ← nestjs: folds to project.upsert (project-roles.service:128) OK
 3 hook.cluster.delete        ← nestjs: NO module cutover-blocker
 2 hook.zone.delete           ← nestjs: vault LISTENS `@OnEvent('zone.delete')` but no emitter GAP
 2 hook.projectMember.upsert  ← nestjs: emitted @ project-members.service, NO consumer (redundant) gap
 2 hook.adminRole.delete      ← nestjs: NO module cutover-blocker
 1 hook.projectRole.delete    ← nestjs: folds to project.upsert OK
 1 hook.projectMember.delete  ← nestjs: emitted, NO consumer gap
 1 hook.misc.syncRepository   ← nestjs: `repository.sync` emitted + consumed ✅ parity
```

### E2E coverage gap matrix (nestjs `test/` vs legacy resources)

e2e specs present: argocd, gitlab, keycloak, log, nexus, project, project-bulk,
project-hooks, project-members, project-roles, project-secrets, repository,
sonarqube, vault, zone.

Missing relative to legacy resources: **deployment, environment, cluster,
admin-role, service-chain, service-monitor, project-service, stage.**

### Confirmed gap to seed the campaign

**vault** has a unit spec (`vault.service.spec.ts`) but **NO e2e spec**. The
`@OnEvent('zone.upsert')` / `@OnEvent('zone.delete')` consumers in
`vault.service` have no corresponding emitter in server-nestjs — the zone route
lives only on legacy `apps/server`. This is the highest-impact runnable-here
test to add: a unit assertion that proves the zone-event contract is live-listening
but never emitted from the new stack (so a future zone-module migration must wire
the emit before cutover).

Plus controller-level resources: auth, user, system-setting.

## Plan shape (decomposable)

Per legacy resource → one campaign unit:

- **Unit parity**: `apps/server/<resource>/business.ts` hook call(s) ↔ `apps/server-nestjs` event emit + `@OnEvent` consumer. Gap = bug.
- **Unit coverage**: every `console → external service` client method (gitlab/keycloak/vault/argocd/nexus/sonarqube/registry/harbor) has a spec exercising its own retry/rollback/error path.
- **E2E parity**: each `apps/server-nestjs/test/<module>.e2e-spec.ts` covers the same real-world outcome as a legacy route would.
- **Playwright**: each user-visible journey (create project, add member, sync mirror…) has a deterministic spec; cross-service fragility goes to the socle cahier instead (`../documentation-interne-socle/Tests Fonctionnels/`).

## Decomposition

| Unit | Legacy source | NestJS target | Test layer | Status |
|---|---|---|---|---|
| u1 | `project` hooks (upsert/delete) | `project.service` emit + 8 consumers | unit + e2e + playwright | parity wired |
| u2 | `project-member` hooks | `project-members.service` emit (no consumer) | unit | gap: redundant emit |
| u3 | `repository` hooks (`misc.sync`) | `repository.service` emit + gitlab consumer | unit + e2e | parity wired |
| u4 | `zone` hooks (upsert/delete) | DANGLING consumer (`vault.service`), no emit | unit gap | HIGH at cutover |
| u5 | `admin-role` hooks | no nestjs module | — | cutover-blocker |
| u6 | `cluster` hooks | no nestjs module | — | cutover-blocker |
| u7 | gitlab client retry (in-progress) | gitlab-client retry path | unit (exists) | done |
| u8 | vault sync (zone.* listeners, no emitter) | vault.service | unit + e2e missing | unit exists; e2e GAP; zone emit GAP |
| u8 | keycloak upsert/delete | keycloak.service | unit + e2e missing | e2e gap |
| u9 | vault sync | vault.service | unit + e2e missing | e2e gap |
| u10 | argocd sync | argocd.service | unit + e2e missing | e2e gap |
| u11 | nexus/registry/sonarqube | each service | unit + e2e missing | e2e gap |
| u12 | harbor | **no module at all** | — | module missing |

> Units u5/u6/u12 are not bugs-today; they are migration gaps that become bugs at cutover. Tracked as issues, not code, until the route moves.

## Campaign loop (per unit)

1. Read legacy `business.ts` (the hook contract).
2. Read nestjs service emit + consumer.
3. Add unit spec if missing, assert parity (or assert the intentional gap).
4. Add `test/<module>.e2e-spec.ts` (E2E-gated) if missing, mirroring the real-world outcome.
5. If a discrepancy/bug is found → file issue (cpn-issue) with `Refs <unit>`.
6. Re-run `vitest run` (unit) to keep 578 baseline green+expanded.

## Next action

Seed the campaign by writing the first concrete, runnable-here test for the most
impactful gap with a runnable-here unit spec: **vault upsert/delete end-to-end
parity** (unit exists; assert the `zone.*/`projectMember.*` latent gaps). This
locks `full` Ponytail: shortest diff that actually fails when the logic breaks.
