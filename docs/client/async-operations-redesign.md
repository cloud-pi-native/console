# Async Operations & Notification-Centered Client — Redesign Plan

Status: **proposal** (2026-10-23)
Scope: `apps/client`, `apps/server-nestjs`, `packages/shared`
Supersedes: the client-only operation tracking described in
`vue-best-practices.md` (VUE-11, VUE-16).

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
4. **Notifications are a first-class surface.** A global Activity Center shows
   running and finished operations, keeps failures until they are read, and
   exposes per-project badges. Toasts become a secondary channel.
5. **The UI stops blocking.** Forms submit, close, and let the resource show a
   pending state driven by server events. No modal stays open for a
   multi-minute provisioning.

This is a backend-heavy redesign. The client changes are only safe once the
operation contract exists; phases below make that ordering explicit.

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
| Health is polled every 5 minutes | `apps/client/src/stores/services-monitor.ts`, `HEALTH_POLL_INTERVAL_MS` |
| Feedback is ephemeral | `useSnackbarStore` clears non-error messages after 6 s; no history |
| Errors are not durable | A failed operation leaves no trace once the toast disappears |

The result is a console that looks synchronous even when the platform is doing
work for minutes, and that forgets what it was doing as soon as the user
reloads or opens a second tab.

---

## 3. Design principles

1. **Server truth, client projection.** The client renders operation state from
   the server; it never invents progress.
2. **At-least-once delivery, idempotent application.** Events may repeat; the
   reducer is keyed by a monotonic sequence and tolerates duplicates.
3. **Durable inbox, ephemeral transport.** SSE carries events; Postgres keeps
   them. A lost connection costs latency, never correctness.
4. **Progressive enhancement.** Polling alone must be a usable product; SSE
   makes it fast.
5. **No focus stealing.** Completion is announced politely; failures are
   assertive but never move focus.
6. **Multi-tab by default.** Two tabs converge on the same state through
   `BroadcastChannel` and the same server snapshot.
7. **Compatibility is a flag, not a branch.** Legacy synchronous endpoints stay
   available behind a feature flag until the new path is proven.

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
  cancelled
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
  progress       Int             @default(0) // 0..100
  currentStep    String?
  steps          Json            @default("[]")
  params         Json?
  result         Json?
  error          Json?
  createdAt      DateTime        @default(now())
  startedAt      DateTime?
  finishedAt     DateTime?
  heartbeatAt    DateTime?
  leaseOwner     String?
  project        Project?        @relation(fields: [projectId], references: [id])
  requestedBy    User?           @relation(fields: [requestedById], references: [id])
  events         OperationEvent[]

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

model Notification {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  operationId String?  @db.Uuid
  level       String   // info | success | warning | error
  title       String
  body        String?
  readAt      DateTime?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
  operation   Operation? @relation(fields: [operationId], references: [id])

  @@index([userId, readAt, createdAt])
}
```

Notes:

- `OperationEvent.id` is the SSE event id (`Last-Event-ID`), monotonic across the
  table, not per operation. Consumers ignore ids `<= lastSeen`.
- `steps` is an array of `{ key, label, status, startedAt, finishedAt }` so the
  UI can render a stepper without a second endpoint.
- `params` stores the sanitized request (no secrets); `result` stores resource
  ids or URLs.
- Retention: 90 days for finished operations; a nightly purge job. `Log`
  remains the audit record and is not replaced.

### 4.2 State machine

```
queued ──claim──> running ──ok──> succeeded
   │                 │
   │                 ├──error──> failed
   │                 └──cancel─> cancelled
   └──cancel────────> cancelled
