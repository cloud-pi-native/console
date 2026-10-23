# Journal-Centered Notifications — Front-End Redesign Plan

Status: **proposal v3 — front-only** (2026-10-23)
Scope: `apps/client` only. **No backend, Prisma, SSE or runner changes in this
iteration.**
Supersedes: v2 async operation plan (kept as Appendix A for the later backend
step).

Decision log:

1. **No cancellation.**
2. **Reuse the journal for notifications.** One history, no notification table.
3. **No external escalation** (email, webhook, push).
4. **Front-end refactoring first.** Long-request handling is improved in the
   client; server-owned operations are a later phase.
5. Handlers will have to be idempotent when the backend phase starts.

---

## 1. What this iteration delivers

A front-end notification and activity layer built on data that already exists:

- the **journal** (`GET /api/v1/logs`) becomes the notification history;
- the client keeps a **local registry of in-flight operations** so reloads do
  not erase what the user just launched;
- an **Activity Center** in the shell shows *En cours* and *Journal*;
- unread state is persisted per browser, not per account;
- long forms stop blocking the screen: submit, close, follow the journal.

No API contract, database schema or backend service changes.

### What the journal already gives us

| Need | Existing source |
| --- | --- |
| What happened | `Log.action` (e.g. `Replay hooks for Project`, `Create Environment`) |
| Success / failure | `Log.data.failed`, `Log.data.warning` |
| Duration | `Log.data.totalExecutionTime` |
| Summary | `Log.data.messageResume` |
| Project scope | `Log.projectId` (full log) or the request's `projectId` (clean log) |
| Actor | `Log.userId` |
| Time | `Log.createdAt` |
| Paging | `offset`, `limit` on `GET /api/v1/logs` |

Existing client code: `useLogStore` (`getAllLogs`, `listLogs`) and
`LogsViewer`. The plan reuses both instead of creating a parallel store.

---

## 2. Constraints we accept

These are deliberate for a front-only iteration:

1. **No true job state.** The server does not expose an operation id. The client
   infers completion from journal entries.
2. **Polling, not push.** No SSE. The inbox polls while visible; the badge polls
   slowly in the background.
3. **Per-project fan-out for members.** `/logs` requires a `projectId` for
   non-admins and returns clean logs (no `projectId`). A member inbox merges one
   request per project.
4. **Local read state.** `lastSeenAt` / `lastSeenLogId` live in `localStorage`;
   another browser starts unread.
5. **Reload uncertainty.** If the HTTP request was aborted by a reload and no
   journal entry appears, the operation is shown as *état inconnu* with a link
   to the project journal, not as a success or a failure.
6. **No progress percentage.** The client shows elapsed time and indeterminate
   activity, never a fabricated percentage.
7. **No cancellation.** A launched operation runs to completion.

These limits are acceptable because the goal is UX coherence now, not durable
orchestration.

---

## 3. Client architecture

### 3.1 Stores and composables

| Unit | Responsibility |
| --- | --- |
| `journalInboxStore` | normalized journal entries, unread count, read markers, polling orchestration |
| `activeOperationsStore` | local in-flight operations, persisted in `localStorage`, reconciliation with journal |
| `useJournalPolling()` | visibility-aware polling with backoff; stops when the tab is hidden |
| `useOperationSubmit()` | wraps a long action: registers a local operation, starts the promise, closes the UI, handles errors |

`projectStore` keeps its data; `operationsInProgress` and `needReplay` are
progressively replaced by `activeOperationsStore` selectors.

### 3.2 Journal entry normalization

```ts
interface JournalEntry {
  id: string
  action: string
  projectId?: string
  projectName?: string
  userId?: string
  createdAt: string
  severity: 'success' | 'warning' | 'error' | 'info'
  summary?: string
  durationMs?: number
  failed?: boolean
  raw: Log
}
```

Rules:

- `data.failed` truthy → `error`; `data.warning?.length` → `warning`; else
  `success` for mutating actions, `info` otherwise.
- `summary` = `data.messageResume` when present, otherwise a French label mapped
  from `action`.
- `projectName` comes from `projectStore.projectsBySlug`, matched by
  `projectId`; clean logs get the project from the request context.
- Deduplicate by `id`; sort by `createdAt` descending.
- Ignore entries older than the retention configured for the inbox (default
  30 days).

