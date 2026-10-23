# Async Operations & Journal-Centered Client — Redesign Plan

Status: **proposal v2 — decisions applied** (2026-10-23)
Scope: `apps/client`, `apps/server-nestjs`, `packages/shared`
Supersedes: the client-only operation tracking in `vue-best-practices.md`
(VUE-11, VUE-16).

Decision log:

1. **No cancellation** for now. Operations run to a terminal state; a retry is a
   new operation.
2. **Inbox like a cloud provider, backed by the existing journal.** No separate
   notification store: `Log` is the durable journal and the inbox reads from it.
3. **No external escalation** (no email, webhook or push).
4. **Every handler must be idempotent.** Async enablement is gated on a
   double-execution test per kind.

---

## 1. Decision summary

Move long-running work out of the request/response cycle and out of component
state:

1. **Server owns the operation.** A mutating endpoint that may take longer than
   a few seconds returns `202 Accepted` with an operation id instead of holding
   the HTTP connection open.
2. **Durable operation record.** A Prisma `Operation` aggregate stores state,
   progress, steps, result and error. It survives reloads, tab closes and pod
   restarts.
3. **Push first, poll as fallback.** The client subscribes to a user-scoped SSE
   stream (`/api/v1/events`), resumes with `Last-Event-ID`, and falls back to
   incremental polling when the stream is unavailable.
4. **The journal is the inbox.** Terminal operations write a `Log` row; the
   Activity Center is a live lens over active operations plus the existing
   journal. No parallel notification table, no second history.
5. **The UI stops blocking.** Forms submit, close, and let the resource show a
   pending state driven by server events.
6. **No cancellation.** The state machine has no `cancelled` state, no cancel
   endpoint, no cancel button. Retrying a failed operation creates a new one.

This is a backend-heavy redesign. The client changes are only safe once the
operation contract and the idempotency guarantees exist; phases below make that
ordering explicit.

---

## 2. Current state (observed)

| Fact | Evidence |
| --- | --- |
| Operations live only in the browser | `ProjectState.operationsInProgress: string[]` in `apps/client/src/utils/project-utils.ts`; initialized to `[]` on every project load |
| Reloading loses every in-flight operation | No persistence layer; state is rebuilt by `createProjectState()` |
| Only one operation is tracked per project | `beginOperation()` returns a no-op when `operationsInProgress.length > 1` (`apps/client/src/stores/project.ts`) |
| "Needs replay" is a heuristic, not a job | `needReplay` is set from three operation names; it is not a server state |
| Replay blocks the HTTP request | `ProjectHooksService.replay()` awaits `appEvents.emitProjectEvent()`, which awaits every plugin listener (`apps/server-nestjs/src/modules/core/project-hooks/project-hooks.service.ts`) |
| Events are in-process only | `AppEventsService` uses `EventEmitter2`; nothing is exposed to the client |
| No job model | Prisma has `Project`, `Log`, `Deployment`, `Environment`, `Repository`, roles and tokens — no `Operation`/`Job` table |
| The journal already exists | `Log` (`action`, `data`, `userId`, `projectId`, `requestId`) is written by `AppEventsService` and exposed by the logs API |
| Health is polled every 5 minutes | `apps/client/src/stores/services-monitor.ts`, `HEALTH_POLL_INTERVAL_MS` |
| Feedback is ephemeral | `useSnackbarStore` clears non-error messages after 6 s; no history |
| Errors are not durable | A failed operation leaves no trace once the toast disappears |

The result is a console that looks synchronous while the platform works for
minutes, and that forgets what it was doing as soon as the user reloads or opens
a second tab.

---

## 3. Design principles

1. **Server truth, client projection.** The client renders operation state from
   the server; it never invents progress.
2. **At-least-once delivery, idempotent application.** Events may repeat; the
   reducer is keyed by a monotonic sequence and tolerates duplicates.
3. **Durable operation, durable journal, ephemeral transport.** SSE carries
   events; Postgres keeps operations and journal rows. A lost connection costs
   latency, never correctness.
4. **One history.** The journal is the audit trail and the inbox. Do not create
   a parallel notification database that will drift from it.
5. **Progressive enhancement.** Polling alone must be usable; SSE makes it fast.
6. **No focus stealing.** Completion is announced politely; failures are
   assertive but never move focus.
7. **Multi-tab by default.** Two tabs converge through `BroadcastChannel` and
   the same server snapshot.
8. **Idempotency is a precondition, not a phase 6 concern.** A handler that
   cannot be replayed safely cannot be enabled asynchronously.

