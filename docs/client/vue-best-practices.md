# Vue 3 Client Standard — Cloud π Native Console

Status: **normative** for `apps/client` (v1.0, 2026-10-22)
Audience: front-end contributors, reviewers, and anyone touching `apps/client`.

This document is not a generic Vue tutorial. It records the conventions this
client must follow, why they exist here, and how each one is enforced. Where a
rule is not yet enforced by tooling, it says so explicitly instead of pretending
otherwise.

---

## 0. How to read this document

| Keyword | Meaning |
| --- | --- |
| **MUST** | Blocking. A reviewer rejects the change. |
| **SHOULD** | Default. Deviating requires a comment in the PR explaining why. |
| **MAY** | Optional, judgement call. |

Every rule has an ID (`VUE-xx`, `A11Y-xx`, `UX-xx`) so review comments can cite
it directly, e.g. *"VUE-07: this mutates a store entity from a child component"*.

---

## 1. Measured baseline (2026-10-22, before this standard)

The numbers below come from `apps/client/src` at the start of the refactor. They
are the reason the rules are ordered the way they are.

| Signal | Count | Consequence |
| --- | --- | --- |
| `.vue` files | 70 | Small enough to converge, large enough to need rules |
| `: any` / `as any` occurrences | 96 | The API boundary is effectively untyped |
| `@ts-ignore` / `@ts-expect-error` | 17 | Type errors are silenced, not fixed |
| `onBeforeMount` usages | 28 | Data loading is scattered and not awaitable by tests |
| Direct `@/router/index.js` imports in components | 13 | Components are coupled to the router singleton |
| `aria-*` attributes in the whole client | 2 | Accessibility is currently incidental |
| `icon-only` buttons without `aria-label` | 15 files / 24 buttons | Unnamed controls for screen-reader users |
| Views without an `<h1>` | 13 of 24 | No reliable page heading for navigation |
| `<main>` landmark | 0 | No main landmark, no skip link |

Gates after the refactor are listed in §9. The intent is a **ratchet**: the
counters may go down, never up.

---

## 2. Architecture and component boundaries

### VUE-01 — Single-File Components only, `<script setup lang="ts">`

**MUST** use `<script setup lang="ts">`. No Options API, no `defineComponent`
with a `setup()` returning a render function, no `.jsx` components.

**Why** — one mental model, better type inference in templates, smaller output.
**Enforced by** — `vue/component-api-style: ['error', ['script-setup']]`.

### VUE-02 — Respect the four layers

| Layer | Location | Owns | May import |
| --- | --- | --- | --- |
| View | `src/views/**` | Route-bound orchestration, data loading, permissions | everything below |
| Component | `src/components/**` | Rendering and local interaction | composables, utils, types |
| Composable | `src/composables/**` | Reusable stateful logic | stores, utils, types |
| Store | `src/stores/**` | Server state, domain commands | api, utils, types |
| Util | `src/utils/**` | Pure functions and adapters | types only |

**MUST NOT** let a pure presentational component import a store. A component
that needs server data receives it through props and emits intents
(`VUE-04`). Container components that legitimately own store access belong in
`src/views/` or are explicitly named `*Container.vue`.

> Migration note: several existing components (`ProjectResources`,
> `ServicesConfig`, `TeamCt`) still call stores directly. They are tolerated
> until touched; new components must follow the rule, and a component being
> modified for another reason SHOULD be migrated in the same change.

**Why** — store-coupled components cannot be rendered in isolation, which is
why there is currently no component test harness for them.

### VUE-03 — One route, one `<h1>`, one owner of the page title

Every routed view **MUST** render exactly one `<h1>`, and the route **MUST**
declare `meta.title`. The document title is produced centrally in
`src/router/index.ts`; components **MUST NOT** write `document.title`.

**Why** — 13 of 24 views currently have no `h1`, and titles were set by an
ad-hoc global guard with no per-route metadata.

### VUE-04 — Props down, events up, never mutate what you do not own

**MUST NOT** assign to a prop, to a property of a prop object, or to an object
reachable from a Pinia store inside a child component.

```ts
// ❌ forbidden — mutates a store entity from a child
project.description = desc

// ✅ the child emits, the owner decides
emit('update:description', desc)
```

Use `defineModel()` for two-way bindings on primitive form values only.

**Why** — `ProjectDashboard.vue` currently writes `project.description`
directly into the store, so a cancelled edit still changes the rendered project
and the next `refresh()` silently reverts it. This is a real, reproducible bug,
not a style preference.

**Enforced by** — `vue/no-mutating-props` (ESLint) plus review for store
entities, which ESLint cannot see.

### VUE-05 — Typed boundaries, no escape hatches