```

- `queued → running` is a lease claim (`FOR UPDATE SKIP LOCKED`).
- `heartbeatAt` is refreshed every 15 s; a stale lease (> 2 min) is reclaimed
  and the operation moves back to `queued` with an attempt counter.
- Terminal states are immutable. Retrying creates a new operation linked by
  `retryOfId` (add if needed).

### 4.3 API contract (`packages/shared`, ts-rest)

| Method | Path | Result |
| --- | --- | --- |
| `POST` | `/api/v1/projects/:projectId/operations` | `202 { id, status, kind, links }` |
| `GET` | `/api/v1/operations/:operationId` | snapshot (`OperationSchema`) |
| `GET` | `/api/v1/operations?projectId=&status=&updatedSince=` | list, cursor paginated |
| `GET` | `/api/v1/events` (SSE) | `text/event-stream` |
| `POST` | `/api/v1/operations/:operationId/cancel` | `202` or `409` |
| `GET` | `/api/v1/notifications?unread=` | inbox |
| `POST` | `/api/v1/notifications/:id/read` | `204` |

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
  Only the kinds listed in §4.1 become asynchronous.

### 4.4 SSE envelope

```
id: 1042
event: operation.updated
data: {"operationId":"...","status":"running","progress":40,"currentStep":"gitlab","projectId":"..."}
```

Events: `operation.updated`, `operation.log`, `notification.created`,
`heartbeat` (every 15 s, no id).

Server requirements:

- `Cache-Control: no-cache`, `X-Accel-Buffering: no`.
- One stream per browser tab; server fan-out through an in-process hub plus
  Redis pub/sub when replicas > 1.
- Authorization on connect: only operations/notifications for projects the user
  can see.
- Replay from `Last-Event-ID` using `OperationEvent`.

---

## 5. Client architecture

### 5.1 Stores

| Store | Responsibility |
| --- | --- |
| `operationStore` | `byId`, `activeByProject`, `lastEventId`, snapshot reconciliation |
| `notificationStore` | inbox, unread count, read state, cross-tab sync |
| `connectionStore` | SSE state (`connecting`, `live`, `polling`, `offline`), last event time |

`projectStore` stops owning `operationsInProgress` and `needReplay`; it keeps
resource data and exposes selectors that join with `operationStore`.

### 5.2 Stream client

`useOperationStream()`:

1. Connect with `EventSource` to `/api/v1/events` (cookie/session auth).
2. Append `Last-Event-ID` from `operationStore`.
3. On `open`, reconcile the snapshot (`GET /operations?status=active` plus
   unread notifications) to cover events missed while offline.
4. On error, exponential backoff (1 s → 30 s, jitter), then switch to polling
   every 5 s. Never spin.
5. On `visibilitychange`, pause when hidden and reconcile on return.
6. Cross-tab: `BroadcastChannel('cpn-operations')` shares applied event ids so
   two tabs do not double-toast.

### 5.3 UI surfaces

**Global Activity Center** (header, bell + unread badge):

- Tabs: *En cours* / *Historique*.
- Row: kind label, project, progress bar, current step, elapsed time.
- Terminal rows: success (dismissable), failure (persistent until read), with
  *Voir les journaux* and *Réessayer*.
- Empty state: "Aucune opération en cours".
- Keyboard: opens with `g a`, closes with `Escape`, focus returns to the bell.

**Per-resource state**:

- Project header: one chip per active operation (`Provisionnement… 40 %`).
- Environment/repository rows: `En attente`, `En cours`, `Échec` badges driven
  by the operation kind and target id.
- Buttons disable only for the operation they trigger, not the whole page.

**Submission pattern**:

```
click "Reprovisionner"
  → POST operation (202)
  → close modal immediately
  → toast "Reprovisionnement lancé" (2 s)
  → project chip shows progress from SSE
  → on finish: success/failure notification; project data refreshed
