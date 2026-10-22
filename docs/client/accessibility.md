# Accessibility — Cloud π Native Console

Status: **operational reference** (v1.0, 2026-10-22)
Target: **RGAA 4.1 / WCAG 2.2 level AA**
Companion documents: `vue-best-practices.md`, `personas.md`, `adversarial-review.md`.

---

## 1. Where the console stands

`App.vue` used to declare `a11y-compliance="partiellement conforme"` in the
footer while the application had:

- no skip link and no `<main>` landmark,
- 13 of 24 views without an `<h1>`,
- 24 icon-only buttons with no accessible name,
- 2 `aria-*` attributes in the entire client,
- status conveyed by colour alone,
- clickable `<div>`/`<tr>` elements with no keyboard path.

The refactor closes the structural gaps that can be verified statically. It does
**not** claim full RGAA conformance: contrast, focus order, and screen-reader
output still require a manual audit with real assistive technology (§6).

---

## 2. What changed, with evidence

| Rule | Before | After | Evidence |
| --- | --- | --- | --- |
| Skip link + landmarks | none | `.fr-skip-links` → `#content`, `#mainMenu`, `#footer`; `<main id="content" tabindex="-1">` | `src/App.vue`, audit rule `page-shell-missing-landmarks` |
| Page heading | 13 views without `h1` | every view has one (`PageHeading`, visually hidden when a DSFR table already shows the title) | audit rule `view-without-h1` |
| Accessible names | 24 unnamed icon-only buttons | `aria-label` on every one | audit rule `icon-only-without-name` = 0 |
| Route announcement | none | polite live region + focus moved to `#content` after each client-side navigation | `src/composables/useAnnouncer.ts`, `src/router/index.ts` |
| Snackbar | alert node created/destroyed with the message | persistent `role="status"`/`role="alert"` region | `src/components/DsoSnackbar.vue` |
| Loaders | silent spinners | `role="status"`, `aria-live="polite"`, `aria-busy="true"`, icon `aria-hidden` | `Loader.vue`, `LoadingCt.vue` |
| Clickable non-controls | 17 `div`/`code`/`tr` click targets | real `<button>` or `role="button"` + `tabindex="0"` + keyboard handler | audit rule `click-on-non-interactive` = 0 |
| Table headers | `<td>` in header rows | `<th scope="col">` | `ProjectResources`, `ListProjects`, `ListServiceChains` |
| Colour-only status | health dot without text | visually hidden status sentence next to the dot | `SideMenu.vue` |
| Theme toggle | `<a to="">` acting as a button | `<button type="button" aria-pressed>` + stored preference | `SideMenu.vue` |
| Hover-only help | `title` on non-focusable icons | `role="note" tabindex="0" aria-label` on the four question-mark notes | `ProjectBanner.vue`, `EnvironmentForm.vue` |

---

## 3. Automated checks

### 3.1 Static template audit

```sh
pnpm --filter @cpn-console/client a11y:audit
```

Rules: icon-only names, image alt, click handlers on non-interactive elements,
positive `tabindex`, view heading, duplicate `h1`, native button `type`, input
labels, application landmarks, `html[lang]`.

Output is a ratchet against `docs/client/a11y-baseline.json`. The baseline is
currently **0 violations**. Any new violation fails the command, and the
command runs inside `pnpm build`.

```sh
# intentionally accept the current state after a reviewed decision
pnpm --filter @cpn-console/client a11y:audit:update

# regenerate the human-readable report
pnpm --filter @cpn-console/client a11y:audit:report
```

### 3.2 Component tests

- `ProjectBanner.spec.ts` — accessible name of the icon-only edit button,
  keyboard-independent activation, no store mutation.
- `ProjectBanner.spec.ts` + `ChoiceSelector.spec.ts` — rendered DOM assertions
  in jsdom.
- `src/router/index.spec.ts` — every named route declares a page title, so the
  announcement and `document.title` cannot silently regress.
- `src/utils/auth-redirect.spec.ts` — deep-link preservation across login.