- **MUST NOT** introduce `any`, `as any`, `as unknown as T`, or a new
  `@ts-ignore`.
- **MUST** narrow `unknown` with a type guard that names the offending value in
  its error message.
- API payloads **MUST** be parsed with the Zod schemas exported by
  `@cpn-console/shared` before entering a store. Parse, don't validate: the
  returned type is the proof.

```ts
// ❌ today
.then((response: any) => extractData(response, 200))

// ✅ target
const response = await apiClient.Projects.getProject({ params: { projectId } })
const project = ProjectSchema.parse(extractData(response, 200))
```

**Why** — with 96 `any` sites, a backend field rename is discovered at runtime
in production rather than by `vue-tsc` in CI.

**Enforced by** — `ts/no-explicit-any` (error), `ts/no-unsafe-*` family,
`ts/ban-ts-comment` (currently disabled in the shared config — it must be
re-enabled for `apps/client`).

### VUE-06 — Explicit imports for app code, auto-import for framework APIs

`unplugin-auto-import` provides `ref`, `computed`, `watch`, `useRoute`,
`useRouter`, `defineStore`, and the vue-dsfr helpers. **MUST NOT** also import
those same symbols manually in the same file.

Application modules (`@/stores/*`, `@/utils/*`, `@/composables/*`, components)
**MUST** be imported explicitly. No barrel files: import the concrete module.

**Why** — mixing both forms makes it impossible to tell whether a symbol is a
framework global or a local dependency, which slows review and breaks greps.

### VUE-07 — Router access from components goes through `useRouter()` / `useRoute()`

**MUST** use the composables inside components. Importing the router singleton
is allowed only in non-component modules: route definitions, guards, and
interceptors.

**Why** — 13 components import `@/router/index.js` directly. That makes them
unmountable in a test without booting the real router with the real guard chain
(Keycloak included).

### VUE-08 — Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Component file & name | PascalCase, multi-word | `ProjectBanner.vue` |
| View | PascalCase, noun phrase | `ProjectDashboard.vue` |
| Composable | `useXxx`, file `useXxx.ts` | `useAsyncAction.ts` |
| Store | `useXxxStore`, file `xxx.ts` | `useProjectStore` in `project.ts` |
| Emit | kebab-case in templates, camelCase in `defineEmits` | `@save-description` |
| Boolean prop | positive adjective | `disabled`, `canManage` |
| Constant | `SCREAMING_SNAKE_CASE` | `DESCRIPTION_MAX_LENGTH` |

### VUE-09 — No business logic in templates

Templates **MUST NOT** contain more than a single ternary or a single method
call chain. Multi-branch permission logic, formatting, and filtering belong in
`computed` or in a composable.

**Why** — `ProjectDashboard.vue` currently embeds four permission expressions
of the form `asProfile === 'user' && !ProjectAuthorized.X(...)` in attributes,
which is unreadable and untestable.

---

## 3. Reactivity, lifecycle and async work

### VUE-10 — `onMounted` for effects, `computed` for derivation, `watch` only for side effects

- Data fetching that must run once per mount: `onMounted`.
- Derived values: `computed`. **MUST NOT** mirror a prop or store value into a
  `ref` and keep them in sync with `watch`.
- `watch` is for side effects (persist, navigate, announce), not for copying
  state.

**Why** — `onBeforeMount` is used 28 times for async work. It runs before the
component is in the DOM, cannot be awaited by a parent, and gives no loading
state to the template.

### VUE-11 — Every async action has an explicit state machine

Use `useAsyncAction` (`src/composables/useAsyncAction.ts`):

```ts
const save = useAsyncAction(async () => {
  await project.value.Commands.update(payload)
}, { onError: error => snackbar.error(error.message) })

// template
<DsfrButton :disabled="save.pending.value" @click="save.run" />
```

**MUST** expose `idle | pending | success | error` to the template. A button
that triggers a network call **MUST** be disabled while pending and **MUST**
recover on failure.

**Why** — today each component re-implements `isProcessing` booleans with
slightly different semantics, and several `finally` blocks can leave the flag
stuck when the component unmounts mid-flight.

### VUE-12 — No floating promises

Every promise **MUST** be awaited, returned, or explicitly voided with a
comment. `no-floating-promises` is an error.

**Why** — a rejected `listMyProjects()` currently produces an unhandled
rejection and a permanently empty screen.

### VUE-13 — Errors are user-visible, typed, and never swallowed

```ts
// ❌
await store.load().catch(() => undefined)

// ✅ best-effort, but stated
await store.load().catch((error: unknown) => {
  logger.warn({ err: error }, 'system settings unavailable, using defaults')
})
```