---

## 4. Target domain model

### 4.1 Prisma aggregate

Draft (names to be aligned with the Prisma naming used in `apps/server-nestjs`):

```prisma
enum OperationStatus {
  queued
  running
  succeeded
  failed
}

enum OperationKind {
  project_create
  project_update
  project_archive
  project_replay_hooks
  environment_create
  environment_update
  environment_delete
  repository_create
  repository_update
  repository_delete
  repository_sync
  deployment_create
  deployment_update
  deployment_delete
  member_add
  member_remove
  member_patch
  role_create
  role_update
  role_delete
}

model Operation {
  id             String          @id @default(uuid()) @db.Uuid
  kind           OperationKind
  status         OperationStatus @default(queued)
  projectId      String?         @db.Uuid
  requestedById  String?         @db.Uuid
  idempotencyKey String?
  retryOfId      String?         @db.Uuid
  progress       Int             @default(0) // 0..100
  currentStep    String?
  steps          Json            @default("[]")
  params         Json?
  result         Json?
  error          Json?
  logId          String?         @db.Uuid
  createdAt      DateTime        @default(now())
  startedAt      DateTime?
  finishedAt     DateTime?
  heartbeatAt    DateTime?
  leaseOwner     String?
  project        Project?        @relation(fields: [projectId], references: [id])
  requestedBy    User?           @relation(fields: [requestedById], references: [id])
  events         OperationEvent[]
  reads          OperationRead[]

  @@unique([requestedById, idempotencyKey])
  @@index([projectId, status])
  @@index([status, heartbeatAt])
  @@index([createdAt])
}

model OperationEvent {
  id          BigInt    @id @default(autoincrement())
  operationId String    @db.Uuid
  type        String    // operation.updated | operation.log | operation.finished
  payload     Json
  createdAt   DateTime  @default(now())
  operation   Operation @relation(fields: [operationId], references: [id], onDelete: Cascade)

  @@index([operationId, id])
  @@index([createdAt])
}

/**
 * Per-user read marker for the journal-backed inbox.
 * The journal itself stays in Log; this table only stores what the user has seen.
 */
model OperationRead {
  userId      String    @db.Uuid
  operationId String    @db.Uuid
  readAt      DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id])
  operation   Operation @relation(fields: [operationId], references: [id], onDelete: Cascade)

  @@id([userId, operationId])
  @@index([userId, readAt])
}
```

Additions to the existing `Log` model:

```prisma
model Log {
  // ...existing fields
  operationId String? @db.Uuid
  operation   Operation? @relation(fields: [operationId], references: [id])

  @@index([operationId])
  @@index([projectId, createdAt])
}
```

Notes:

- **No `Notification` table.** Terminal operations write one `Log` row through
  the existing log service, with `operationId` set. The journal page and the
  Activity Center both read that row.
- `OperationRead` is the only new per-user state: it marks a terminal operation
  as read. Unread count is `terminal operations for accessible projects minus
  reads`.
- `OperationEvent.id` is the SSE event id (`Last-Event-ID`), monotonic across the
  table, not per operation. Consumers ignore ids `<= lastSeen`.
- `steps` is an array of `{ key, label, status, startedAt, finishedAt }`.
- `params` stores the sanitized request (no secrets); `result` stores resource
  ids or URLs.
- Retention: terminal operations and their journal rows follow the existing log
  retention (align with `Log`); active rows are never purged.

### 4.2 State machine

```
queued ──claim──> running ──ok──> succeeded
   │                 │
   │                 └──error──> failed
   └──(lease expiry)──> queued (retry)
```

- No `cancelled` state. No cancel endpoint. No stop button.
- `queued → running` is a lease claim (`FOR UPDATE SKIP LOCKED`).
- `heartbeatAt` is refreshed every 15 s; a stale lease (> 2 min) returns the
  operation to `queued` for another attempt.
- A user-triggered retry creates a **new** operation with `retryOfId` pointing
  to the failed one. The failed operation is immutable history.

### 4.3 Idempotency contract

Every handler must satisfy:

1. **Stable identity.** The operation id is the idempotency key passed to the
   plugin layer. External resources use deterministic names derived from
   project + kind + target, or are looked up before creation.
2. **Replay-safe writes.** Prefer upsert/ensure semantics. A second execution
   must produce the same end state, not a duplicate resource.
3. **No blind side effects.** “Send notification”, “create token”, “append
   member” must check or dedupe by a natural key.