### 3.3 Sources and polling

| Caller | Query | Cadence |
| --- | --- | --- |
| Administrator | `GET /logs?offset=0&limit=20&clean=false` | 15 s while visible, 60 s hidden |
| Member | one `GET /logs?projectId=…&offset=0&limit=10&clean=true` per project (max 10 projects, most recent first) | 20 s while visible, 90 s hidden |
| Project page | existing project log call | unchanged |

Polling rules:

- Only the first page is fetched for the inbox; older entries are loaded on
  demand in the *Journal* tab.
- A poll that returns only known ids does not re-render the list.
- Backoff on error: 15 s → 30 s → 60 s, reset on success.
- Pause when `document.visibilityState === 'hidden'`; reconcile immediately on
  return.
- No polling while the user is unauthenticated.

### 3.4 Read state

```ts
interface JournalReadState {
  userId: string
  lastSeenAt: string   // ISO
  lastSeenLogId?: string
}
```

- Stored in `localStorage` under `cpn-journal-read:<userId>`.
- Unread = entries with `createdAt > lastSeenAt` and `id !== lastSeenLogId`.
- Opening the Activity Center marks visible entries read after 1 s (avoid
  marking something the user never saw).
- *Tout marquer comme lu* sets `lastSeenAt = now`.
- Failure entries stay in the list until read; success entries can be dismissed.
- Cross-device read state is explicitly out of scope.

### 3.5 Local operation registry

```ts
interface LocalOperation {
  id: string                 // crypto.randomUUID()
  projectSlug: string
  kind: 'replay' | 'archive' | 'environment' | 'repository' | 'deployment' | 'member' | 'role'
  label: string
  startedAt: string
  status: 'running' | 'unknown' | 'succeeded' | 'failed'
  matchedLogId?: string
  timeoutAt: string          // startedAt + 15 min
}
```

- Persisted in `localStorage` under `cpn-active-operations:<userId>`.
- Registered before the request starts; removed when matched or expired.
- Reconciliation: a journal entry for the same project whose `action` maps to
  the same kind and whose `createdAt >= startedAt` marks the operation
  `succeeded` or `failed`.
- If no entry appears by `timeoutAt`, status becomes `unknown`; the UI says
  *« État inconnu — consulter le journal »* and links to the project journal.
- Pruned after 24 h in a terminal state.

This is honest: the client cannot know more than the journal tells it.

---

## 4. UX surfaces

### 4.1 Activity Center

Header bell with unread badge. Drawer with two tabs:

**En cours**

- Local operations, newest first.
- Row: label, project, elapsed time, indeterminate bar.
- No cancel button.
- Empty: *Aucune opération en cours*.
- Unknown state: warning icon, journal link, *J'ai compris* dismissal.

**Journal**

- Normalized journal entries for accessible projects.
- Row: severity marker, French action label, project, relative time, duration,
  summary.
- Unread rows marked; click marks read and opens the project journal entry.
- Filters: project, severity. Persist in the drawer state (not the URL yet).
- *Tout marquer comme lu*.
- Empty: *Aucune activité récente*.

Keyboard:

- Bell opens with `Enter`, closes with `Escape`, focus returns to the bell.
- Tabs use arrow keys (DSFR tabs).
- `g` then `a` opens the center from anywhere (optional shortcut).

### 4.2 Non-blocking submission

```
submit form
  → register local operation (persisted)
  → close modal immediately
  → start request (do not block the UI)
  → toast "Reprovisionnement lancé" (2 s)
  → operation row appears in the Activity Center
  → journal poll reconciles completion
  → resource data reloads when the matching entry appears
```

`useOperationSubmit` owns the promise and routes errors into the journal
fallback: even if the request rejects before a journal row exists, the
operation row becomes `failed` with the error message.

### 4.3 Per-resource state

- Project header: chips for `activeOperationsStore` entries for that project.
- Environment/repository rows: `En cours` badge while a matching operation is
  running; `État inconnu` if expired without a journal match.
- Buttons disable only for the operation they trigger.
- No page-wide blocking overlay for mutations.

### 4.4 Accessibility