User-facing messages **MUST** be actionable French sentences, not HTTP status
codes. `extractData` already normalises API errors; components **MUST** render
`error.message`.

---

## 4. State management

### VUE-14 — Stores own server state; components own ephemeral UI state

- Server-derived collections and entities: Pinia.
- Open/closed panels, draft form values, hover state: local `ref`.
- **MUST NOT** store derived data (counts, filtered lists) in the store; expose
  a `computed` getter instead.

### VUE-15 — Store actions are the only mutation path

Components **MUST NOT** write `store.someEntity.field = value`. They call an
action. Entities returned by the API are **MUST** be treated as read-only
outside their store.

### VUE-16 — One in-flight request per resource

List/detail loads **MUST** be de-duplicated (the existing `p-debounce` pattern)
and **MUST** expose a `loaded` flag so a view can distinguish "empty" from
"not loaded yet".

**Why** — `DsoProjects` renders *"Vous ne faites parti d'aucun projet"* before
the request resolves, so every user sees a false empty state on a slow network.

---

## 5. Accessibility (RGAA 4.1 / WCAG 2.2 AA)

The console is a French public-service application. `DsfrFooter` already
declares `a11y-compliance="partiellement conforme"`; these rules are the path to
*conforme*.

### A11Y-01 — Skip link and landmarks

The shell **MUST** provide a skip link to `#content`, a `<header>`, a
`<nav aria-label="Menu principal">`, a `<main id="content" tabindex="-1">`, and
a `<footer>`.

### A11Y-02 — Focus management on navigation

On every route change the SPA **MUST** move focus to the `<main>` element (or
the `<h1>`) and announce the new page title through a polite live region. The
skip link **MUST** be the first focusable element.

**Why** — without this, a screen-reader user stays on the clicked menu item and
never learns that the content changed.

### A11Y-03 — Every control has an accessible name

Icon-only buttons **MUST** carry `aria-label`. A `title` attribute alone is not
sufficient (it is not exposed on touch and is inconsistently announced).

```vue
<!-- ❌ 15 files today -->
<DsfrButton icon-only icon="ri:refresh-line" title="Renouveler l'appel" />

<!-- ✅ -->
<DsfrButton icon-only icon="ri:refresh-line" aria-label="Renouveler l'appel" title="Renouveler l'appel" />
```

Decorative icons **MUST** be `aria-hidden="true"`; icons that carry meaning
**MUST** have a text alternative.

### A11Y-04 — Status is never conveyed by colour alone

The service-health dot, project badges, and alert types **MUST** include a text
label or an accessible description. Colour is an enhancement.

### A11Y-05 — Live regions for asynchronous feedback

Snackbars, loaders, and inline validation summaries **MUST** use
`role="status"` (polite) or `role="alert"` (assertive), and the region **MUST**
exist in the DOM before the message is inserted.

**Why** — `DsoSnackbar` currently mounts and unmounts the alert node, so
assistive technology may miss the message entirely.

### A11Y-06 — Forms: label, hint, error, and `aria-invalid`

Every input **MUST** have a visible `<label>`. Hints and errors **MUST** be
programmatically associated (`aria-describedby`), and invalid fields **MUST**
set `aria-invalid="true"`. Error text **MUST** be adjacent to the field, not
only in a global snackbar.

### A11Y-07 — Keyboard and focus visibility

All interactive elements **MUST** be reachable and operable with the keyboard,
in DOM order. Focus **MUST** remain visible; **MUST NOT** remove outlines
without an equivalent replacement. Custom clickable elements **MUST** be
`<button>`/`<a>`; `div @click` is forbidden.

### A11Y-08 — Reduced motion and timing

Non-essential animation **MUST** respect `prefers-reduced-motion`. Loading
spinners are exempt but **MUST** expose `role="status"`.

### A11Y-09 — Touch targets

Interactive targets **MUST** be at least 24×24 CSS px (WCAG 2.2 AA 2.5.8);
primary actions **SHOULD** be 44×44.

---

## 6. UX rules

### UX-01 — Every async surface has four states

`loading`, `empty`, `error`, `success`. A view **MUST NOT** show an empty-state
message before the first load resolves (`VUE-16`). Empty states **MUST** offer
the next action ("Créer un projet") when the user has the permission.

### UX-02 — Destructive actions are reversible or confirmed

Irreversible actions **MUST** require an explicit typed confirmation (the
existing `deleteValidationInput` pattern) and **MUST** state the blast radius
("3 déploiements seront supprimés").

### UX-03 — Never disable a submit button without explaining why

If a primary action is disabled, the reason **MUST** be visible next to it or
in its `title`/`aria-describedby`.

### UX-04 — One primary action per screen

Secondary and tertiary actions **MUST NOT** compete visually with the primary
path. Destructive actions **MUST NOT** be the default focus.