4. **Project-level lock.** One active operation per `(projectId, kind)` and
   target prevents concurrent conflicting runs.
5. **Double-execution test.** For each kind, a test runs the handler twice with
   the same operation id and asserts a single external effect.
6. **Resume, not restart, where possible.** Steps record completion so a stale
   lease resumes after the last successful step.

A kind cannot be enabled asynchronously until its double-execution test is
green. This gate is part of phase 1, not a later hardening phase.

### 4.4 API contract (`packages/shared`, ts-rest)

| Method | Path | Result |
| --- | --- | --- |
| `POST` | `/api/v1/projects/:projectId/operations` | `202 { id, status, kind, links }` |
| `GET` | `/api/v1/operations/:operationId` | snapshot (`OperationSchema`) |
| `GET` | `/api/v1/operations?projectId=&status=&updatedSince=&unread=` | list, cursor paginated |
| `GET` | `/api/v1/events` (SSE) | `text/event-stream` |
| `POST` | `/api/v1/operations/:operationId/read` | `204` |
| `POST` | `/api/v1/operations/read` | `204` (batch) |
| `GET` | `/api/v1/logs?projectId=&operationId=&…` | existing journal, extended filter |

No cancel route. No notification routes: the journal is the inbox.

Submission example:

```json
POST /api/v1/projects/8f.../operations
{
  "kind": "project_replay_hooks",
  "idempotencyKey": "b1f0c1d2-...",
  "params": {}
}
```

Rules:

- `idempotencyKey` is generated by the client per user intent. Replaying the
  same key returns the existing operation (`200`), never a duplicate.
- Permission checks happen at submission, not only at execution.
- The response includes `Location: /api/v1/operations/:id`.
- Synchronous endpoints remain for fast operations (reads, small updates).

### 4.5 SSE envelope

```
id: 1042
event: operation.updated
data: {"operationId":"...","status":"running","progress":40,"currentStep":"gitlab","projectId":"..."}
```

Events: `operation.updated`, `operation.log`, `operation.finished`,
`heartbeat` (every 15 s, no id).

Server requirements:

- `Cache-Control: no-cache`, `X-Accel-Buffering: no`.
- One stream per browser tab; in-process hub, Redis pub/sub when replicas > 1.
- Authorization on connect: only operations/logs for projects the user can see.
- Replay from `Last-Event-ID` using `OperationEvent`.

---

## 5. Client architecture

### 5.1 Stores

| Store | Responsibility |
| --- | --- |
| `operationStore` | `byId`, `activeByProject`, `lastEventId`, snapshot reconciliation |
| `activityStore` | journal-backed inbox: terminal operations, unread count, read markers |
| `connectionStore` | SSE state (`connecting`, `live`, `polling`, `offline`), last event time |
| `logStore` | existing journal data; gains `operationId` filtering |

`projectStore` stops owning `operationsInProgress` and `needReplay`; it keeps
resource data and exposes selectors that join with `operationStore`.

### 5.2 Stream client

`useOperationStream()`:

1. Connect with `EventSource` to `/api/v1/events` (cookie/session auth).
2. Append `Last-Event-ID` from `operationStore`.
3. On `open`, reconcile the snapshot (`GET /operations?status=active` plus
   unread terminal operations) to cover events missed while offline.
4. On error, exponential backoff (1 s → 30 s, jitter), then switch to polling
   every 5 s. Never spin.
5. On `visibilitychange`, pause when hidden and reconcile on return.
6. Cross-tab: `BroadcastChannel('cpn-operations')` shares applied event ids so
   two tabs do not double-toast.

### 5.3 UI surfaces

**Global Activity Center** (header, bell + unread badge):

- Tabs: *En cours* (live operations) and *Journal* (terminal operations, same
  rows as the journal page).
- Row: kind label, project, duration, status; active rows show progress and
  current step; terminal rows show the journal action and a link to the
  resource.
- Filters: project, severity (info/success/warning/error), date; persists in the
  URL so an investigation can be shared.
- Unread rows are marked; opening the center marks visible rows read (batched);
  *Tout marquer comme lu*.
- Failure rows stay until read; success rows can be dismissed.
- Empty state per tab.
- Keyboard: opens with the header button, closes with `Escape`, focus returns to
  the bell.

**Reused journal page**:

- The existing journal (`/admin/logs` for administrators, project logs for
  members) gains an `operationId` filter and an *Opérations* facet.