- Activity Center is a DSFR modal/drawer with focus trap and restoration.
- Badge count is announced via `aria-label` on the bell (*Activité, 3 non lues*).
- New entries while the drawer is open are announced politely once.
- Failures use `role="alert"` once; no repeated announcements on poll.
- Indeterminate progress uses `role="status"` with text (*En cours depuis 2 min*).
- `prefers-reduced-motion` disables the indeterminate animation.

---

## 5. Shell and navigation (still front-only)

This iteration can also land the navigation work planned earlier:

- project switcher in the header, persisted;
- breadcrumbs on nested routes;
- `⌘K` command palette searching pages, projects and journal entries;
- activity rail on project pages, collapsible.

The existing `docs/client/navigation.md` (to be written with the implementation)
remains the reference.

---

## 6. Phases

| Phase | Content | Size | Exit criteria |
| --- | --- | --- | --- |
| 0 | `journalInboxStore`, normalization, read state, tests | S | Unit tests for severity, dedupe, unread, project fan-out |
| 1 | Activity Center drawer + bell + *Journal* tab | M | Unread persists across reload; keyboard path works |
| 2 | `activeOperationsStore` + `useOperationSubmit` + project chips | M | Reload during replay shows the local operation; journal match reconciles |
| 3 | Non-blocking forms for replay, archive, environment/repository mutations | M | No mutation modal stays open |
| 4 | Shell: project switcher, breadcrumbs, `⌘K` palette | M | Navigation and search work with keyboard |
| 5 | Remove `operationsInProgress` / `needReplay` from `projectStore` | S | No client-only flags remain |

Each phase is a separate PR on top of the draft client PR, feature-flagged with
`VITE_JOURNAL_INBOX` where the UI replaces an existing path.

---

## 7. Acceptance criteria

1. The Activity Center lists journal entries for every project the user can
   access, with project names and French action labels.
2. Unread count survives reload and is scoped to the browser profile.
3. Reading an entry updates the badge without a page reload.
4. Failure entries stay until read; success entries can be dismissed.
5. Reloading during a replay shows the local operation as *en cours*, then
   reconciles to success/failure when the journal entry appears.
6. If no journal entry appears after 15 minutes, the operation becomes
   *état inconnu* with a working journal link.
7. No mutating modal stays open after submit.
8. No cancel button exists.
9. Keyboard-only user can open the center, switch tabs, read an entry and close.
10. Screen reader announces the unread count and new failures once.
11. `pnpm a11y:audit` stays at 0 violations; new units have tests.
12. No backend, schema or API change is part of this iteration.

---

## 8. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Member fan-out: one request per project | Load, latency | Cap at 10 most recent projects; sequential with 100 ms spacing; cache |
| Journal polling is stale | Completion delayed | 15–20 s cadence while visible; immediate reconcile on visibility change |
| False completion match | Wrong success state | Match by project + action + time window; require `createdAt >= startedAt` |
| Reload aborts the HTTP request | Unknown server state | Local operation persisted; journal reconciliation; explicit *état inconnu* |
| Local read state is per browser | Inconsistent devices | Documented; backend read markers later |
| Journal permissions | Member sees too much / too little | Only query projects the user belongs to; admins use global logs |
| `localStorage` unavailable | Lost unread/operations | Degrade to in-memory; no crash |

---

## 9. What we explicitly do not build now

- No `Operation` table, no runner, no SSE, no Redis.
- No cancellation.
- No notification table; no duplicate history.
- No email/webhook/push.
- No cross-device read state.
- No progress percentage.

---

## Appendix A — Later backend step (from v2, unchanged)

When the front-only limits become unacceptable, the backend phase adds:

- durable `Operation` + `OperationEvent` tables and a lease-based runner;
- `202 Accepted` submissions with idempotency keys;
- SSE `/api/v1/events` with `Last-Event-ID` and polling fallback;
- per-kind idempotency tests, gating async enablement;
- terminal journal row written in the same transaction;
- Redis fan-out for multiple replicas.

The front-end stores from this plan (`journalInboxStore`,
`activeOperationsStore`) are designed to be replaced by server snapshots
without changing the Activity Center UI.

### Trigger for starting the backend phase

Start it when one of these is true:

1. users lose trust because reloads show *état inconnu* too often;
2. a single request exceeds the ingress timeout;
3. the journal polling fan-out becomes a measurable load problem;
4. multi-user/multi-device history becomes a product requirement.
