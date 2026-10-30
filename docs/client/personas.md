# Personas — Cloud π Native Console

Status: **reference** for product and UX decisions (v1.0, 2026-10-22)
Companion documents: `vue-best-practices.md`, `accessibility.md`,
`adversarial-review.md`.

These personas are derived from the product's actual permission model, routes,
and screens — not from a generic survey. Each one names the permission bits and
the views it can reach, so a design decision can be tested against a real user
instead of an abstraction.

---

## 0. Why these personas exist

The console serves two very different populations on the same surface:

1. **Project teams** (developers, tech leads) who self-serve their environments,
   repositories, deployments and secrets.
2. **Platform administration** (platform engineers, security, support) who
   operate the shared infrastructure and are accountable for it.

A third, smaller population — **sponsors** — consumes the console occasionally
and needs confidence, not controls.

Most UX defects in the current client come from designing for population 1 while
population 2 uses the same screens with different expectations: destructive
admin actions sit next to everyday project actions, empty states assume a
developer's vocabulary, and status information is colour-only in a context where
an on-call engineer may be reading it at 3 a.m. on a phone.

---

## 1. Persona portfolio

| ID | Persona | Primary role | Frequency | Permission footprint | Main routes |
| --- | --- | --- | --- | --- | --- |
| P1 | Camille — Application developer | Project member | Daily | `LIST_*`, `MANAGE_DEPLOYMENTS` | `/projects/:slug` (resources, services, logs) |
| P2 | Yassine — Tech lead / project owner | Project owner | Daily | `MANAGE`, `MANAGE_MEMBERS`, `MANAGE_ROLES`, `SEE_SECRETS`, `REPLAY_HOOKS` | `/projects/:slug` (all tabs), `/create-project` |
| P3 | Nadia — Platform engineer | Console administrator | Daily | `ADMIN.MANAGE`, `MANAGE_CLUSTERS/ZONES/STAGES/SYSTEM` | `/admin/*`, `/services-health` |
| P4 | Marc — Security officer (RSSI) | Read-only auditor | Weekly / on incident | `SEE_SECRETS`, `LIST_ADMIN_TOKEN`, `LIST` | `/admin/tokens`, `/admin/logs`, project secrets |
| P5 | Sophie — Portfolio sponsor | Decision maker | Monthly | none (or `LIST`) | `/`, `/projects` |
| P6 | Thomas — On-call support | N2 support | On incident | `LIST`, `LIST_SYSTEM` | `/services-health`, `/admin/logs` |
| X | Anti-persona — anonymous internet user | None | — | none | `/login` only |

---

## 2. P1 — Camille, application developer

**Context** — Full-stack developer in a public administration team. Ships to a
`dev` and an `integ` environment several times a day. Learned Kubernetes
concepts by osmosis, not by training. Works on a 14-inch laptop, often in a
shared office, sometimes on a slow VPN.

**Job to be done** — *"When I push code, I want to see my deployment succeed (or
fail with a readable reason) without asking the platform team."*

**Top tasks**

1. Open my project and see the state of each environment (`/projects/:slug`,
   tab `resources`).
2. Read deployment logs and understand a failure (`tab logs`).
3. Trigger or replay a deployment (`ProjectReplayButton`,
   `DeploymentModal`).
4. Retrieve a service URL or credentials I am allowed to see.
5. Add a repository or environment when I have the permission.

**What good looks like**

- The project dashboard answers "is my app up?" in under 5 seconds.
- A failure tells me *which step* failed and *what to do*, not a raw YAML dump.
- I never see an action I cannot perform; if it is disabled, I know why.

**Current friction (observed in code)**

- `ProjectResources.vue` renders three different messages for the same empty
  situation depending on permissions (`hideEnvs`), with no next action.
- `LogsViewer.vue` shows a wall of text with no severity filter or copy button
  in the empty state; errors are not linked to the failing step.
- The project page has no `<h1>` until `ProjectBanner` renders, so the page has
  no stable heading for screen-reader navigation.