- A user sees journal rows for projects they can access; administrators see all.
- No duplicate history: the Activity Center links to the journal row rather
  than rendering a second copy with different wording.

**Per-resource state**:

- Project header: one chip per active operation (`Provisionnement… 40 %`).
- Environment/repository rows: `En attente`, `En cours`, `Échec` badges driven
  by the operation kind and target id.
- Buttons disable only for the operation they trigger, not the whole page.
- No cancel button anywhere.

**Submission pattern**:

```
click "Reprovisionner"
  → POST operation (202)
  → close modal immediately
  → toast "Reprovisionnement lancé" (2 s)
  → project chip shows progress from SSE
  → on finish: journal row + unread badge; project data refreshed
```

**Errors**: never auto-dismiss. The failed operation stays in the Activity
Center and in the journal until the user reads it. The message is the server's
actionable French message, with a link to logs and a *Réessayer* action that
creates a new operation.

### 5.4 Accessibility

- Progress announcements use `role="status"` / `aria-live="polite"`, throttled
  to at most one announcement every 5 s per operation.
- Failures use `role="alert"` once, not on every retry tick.
- The Activity Center is a dialog/drawer with focus trapping and restoration.
- No focus movement on completion; no toast that steals focus.
- Progress is expressed as text (`40 % — GitLab`) in addition to the bar.
- `prefers-reduced-motion` disables the progress shimmer.

### 5.5 Shell / navigation

The shell becomes context-first:

```
┌──────────────────────────────────────────────────────────────┐
│ Logo | Projet: [Alpha ▾] | Rechercher (⌘K) | Activité (3) | Compte │
├───────────────┬──────────────────────────────────────────────┤
│ Projets       │ Fil d'Ariane                                  │
│  Alpha        │ Titre + statut + action principale            │
│  Beta         │ ┌──────────────────────────┬─────────────────┐│
│ Plateforme    │ │ Contenu                  │ Rail d'activité ││
│ Administration│ │                          │ (opérations)    ││
└───────────────┴──────────────────────────┴─────────────────┘
```

- Project switcher persists the last project; recent projects first.
- Command palette (`⌘K`) searches pages, projects and operations.
- The activity rail is collapsible and remembers its state per user.
- Breadcrumbs everywhere except the home page.

---

## 6. Backend execution model

### 6.1 Submission

```
controller → permission check → transaction {
  insert Operation(queued)
  insert OperationEvent(operation.updated)
} → 202
```

No plugin call happens in the request. The request is bounded by a DB
transaction, not by GitLab/ArgoCD latency.

### 6.2 Runner

- A NestJS `OperationRunner` polls `queued` rows with
  `FOR UPDATE SKIP LOCKED`, claims a lease, sets `running`, emits an event.
- Handlers are registered per `OperationKind` and call the existing services
  (`ProjectHooksService`, environment/repository/deployment services).
- Each handler reports steps through an `OperationContext`:
  `ctx.step('gitlab')`, `ctx.progress(40)`, `ctx.log(...)`.
- Terminal transition, journal `Log` insert and final event happen in one
  transaction.
- Plugin results are mapped to a readable `error.cause` and `error.hint`.
- The runner never accepts a stop signal: no cancellation.

### 6.3 Journal write

On terminal state:

1. Write one `Log` row with `operationId`, `action` (existing wording), `data`
   (result or error summary), `userId` and `projectId`.
2. Link `Operation.logId` to it.
3. Emit `operation.finished`.

The journal remains the single audit trail. If the log write fails, the
operation stays `running` until the transaction succeeds; the runner retries the
transaction, not the whole plugin execution.

### 6.4 Multi-replica fan-out

- Single replica: in-process `EventEmitter` hub.
- Multiple replicas: publish `OperationEvent` to Redis; each replica pushes to
  its connected SSE clients. If Redis is unavailable, clients fall back to
  polling; no data is lost because Postgres is the source of truth.

### 6.5 Compatibility

- Old synchronous endpoints stay behind `operations.async.enabled` per kind.
- During the transition, a synchronous call also creates an `Operation` row in
  `succeeded`/`failed` state plus its journal row, so the client has one model.
- Rollback: disable the flag per kind; the client falls back to the legacy path.
  No data migration is required.

---

## 7. Migration plan