### 3.3 What the static audit cannot see

- Colour contrast (requires computed styles).
- Actual focus order and visibility.
- Screen-reader announcements (live-region timing).
- Whether a visible label is *correct*, only that one exists.

Those are manual checks. Do not treat a green audit as a conformance claim.

---

## 4. Manual test protocol (release checklist)

Run before each minor release, on the built image, not the dev server.

### 4.1 Keyboard only

1. Load `/` and press `Tab` once: the skip link must be the first visible focus.
2. Activate it: focus moves to `<main>`; the URL is unchanged except the hash.
3. Navigate to *Mes projets*: focus lands in the main region and the page title
   is announced.
4. Open a project, move through the seven tabs with arrow keys.
5. In *Ressources*, reach the *Configurer* button of the first environment
   without using a mouse; open and close the form with `Enter` then `Escape`.
6. Trigger a validation error and confirm the message is reachable and adjacent
   to the field.
7. Open the theme toggle: `Space` toggles it; `aria-pressed` changes.

### 4.2 Screen reader

| Environment | Minimum scenarios |
| --- | --- |
| NVDA + Firefox (Windows) | login, project list, project dashboard tabs, form error, snackbar |
| VoiceOver + Safari (macOS/iOS) | same, plus the services health page on a phone |
| TalkBack + Chrome (Android) | project list and environment form |

Expected: one `h1` per page, landmarks announced, icon-only buttons named,
snackbar announced once, table columns announced with their header.

### 4.3 Zoom and viewport

- 200 % zoom at 1280 px: no horizontal scroll on `/projects`, `/projects/:slug`,
  `/admin/*`.
- 400 % zoom / 320 px width: content reflows in one column; the health page is
  usable (known gap, see §7).
- `prefers-reduced-motion: reduce`: no non-essential animation.

### 4.4 Forms

For every form: label visible, hint associated, error adjacent and announced,
required fields marked, disabled submit explained.

---

## 5. Component author checklist

Before opening a PR that touches a component:

- [ ] The interactive element is a `<button>` or `<a>`, not a `div`.
- [ ] Icon-only buttons have `aria-label`; decorative icons are `aria-hidden`.
- [ ] The component has one heading level that fits the page outline.
- [ ] Async states expose `role="status"` and `aria-busy`.
- [ ] Errors are next to the field and referenced by `aria-describedby`.
- [ ] Status is not colour-only.
- [ ] Focus is visible and the element is reachable in DOM order.
- [ ] A test asserts the accessible name or the keyboard path.

---

## 6. Known limitations of this delivery

1. **No browser-based axe run.** The workspace cannot install new packages
   (pnpm store mismatch), and no headless browser is configured for component
   tests. The static audit covers structure, not rendering.
2. **No manual screen-reader session** was performed in this environment. The
   protocol in §4 is the handoff for that step.
3. **Contrast** relies on DSFR tokens; custom classes in `main.css` were not
   measured.
4. **`title` attributes remain** on non-essential cells (dates, sources). They
   are supplementary, not the only accessible name, but they are still
   mouse-only hints.
5. **The audit rules are heuristics.** A green run means "no known structural
   violation", not "accessible".

---

## 7. Residual issues (tracked, not fixed here)

| Issue | Impact | Why deferred |
| --- | --- | --- |
| Health page stays 3 columns below `md` | P3/P6 on mobile | Layout redesign needs a product decision |
| Some list views still render "empty" before load (`ListZones`, `ListStages`, `ListPlugins`) | False empty state | Each needs its own loading state; pattern is established in `DsoProjects` |
| Admin cluster/service-chain detail has no error state | Stuck spinner on API failure | Needs a shared error boundary |
| `title`-only hints on table cells | Mouse-only detail | Low impact, high churn |
| Focus is not trapped in modals | Depends on `DsfrModal` implementation | Requires verifying vue-dsfr behaviour with a browser |

These are mirrored in the GitHub triage project described in
`adversarial-review.md` §5.
