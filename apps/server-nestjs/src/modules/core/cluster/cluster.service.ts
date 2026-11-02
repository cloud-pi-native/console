import type { ClusterUsage, CreateClusterBody, UpdateClusterBody } from '@cpn-console/shared'
import type { UserContext } from '../../infrastructure/auth/auth-user.decorator'
import type { ClusterEventName, ClusterEventPayload, EventContext } from '../events/app-events.service'
import type { ClusterError } from './cluster-errors'
import type { ClusterDetailsRecord, ClusterEnvironmentsRecord, ClusterListRecord } from './cluster-queries.utils'
import { AdminAuthorized } from '@cpn-console/shared'
import { Effect } from 'effect'
import { getFailedPlugins } from '../plugin/plugin.utils'
import { AppEvents, Prisma } from './cluster-context'
import { ClusterNotFound, EnvironmentsActive, HookFailed, LabelTaken } from './cluster-errors'
import {
  createClusterWithLinks,
  deleteCluster as deleteClusterRow,
  generateClusterWhere,
  getClusterById,
  getClusterByLabel,
  getClusterDetails,
  listClusterEnvironments,
  listClusters,
  getClusterUsage as readClusterUsage,
  updateClusterWithLinks,
} from './cluster-queries.utils'

// Event-before-delete: a KO leaves everything replayable, no dangling cluster.
function emitClusterEventOrFail(
  event: ClusterEventName,
  payload: ClusterEventPayload,
  context: EventContext,
): Effect.Effect<void, HookFailed, AppEvents> {
  return Effect.flatMap(
    Effect.service(AppEvents),
    appEvents => Effect.promise(() => appEvents.emitClusterEvent(event, payload, context)),
  ).pipe(
    Effect.flatMap(results => getFailedPlugins(results).length
      ? Effect.fail(new HookFailed({ event }))
      : Effect.succeed(void 0)),
  )
}

export function getClusterDetailsRecord(clusterId: string): Effect.Effect<ClusterDetailsRecord, ClusterNotFound, Prisma> {
  return Effect.flatMap(
    Effect.service(Prisma),
    prisma => Effect.promise(() => getClusterDetails(prisma, clusterId)),
  ).pipe(
    Effect.flatMap(record => record === null ? Effect.fail(new ClusterNotFound({ clusterId })) : Effect.succeed(record)),
  )
}

export function listClustersForUser(user: UserContext): Effect.Effect<ClusterListRecord[], never, Prisma> {
  return Effect.flatMap(
    Effect.service(Prisma),
    prisma => Effect.promise(() => listClusters(prisma, generateClusterWhere(AdminAuthorized.ListClusters(user.adminPermissions) ? undefined : user.userId))),
  )
}

export function getClusterUsage(clusterId: string): Effect.Effect<ClusterUsage, never, Prisma> {
  return Effect.flatMap(Effect.service(Prisma), prisma => Effect.promise(() => readClusterUsage(prisma, clusterId)))
}

export function getClusterAssociatedEnvironments(clusterId: string): Effect.Effect<ClusterEnvironmentsRecord[], never, Prisma> {
  return Effect.flatMap(Effect.service(Prisma), prisma => Effect.promise(() => listClusterEnvironments(prisma, clusterId)))
}

export function createCluster(
  data: CreateClusterBody,
  userId: string,
  requestId: string,
): Effect.Effect<ClusterDetailsRecord, ClusterError, Prisma | AppEvents> {
  return Effect.gen(function* () {
    const prisma = yield* Effect.service(Prisma)
    const isLabelTaken = yield* Effect.promise(() => getClusterByLabel(prisma, data.label))
    if (isLabelTaken) return yield* new LabelTaken({ label: data.label })

    const clusterCreated = yield* Effect.promise(() => prisma.$transaction(tx => createClusterWithLinks(tx, data)))

    yield* emitClusterEventOrFail('cluster.upsert', { clusterId: clusterCreated.id, zoneId: data.zoneId }, {
      action: 'Create Cluster',
      userId,
      requestId,
    })

    return yield* getClusterDetailsRecord(clusterCreated.id)
  })
}

export function updateCluster(
  data: UpdateClusterBody,
  clusterId: string,
  userId: string,
  requestId: string,
): Effect.Effect<ClusterDetailsRecord, ClusterError, Prisma | AppEvents> {
  return Effect.gen(function* () {
    const prisma = yield* Effect.service(Prisma)
    const dbCluster = yield* Effect.promise(() => getClusterById(prisma, clusterId))
    if (!dbCluster) return yield* new ClusterNotFound({ clusterId })

    yield* Effect.promise(() => prisma.$transaction(tx => updateClusterWithLinks(tx, clusterId, data)))

    yield* emitClusterEventOrFail('cluster.upsert', { clusterId, zoneId: dbCluster.zoneId }, {
      action: 'Update Cluster',
      userId,
      requestId,
    })

    return yield* getClusterDetailsRecord(clusterId)
  })
}

export function deleteCluster({
  clusterId,
  userId,
  requestId,
  force,
}: {
  clusterId: string
  userId?: string
  requestId: string
  force?: boolean
}): Effect.Effect<number, ClusterError, Prisma | AppEvents> {
  return Effect.gen(function* () {
    const prisma = yield* Effect.service(Prisma)
    const environment = yield* Effect.promise(() => prisma.environment.findFirst({ where: { clusterId } }))
    if (!force && environment) return yield* new EnvironmentsActive()

    yield* emitClusterEventOrFail('cluster.delete', { clusterId }, {
      action: 'Delete Cluster',
      userId,
      requestId,
    })

    let forcedCount = 0
    if (force && environment) {
      const envs = yield* Effect.promise(() => prisma.environment.deleteMany({ where: { clusterId } }))
      forcedCount = envs.count
    }
    yield* Effect.promise(() => deleteClusterRow(prisma, clusterId))
    return forcedCount
  })
}