| Phase | Content | Size | Exit criteria |
| --- | --- | --- | --- |
| 0 | Contracts, Prisma models, `Log.operationId`, `OperationRead`, read API, SSE behind flag | L | Schemas merged; migration applied; SSE heartbeat works |
| 1 | Idempotency audit + double-execution tests for every kind; runner for `project_replay_hooks` | L | Replay returns 202; re-running the same operation produces one external effect |
| 2 | Client stream + Activity Center (*En cours* / *Journal*) + read markers | M | Reload during replay keeps progress; two tabs converge; unread count correct |
| 3 | Convert environment/repository/deployment/member/role mutations | L | p95 mutation request < 300 ms; no modal waits |
| 4 | Remove `operationsInProgress`/`needReplay`; resource badges from operations | M | No client-only operation state remains |
| 5 | Journal integration: `operationId` filter, facets, deep links, retention alignment | M | Journal is the only history; no duplicate notification store |
| 6 | Multi-replica Redis fan-out, load test, dashboards, remove legacy flag | M | 2 replicas, 500 SSE clients, no lost terminal events |

Each phase is a separate PR, feature-flagged, with its own rollback. The client
never depends on a phase that is not deployed.

---

## 8. Failure modes and mitigations

| Failure | Mitigation |
| --- | --- |
| SSE blocked by proxy buffering | `X-Accel-Buffering: no`, heartbeat every 15 s, polling fallback |
| Session/token expires | reconnect with refreshed token; pause and prompt re-login without losing snapshot |
| Event lost after terminal state | snapshot reconciliation on reconnect (`GET /operations/:id`) |
| Duplicate events | monotonic event id + idempotent reducer |
| Pod restart mid-operation | lease heartbeat; stale lease requeued; handlers are idempotent |
| Handler replayed | idempotency contract + double-execution test |
| Two tabs | `BroadcastChannel` + shared event ids; server snapshot wins |
| User closes tab | operation continues server-side; journal row persists |
| Journal write fails | terminal transaction retries; operation stays `running` until the row is durable |
| Redis down | DB polling fallback; no correctness loss |
| User wants to stop a job | not supported by decision; UI explains that it will run to completion |

---

## 9. Observability and SLOs

Metrics:

- `operations_queued_total{kind}`, `operations_duration_seconds{kind}`,
  `operations_failed_total{kind}`, `operations_active`.
- `sse_connections`, `sse_reconnects_total`, `sse_delivery_lag_seconds`.
- `journal_write_failures_total`, `journal_lag_seconds`.

SLOs:

- 99 % of terminal events delivered to a connected client within 2 s.
- 99 % of mutations return within 300 ms (202 path).
- 0 lost terminal states after reconnect.
- Journal row written for 100 % of terminal operations.

---

## 10. Acceptance criteria

1. Reloading during a replay shows the operation still running, with the same
   progress and step.
2. Two tabs show the same state within 2 s and only one toast.
3. A failed operation survives reload, appears in the journal, and stays unread
   until dismissed.
4. No mutating request stays open for more than 1 s in the nominal path.
5. Killing the backend mid-operation requeues it; the client reconnects and
   shows the resumed state.
6. SSE disabled → polling keeps progress within 5 s.
7. Keyboard-only user can open the Activity Center, read a failure, open the
   journal row and retry.
8. Screen reader announces start, completion and failure exactly once.
9. `pnpm a11y:audit` stays at 0 violations; new surfaces have component tests.
10. Legacy flag off restores the previous behaviour without data migration.
11. Replaying the same operation twice produces one external resource and one
    journal row.

---

## 11. Risks and open questions

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Backend effort dominates | High | Phase 0–1 first; client keeps legacy path until phase 3 |
| Handlers are not idempotent today | High | Phase 1 audit + double-execution tests gate every kind |
| SSE through the ingress | Medium | Heartbeat + polling fallback; load test through nginx |
| Journal visibility leaks data | High | Project-scoped queries; admins see all, members see their projects |
| Operation table growth | Medium | Align retention with `Log`; partition by month if needed |
| No cancellation frustrates users | Medium | Clear “cette opération ira au bout” copy; retry only after failure |

Open questions:

1. Which existing `Log` retention applies, and should operations outlive it?
2. Should the *Journal* tab be available to all members or only to project
   managers? (Current journal routes are admin-oriented.)
3. How do we expose per-step logs without duplicating the `Log` payload?
4. Which plugin handler has the highest duplicate risk and should be the pilot
   for the idempotency harness?

---

## 12. Out of scope

- Cancellation of running operations (explicit decision).
- Email, webhook or push notifications (explicit decision).
- A separate notification database.
- Replacing the plugin/hook system.
- Changing the permission model.
- Real-time collaborative editing.
- Mobile push notifications.
