# Adversarial Review — Cloud π Native Console (client)

Status: **review record** (v1.0, 2026-10-22)
Scope: `apps/client` at commit `19e8c6f`, plus the refactor delivered in this
change set.
Companion documents: `vue-best-practices.md`, `personas.md`, `accessibility.md`.

The purpose of this document is not to celebrate the refactor. It records what
four hostile review passes found, what was actually fixed, how it was verified,
and what remains broken. Findings keep the evidence state they reached:
**observed**, **candidate**, **reproduced**, or **confirmed**.

---

## 1. Method

| Pass | Lens | Reviewer stance | Artefacts |
| --- | --- | --- | --- |
| R1 | Accessibility red team | "I only have a keyboard and a screen reader" | source audit, jsdom component tests, static rules |
| R2 | Failure injection | "The API is slow, returns 403, or returns nothing" | route guards, stores, list views, async actions |
| R3 | Product heuristics | "I am a sponsor on a phone, or an on-call engineer at 3 a.m." | personas P5/P6, navigation, microcopy |
| R4 | Maintenance and performance | "I have to keep this code alive" | bundle output, lint/type gates, coupling |

Each finding was classified P0 (blocks a top task), P1 (major friction or
exclusion), P2 (moderate), P3 (minor). A finding is only marked **fixed** when a
gate or a test demonstrates the new behaviour.

---

## 2. Findings

| ID | Pass | Finding | Severity | Evidence state | Status |
| --- | --- | --- | --- | --- | --- |
| AR-01 | R1 | No skip link, no `<main>` landmark, no focus management on route change | P0 | observed | fixed |
| AR-02 | R1 | 13 views without an `<h1>`; no stable page heading | P0 | observed | fixed |
| AR-03 | R1 | 24 icon-only buttons without accessible names | P1 | observed | fixed |
| AR-04 | R1 | 17 click targets on `div`/`code`/`tr` with no keyboard path | P1 | observed | fixed |
| AR-05 | R1 | Snackbar live region created with its message, so it may never be announced | P1 | candidate (depends on AT) | fixed |
| AR-06 | R1 | Service health conveyed by colour only | P1 | observed | fixed |
| AR-07 | R1 | Theme toggle is a link acting as a button, no pressed state | P2 | observed | fixed |
| AR-08 | R1 | Table header cells are `<td>`, so columns are not announced | P1 | observed | fixed |
| AR-09 | R1 | Four help texts only exist in `title` (hover-only, touch-dead) | P2 | observed | fixed |
| AR-10 | R1 | Loaders announce nothing and do not mark the region busy | P2 | observed | fixed |
| AR-11 | R2 | `DsoProjects` shows "you are not part of any project" before the request resolves | P0 | observed + unit-reproduced | fixed |
| AR-12 | R2 | `ProjectDashboard` writes `project.description` into the Pinia store from a child event | P0 | observed | fixed |
| AR-13 | R2 | Health polling never starts: `if (!interval) return` with `interval` undefined | P1 | confirmed (deterministic) | fixed |
| AR-14 | R2 | Deep link lost after login: the guard rewrites the URL to `/login` before Keycloak | P1 | observed | fixed |
| AR-15 | R2 | Other list views (`ListZones`, `ListStages`, `ListPlugins`, `ListProjects`, `ListServiceChains`) still conflate loading and empty | P2 | observed | deferred |
| AR-16 | R2 | `AdminCluster` / `AdminServiceChain` await detail calls without a catch; a 500 leaves a spinner forever | P2 | observed | deferred |
| AR-17 | R3 | Health page keeps a 3-column grid below `md`, unusable on a phone during an incident | P2 | observed | deferred |
| AR-18 | R3 | Admin tokens table has no "last used" column, the first question of an access review | P2 | observed | deferred |
| AR-19 | R3 | Log filters are not in the URL, so an investigation cannot be shared | P2 | observed | deferred |
| AR-20 | R3 | Microcopy defects: "Vérrouiller", "Dévérouiller", "Status des services", "Vous ne faites parti" | P3 | observed | fixed |
| AR-21 | R4 | Main JS chunk 564 kB minified / 190 kB gzip; Vite warns above 500 kB | P3 | observed | deferred |
| AR-22 | R4 | `pnpm build` fails on macOS: `mktemp --suffix` is GNU-only | P2 | reproduced | fixed |

---

## 3. Detail on the P0/P1 findings

### AR-01 / AR-02 — Landmarks and headings

**Observed.** `App.vue` wrapped the router view in a plain `div`; no skip link
existed. A grep over `src/views` found 13 files with no `h1`.

**Fix.** Skip links to `#content`, `#mainMenu`, `#footer`; `<main
id="content" tabindex="-1">`; one `h1` per view (`PageHeading` with a
`visually-hidden` variant where a DSFR table already displays the title);
`afterEach` focuses `#content` and announces the route title.

**Verification.** Audit rules `page-shell-missing-landmarks` and
`view-without-h1` now report zero. `router/index.spec.ts` asserts every named
route has a title. Keyboard behaviour was not exercised in a real browser —
that remains a manual step (`accessibility.md` §4).

### AR-11 — False empty state

**Observed.** `DsoProjects.vue` rendered the empty message from
`!projectList.length`, before `listMyProjects()` resolved. On a slow network
every user saw "Vous ne faites parti d'aucun projet".

**Fix.** `collectionViewState({ loading, error, count })` returns `loading`,
`error`, `empty`, or `ready`; the empty state renders only for `empty`.