### UX-05 — Microcopy is French, specific, and actionable

- Sentence case, no exclamation marks in errors.
- Say what happened and what to do next.
- **MUST NOT** expose raw stack traces, HTTP codes, or English API errors.
- Vocabulary is stable: *projet*, *environnement*, *déploiement*, *zone*,
  *chaîne de services*, *jeton*.

### UX-06 — Preserve context on navigation

Filters, selected tab, and pagination **MUST** survive a reload via the query
string. `ProjectDashboard` already does this for tabs; list views **SHOULD**
follow.

### UX-07 — Time and numbers are localised

Dates via `Intl.DateTimeFormat('fr-FR')`, relative times via
`javascript-time-ago`. Byte and CPU values **MUST** carry their unit in the
label, not only in a hint.

---

## 7. Performance

### VUE-17 — Routes are lazy, heavy widgets are lazy

Route-level dynamic import is already the norm; **MUST** stay that way.
Components over ~40 kB of JS (log viewer, JSON viewer, YAML editor) **SHOULD**
be loaded on demand.

### VUE-18 — Budget

Initial JS for the shell **MUST** stay under 350 kB gzip. A PR that raises the
budget must say so and justify it. Measure with
`pnpm --filter @cpn-console/client build` and the Vite report.

### VUE-19 — No unnecessary global CSS

New selectors **MUST** be scoped. Global CSS is reserved for DSFR overrides and
design tokens, and **MUST** be added to `src/main.css` with a comment naming the
DSFR component it overrides.

---

## 8. Testing

### VUE-20 — Colocated specs, behaviour over implementation

`*.spec.ts` next to the unit. Test the contract (props in, events/DOM out), not
private refs. Stores are tested with a mocked `apiClient`; pure utils with table
tests.

### VUE-21 — Interactive components need an accessibility assertion

Any component with a button, input, or dialog **MUST** have at least one test
asserting the accessible name and the keyboard path.

### VUE-22 — Bug fixes ship with a regression test

Every `fix:` commit that changes behaviour **MUST** add a test that fails
before the fix. The two bugs fixed by this refactor (store-entity mutation,
false empty state) have one each.

---

## 9. Enforcement matrix

| Rule | Mechanism | Gate |
| --- | --- | --- |
| VUE-01, VUE-04, VUE-09 | ESLint (`vue/*`) | `pnpm lint:ts` |
| VUE-05 | ESLint (`ts/no-explicit-any`, `ts/ban-ts-comment`) | `pnpm lint:ts` |
| VUE-12 | ESLint (`ts/no-floating-promises`) | `pnpm lint:ts` |
| A11Y-03, A11Y-06, A11Y-07 | ESLint (`vue/*`) + `pnpm a11y:audit` | `pnpm lint:ts`, `pnpm build` |
| A11Y-01..09, UX-01, UX-03 | `pnpm a11y:audit` (static template audit, JSON + Markdown) | CI job `client-a11y` |
| VUE-05, VUE-11, VUE-20 | Vitest + `vue-tsc` | `pnpm test`, `pnpm type-check` |
| VUE-18 | Build output budget | CI job `client-build` |

The audit script is intentionally dependency-free: it reads `.vue` sources and
checks structural invariants that a DOM-based tool cannot see in CI without a
browser. DOM-level checks (focus order, live regions) are covered by component
tests.

---

## 10. Definition of Done (front-end change)

- [ ] `pnpm --filter @cpn-console/client type-check` passes.
- [ ] `pnpm --filter @cpn-console/client lint:ts` passes with no new disable comments.
- [ ] `pnpm --filter @cpn-console/client lint:style` passes.
- [ ] `pnpm --filter @cpn-console/client test` passes; new behaviour is covered.
- [ ] `pnpm --filter @cpn-console/client build` passes and the bundle budget holds.
- [ ] `pnpm --filter @cpn-console/client a11y:audit` reports no new violations.
- [ ] The screen has one `h1`, a skip link path, and all async states.
- [ ] No `any`, no `@ts-ignore`, no direct store mutation added.
- [ ] French copy reviewed; no English API text leaked.

---

## 11. Migration strategy (ratchet, not big bang)

1. **New and touched code** follows the full standard immediately.
2. **Counters may not increase.** `a11y:audit` fails on regression against the
   committed baseline (`docs/client/a11y-baseline.json`).
3. Existing store-coupled components are migrated when their feature is next
   modified (`VUE-02` migration note).
4. Every removed `any`/`@ts-ignore` is progress; adding one requires an explicit
   review waiver recorded in the PR.

This keeps the refactor reviewable in slices and prevents a "reformat the
world" PR that nobody can review.