```

**Errors**: never auto-dismiss. A failed operation stays in the Activity Center
and on the resource until the user reads it. The message is the server's
actionable French message, with a link to logs.

### 5.4 Accessibility

- Progress announcements use `role="status"` / `aria-live="polite"`, throttled
  to at most one announcement every 5 s per operation.
- Failures use `role="alert"` once, not on every retry tick.
- The Activity Center is a dialog/drawer with focus trapping and restoration.
- No focus movement on completion; no toast that steals focus.
- Progress is expressed as text (`40 % — GitLab`) in addition to the bar.
- `prefers-reduced-motion` disables the progress shimmer.

### 5.5 Shell / navigation (drastic part)

The shell becomes context-first, matching the cloud-console patterns already
documented in `docs/client/navigation.md`:

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
  insert Notification? (on terminal only)
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
- Terminal transition and notification insert happen in one transaction with
  the final event.
- Plugin results are mapped to a readable `error.cause` and `error.hint`.

### 6.3 Multi-replica fan-out

- Single replica: in-process `EventEmitter` hub is enough.
- Multiple replicas: publish `OperationEvent` to Redis; each replica pushes to
  its connected SSE clients. If Redis is unavailable, clients fall back to
  polling; no data is lost because the DB is the source of truth.

### 6.4 Compatibility

- The old synchronous endpoints stay behind `operations.async.enabled` per kind.
- During the transition, a synchronous call also creates an `Operation` row in
  `succeeded`/`failed` state so the client has one model.
- Rollback: disable the flag per kind; the client falls back to the old
  promise-based path. No data migration is required.

---

## 7. Migration plan

| Phase | Content | Size | Exit criteria |
| --- | --- | --- | --- |
| 0 | Contracts + Prisma models + `GET /operations` + SSE behind flag, no UI | L | Schemas merged; migration applied; SSE emits heartbeat |
| 1 | Runner for `project_replay_hooks` only; dual-write legacy call | M | Replay returns 202; operation reaches succeeded in staging |
| 2 | Client stream + Activity Center; `operationStore`; keep legacy buttons | M | Reload during replay keeps progress; two tabs converge |
| 3 | Convert environment/repository/deployment/member/role mutations | L | p95 mutation request < 300 ms; no modal waits |
| 4 | Remove `operationsInProgress`/`needReplay`; resource badges from operations | M | No client-only operation state remains |
| 5 | Notifications inbox, read state, browser notifications, retention/purge | M | Failure survives reload and tab close; unread count correct |
| 6 | Multi-replica Redis fan-out, load test, dashboards, remove legacy flag | M | 2 replicas, 500 concurrent SSE clients, no lost terminal events |

Each phase is a separate PR, feature-flagged, with its own rollback. The client
never depends on a phase that is not deployed.

---

## 8. Failure modes and mitigations

| Failure | Mitigation |
| --- | --- |
| SSE blocked by proxy buffering | `X-Accel-Buffering: no`, heartbeat every 15 s, polling fallback |
| Session/token expires | reconnect with refreshed token; on 401, pause and prompt re-login without losing snapshot |
| Event lost after terminal state | snapshot reconciliation on reconnect (`GET /operations/:id`) |
| Duplicate events | monotonic event id + idempotent reducer |
| Pod restart mid-operation | lease heartbeat; stale lease requeued; handler must be idempotent |
| Two tabs | `BroadcastChannel` + shared event ids; server snapshot wins |
| User closes tab | operation continues server-side; notification persists |
| Long operation exceeds retention | retention only applies to terminal states; active rows never purged |
| Cancel unsupported by a plugin | `409` with explanation; operation continues |
| Redis down | DB polling fallback; no correctness loss |

---

## 9. Observability and SLOs

Metrics:

- `operations_queued_total{kind}`, `operations_duration_seconds{kind}`,
  `operations_failed_total{kind}`, `operations_active`.
- `sse_connections`, `sse_reconnects_total`, `sse_delivery_lag_seconds`.
- `notifications_unread{user}` is not a metric (cardinality); expose aggregate.

SLOs:

- 99 % of terminal events delivered to a connected client within 2 s.
- 99 % of mutations return within 300 ms (202 path).
- 0 lost terminal states after reconnect (snapshot reconciliation).
- Failure notifications readable after 30 days.

---

## 10. Acceptance criteria

1. Reloading the page during a replay shows the operation still running, with
   the same progress and step.
2. Two tabs show the same operation state within 2 s and only one toast.
3. A failed operation survives reload and remains unread until dismissed.
4. No mutating request stays open for more than 1 s in the nominal path.
5. Killing the backend mid-operation requeues it; the client shows
   `reconnexion…` and then the resumed state.
6. SSE disabled (network) → polling keeps progress within 5 s.
7. Keyboard-only user can open the Activity Center, read a failure and retry.
8. Screen reader announces start, completion and failure exactly once.
9. `pnpm a11y:audit` stays at 0 violations; new surfaces have component tests.
10. Legacy flag off restores the previous behaviour without a data migration.

---

## 11. Risks and open questions

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Backend effort dominates | High | Phase 0–1 first; client keeps legacy path until phase 3 |
| Plugin handlers are not idempotent | Duplicate side effects on retry | Require idempotency per handler; audit each plugin before enabling |
| SSE through the ingress | Connection drops, buffering | Heartbeat + polling fallback; load test through nginx |
| Notification fatigue | Users ignore the center | Only terminal failures persist; progress stays in the rail |
| Permission leakage via SSE | Security | Resolve project scope per event; never broadcast globally |
| Operation table growth | DB bloat | 90-day retention, partition by month if needed |

Open questions:

1. Should cancellation be supported per kind, or only "stop scheduling"?
2. Is a per-user inbox required, or is a per-project activity feed enough?
3. Do we need email/webhook notifications for operations longer than N minutes?
4. Which plugins can be made idempotent without changing their external APIs?

---

## 12. Out of scope

- Replacing the plugin/hook system.
- Changing the permission model.
- A full design-system replacement; DSFR remains the base.
- Real-time collaborative editing.
- Mobile push notifications.