**Verification.** `src/utils/list-state.spec.ts` (4 tests) proves the ordering;
`useAsyncAction` exposes the pending flag. Not replayed against a throttled
network in a browser.

### AR-12 — Store mutation from a child event

**Observed.** In `ProjectDashboard.vue`:

```ts
@update:model-value="(desc) => { project.description = desc }"
```

`project` is a Pinia entity. Cancelling the edit left the mutated value on
screen, and the next `refresh()` silently reverted it.

**Fix.** `ProjectBanner` keeps a local `descriptionDraft` and emits
`saveDescription(value)`; the dashboard persists through
`project.Commands.update({ description })` inside `useAsyncAction` and then
refreshes.

**Verification.** `ProjectBanner.spec.ts` — cancelling leaves the entity
unchanged; saving emits the draft and still leaves the entity unchanged (the
store write is the parent's job).

### AR-13 — Health polling never started

**Observed.**

```ts
let interval: NodeJS.Timeout
const startHealthPolling = async () => {
  if (!interval) return   // undefined on first call → always returns
  ...
}
```

The first call always returned, so the interval was never created. The initial
check worked only because `App.vue` called `checkServicesHealth()` separately.

**Fix.** Removed the inverted guard, named `HEALTH_POLL_INTERVAL_MS = 5 min`,
typed the timer, added `stopHealthPolling()` and unmount cleanup.

**Verification.** `services-monitor.spec.ts` uses fake timers: one immediate
call, a second after the interval, none after `stopHealthPolling()`.

**Note.** 5 minutes is an assumption derived from the API's `interval` field
(300 000 ms). If the platform wants a different cadence, change the constant.

### AR-14 — Deep link lost after login

**Observed.** The guard did `next('/login')` before Keycloak was involved.
`keycloakLogin()` correctly uses `window.location`, but by then the URL was
already `/login`. The original target was gone.

**Fix.** `rememberPostLoginTarget(to.fullPath)` stores the target in
`sessionStorage`; the `Login` branch consumes it and calls
`next(target ?? '/')`, with `/login`, `/logout`, and absolute URLs rejected.

**Verification.** `auth-redirect.spec.ts` (4 tests). The full Keycloak round-trip
was not executed in this environment.

### AR-08 — Table semantics

**Observed.** `ProjectResources`, `ListProjects`, and `ListServiceChains` used
`<td>` inside `<template #header>`.

**Fix.** `<th scope="col">`.

**Verification.** Static inspection; the audit does not yet enforce this rule.
It should be added before claiming it cannot regress.

---

## 4. Corrections made during the review

The review process itself produced two corrections, recorded here because
epistemic hygiene matters more than a clean narrative.

1. **Persona document, §8.** The first draft claimed the deep link was lost
   because `keycloakLogin()` omitted a `redirectUri`. Reading
   `src/utils/keycloak/keycloak.ts` showed that it *does* pass one. The real
   mechanism is the router guard rewriting the URL beforehand. The document was
   corrected and the bug fixed (AR-14).
2. **Audit script, first version.** Two rules produced false positives because
   their regexes stopped at a `>` inside a quoted attribute and did not accept
   bound `:aria-label`/`:label`. The rules were tightened before the baseline
   was generated; otherwise the 0-violation baseline would have been
   meaningless.

---

## 5. GitHub triage

Every UI/UX issue in the repository backlog, plus the residual findings above,
is tracked in a dedicated GitHub Project:
**`Console — UI/UX & Accessibilité`** (owner `cloud-pi-native`).

The project is the operational backlog; this document is the review record.
Issue-level labels `ui/ux` and `a11y` allow filtering outside the project view.

Mapping of deferred findings to the project:

| Finding | Project item |
| --- | --- |
| AR-15 — list view loading states | created from this review |
| AR-16 — admin detail error state | created from this review |
| AR-17 — health page mobile layout | created from this review |
| AR-18 — token last-used column | created from this review |
| AR-19 — shareable log filters | created from this review |
| AR-21 — bundle chunk warning | created from this review |

---

## 6. Residual risk

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Static audit gives false confidence | medium | high | `accessibility.md` §4 manual protocol is mandatory before release |
| Focus handling conflicts with `DsfrTabs`/`DsfrModal` | medium | medium | verify in browser; defer modal trapping to the project backlog |
| Health polling every 5 min per tab increases API load | low | medium | constant is explicit; monitor after release |
| `sessionStorage` unavailable (private mode) | low | low | helper degrades to the previous behaviour (home page) |
| Refactor touches 45 files, review fatigue | medium | medium | changes are grouped by rule; each rule cites its evidence |

---

## 6 bis. Preview deployment gap (operational)

The `preview` label drives a workflow that POSTs a sync to the central ArgoCD
application `cpin-hp-cpn-console-preview-pr-<n>`. On 2026-10-22 the request
returned **HTTP 403**, and an inspection of the `cpin-hp` cluster found neither
the preview namespace (`dso-console-pr-2903`) nor a matching ArgoCD
Application. The label was removed so the pull request's code checks can be
evaluated on their own; the preview application must be provisioned on the
central ArgoCD before it can serve as a review environment.

This is an infrastructure gap, not a client defect. It is recorded here so a
future reviewer does not mistake the missing preview for a failed build.

---

## 7. Review cadence

- **Per PR**: audit + type-check + tests + build (already in `pnpm build`).
- **Per minor release**: manual keyboard and screen-reader protocol.
- **Per quarter**: re-run this adversarial review with the four lenses; add new
  findings to the GitHub project rather than reopening this document.