- On a slow network, `DsoProjects` shows "you are not part of any project"
  before the request resolves — Camille thinks her access was revoked.

**Design implications**

- Status first, configuration second: environment cards must lead with a
  state badge and last deployment time.
- Logs need a copy action and a "what to do next" hint for known error
  signatures.
- Empty states must distinguish *loading*, *no data*, and *no permission*.

**Success signal** — Camille resolves a failed deployment without opening a
ticket; median time from "push" to "understood failure" under 2 minutes.

---

## 3. P2 — Yassine, tech lead and project owner

**Context** — Owns the project's access model and its budget guardrails. Handles
onboarding/offboarding, secrets rotation, and the occasional "why is prod
locked?" question. Accountable during audits.

**Job to be done** — *"Keep the right people in, the wrong people out, and the
project provisioned correctly — without breaking production."*

**Top tasks**

1. Invite/remove members and assign project roles (`tab team`, `tab roles`).
2. Transfer ownership when leaving (`TeamCt` transfer flow).
3. Read and rotate secrets (`ProjectSecretsButton`).
4. Replay provisioning hooks after a platform change (`ProjectReplayButton`).
5. Edit quotas and description (`tab configuration`).
6. Archive a project at end of life (`ProjectArchiveButton`).

**What good looks like**

- The consequence of a role change is visible before saving ("this role can
  read secrets").
- Destructive actions name the blast radius and require confirmation.
- I can see who did what, and when, without asking an admin.

**Current friction (observed in code)**

- `ProjectDashboard.vue` mutates `project.description` directly in the store
  from an event handler. Cancelling the edit still changes the rendered value,
  and the next refresh silently reverts it — a trust-breaking bug in a screen
  used for governance.
- Role editing (`ProjectRoleForm`, `AdminRoleForm`) exposes permission
  checkboxes with hints but no "effective permissions" preview.
- Archive is a single click in `ProjectAction` with a confirmation, but the
  project list does not explain what happens to environments and repositories.
- Ownership transfer has no summary of what the new owner inherits.

**Design implications**

- Every mutation goes through a store action and is optimistic-free: show
  pending, then the server truth.
- Role screens must show an effective-permission summary, not only raw bits.
- Destructive flows need a consequence panel (what is deleted, what is kept).

**Success signal** — Zero "who changed this?" escalations per quarter; access
reviews completed from the console without exporting data.

---

## 4. P3 — Nadia, platform engineer

**Context** — Runs the shared clusters, zones, service chains, and plugins.
Lives in the admin section. Automates what she can; the console is for the
20% that is not automated. Highly skilled, low tolerance for ambiguity.

**Job to be done** — *"Keep the platform healthy and correctly configured, and
understand immediately when a shared service degrades."*

**Top tasks**

1. Check service health and error causes (`/services-health`).
2. Manage clusters, zones, and environment types
   (`/admin/clusters`, `/admin/zones`, `/admin/stages`).
3. Configure plugins and service chains
   (`/admin/plugins`, `/admin/service-chains`).
4. Inspect any project as an administrator (`/admin/projects/:slug`).
5. Manage system settings and maintenance mode (`/admin/system-settings`).

**What good looks like**

- Dense, scannable tables with stable columns and no decorative whitespace.
- Status is explicit text plus colour, readable on a phone during an incident.
- Every destructive admin action is confirmed and logged.
- Cross-project navigation preserves the admin context.

**Current friction (observed in code)**

- `ServicesHealth.vue` renders one `DsfrAlert` per service in a 3-column grid;
  with 8+ services the page becomes a wall of coloured blocks with no summary
  or sorting by severity.
- The health dot in `SideMenu` conveys status by colour only, with no text
  alternative for screen readers or colour-blind users.
- `ListProjects` and other admin lists have no `<h1>`, no result count, and no
  empty state with a next action.
- Two icon-only buttons in `ServicesHealth` rely on `title` alone.

**Design implications**

- Health page: one summary banner ("3 services dégradés sur 8"), then a sorted
  list (error → warning → success).
- Admin tables: count, search, and a stable empty state.
- Destructive admin actions belong in a danger zone, never next to "refresh".

**Success signal** — Time to diagnose a degraded shared service under 3
minutes; no admin action performed by mistake without a confirmation step.

---

## 5. P4 — Marc, security officer

**Context** — Not a daily user. Arrives with a precise question: "who has access
to this secret?", "when was this token last used?", "what changed last week?".
Needs evidence he can paste into an audit report.

**Job to be done** — *"Prove that access and secrets are controlled, and
reconstruct what happened."*

**Top tasks**

1. List and inspect personal/admin tokens and their scopes
   (`/admin/tokens`, `/profile/tokens`).
2. Read project secrets when explicitly authorised (`SEE_SECRETS`).
3. Search logs around an incident (`/admin/logs`).
4. Verify role definitions and who holds them (`/admin/roles`).

**What good looks like**

- Read-only clarity: no accidental mutation path.
- Timestamps absolute and localised, with a copyable ISO value.
- Secret reveal is deliberate, time-boxed, and visibly auditable.
- Filters survive reload and can be shared as a URL.

**Current friction (observed in code)**

- `ListLogs` renders a `LogsViewer` without a visible filter state in the URL,
  so an investigation cannot be bookmarked or shared.
- Token screens show creation but not "last used", which is the first question
  in an access review.
- Secret reveal (`ProjectSecretsButton`) has no explicit "this access is
  logged" affordance.

**Design implications**

- Every read-only screen must look read-only (no disabled-but-present action
  buttons that suggest capability).
- Absolute timestamps with `<time datetime>` semantics; relative time as a
  secondary hint.
- Filters in the query string, with a "copy link" action.

**Success signal** — An access review can be completed and evidenced from the
console alone.

---

## 6. P5 — Sophie, portfolio sponsor

**Context** — Manages a portfolio of projects and a budget. Opens the console a
few times a month, often on a phone, usually with one question: "is everything
green, and what needs my attention?".

**Job to be done** — *"Tell me the state of my projects without making me learn
the tool."*

**Top tasks**

1. See the list of her projects and their status (`/projects`).
2. Open one project and understand its resource consumption.
3. Identify blocked or archived projects.

**What good looks like**

- A landing page that answers "what changed since last time?".
- Plain-language status, no jargon.
- Mobile-first layout: no horizontal scrolling, no 3-column grids on a phone.

**Current friction (observed in code)**

- `DsoHome` is a marketing-style landing page; the logged-in user's projects are
  one click away, not summarised.
- `DsoProjects` uses a tile grid with a fixed `min-w-75` and hides the tile
  header, so the visual hierarchy depends on colour and image only.
- Usage figures (`ProjectResources`) are expressed in CPU/memory units without a
  plain-language interpretation.

**Design implications**

- Home should branch: anonymous → value proposition; authenticated → "my
  projects" summary with status counts.
- Quotas need a human sentence next to the raw number ("4 CPU sur 8 utilisés").

**Success signal** — Sophie answers "is my portfolio healthy?" in one screen
without a click.

---

## 7. P6 — Thomas, on-call support

**Context** — Woken by an alert. Half-awake, on a phone, on a bad connection. He
does not need the full console; he needs the shortest path from "something is
broken" to "which service, since when, what is the cause".

**Job to be done** — *"Tell me what is broken and since when, in under a
minute."*

**Top tasks**

1. Open service health (`/services-health`).
2. Read the error cause for the degraded service.
3. Find the matching log lines (`/admin/logs`).
4. Trigger a refresh of the health cache if he has the permission.

**What good looks like**

- Health page loads fast and is usable at 360 px width.
- Degraded services are sorted first; the timestamp of the last check is
  unambiguous.
- Cause messages are expandable but not hidden behind hover (hover does not
  exist on touch).

**Current friction (observed in code)**

- `ServicesHealth` shows the error cause in a `title` attribute on a question
  icon — unreachable on touch and invisible to keyboard users.
- The `isUpdating` flag disables the refresh button but the button has no
  accessible name (icon-only, `title` only).
- `Loader` and `LoadingCt` announce nothing to assistive technology and do not
  mark the region busy.

**Design implications**

- Cause must be inline text (or a disclosure), never a `title` tooltip.
- Every refresh action needs a visible "last updated" timestamp.
- Loading must be announced, and the refresh button must expose its state.

**Success signal** — Median time to identify the degraded service under 45
seconds on mobile.

---

## 8. Anti-persona — anonymous internet user

Anyone who reaches the console without a Keycloak session. They must see only
the login entry point and public service health, never a partial application
shell with empty menus that imply access. The router already restricts public
routes; this persona exists to justify keeping it that way and to test the
redirect path (`/login` → Keycloak → deep link preservation).

**Fixed in this refactor** — the router guard used to replace the requested URL
with `/login` before Keycloak was called, so a user who opened
`/projects/foo` landed on `/` after authentication. The intended path is now
remembered in `sessionStorage` and restored on the `Login` route
(`src/utils/auth-redirect.ts`, AR-14). Verified by unit tests; the full Keycloak
round-trip remains a manual check.

---

## 9. Cross-cutting access needs

Personas describe *who*; these constraints describe *under what conditions*
every persona must still succeed. They are not a separate audience — any
persona can be in any of these states, temporarily or permanently.

| Constraint | Affected personas | Design requirement | Current state |
| --- | --- | --- | --- |
| Keyboard only | P2, P3, P4 | Skip link, visible focus, logical order, no `div @click` | No skip link; theme toggle is a link acting as a button |
| Screen reader | P1, P4 | Landmarks, `h1` per page, accessible names, live regions | 2 `aria-*` attributes total; 13 views without `h1` |
| Low vision / zoom 200 % | P3, P6 | No fixed-height containers, no horizontal scroll, contrast ≥ 4.5:1 | `min-w-80` sidebar + 3-column health grid |
| Colour vision deficiency | P3, P6 | Status by text + icon + colour | Health dot is colour-only |
| Motor impairment | P1, P6 | Targets ≥ 24 px, no hover-only affordances | Cause hidden in `title` |
| Attention / cognitive load | P1, P5 | One primary action, plain language, no dead ends | Permission-driven disabled buttons without explanation |
| Slow or unstable network | P1, P6 | Loading ≠ empty, retry path, no layout shift | False empty state on first paint |
| Mobile / small screen | P5, P6 | Single column, sticky primary action | Tabs collapse vertically; health grid stays 3 columns below `md` |

---

## 10. Prioritisation matrix

Impact on the persona's top task × frequency of the situation.

| Finding | P1 | P2 | P3 | P4 | P5 | P6 | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| False empty state before load | high | high | med | low | high | med | **P0** |
| Store-entity mutation on description | med | high | low | med | low | low | **P0** |
| No `h1` / no landmark / no skip link | high | high | high | high | high | high | **P0** |
| Icon-only buttons without names | med | med | high | med | med | high | **P1** |
| Colour-only service status | low | low | high | med | high | high | **P1** |
| Cause hidden in `title` | low | low | high | med | low | high | **P1** |
| Health page not sorted by severity | low | low | high | med | med | high | **P2** |
| Missing "last used" on tokens | low | low | med | high | low | low | **P2** |
| Log filters not shareable | med | med | high | high | low | high | **P2** |
| Deep link lost after login | high | high | high | med | med | med | **fixed (AR-14)** |

The P0/P1 rows are the ones this refactor implements; P2 rows are recorded in
`adversarial-review.md` with an owner and a follow-up condition.

---

## 11. How to use a persona in review

A design or code review comment should name the persona and the task:

> "P3, task 1: the health page sorts by service name, not severity. Nadia has to
> scan eight cards to find the red one."

If a proposed change cannot be tied to a persona and a top task, it is probably
decoration, not product work.
