import type { ExperimentalFeatureRequest, ExperimentalFeatureScope } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'

const targetSelect = {
  id: true,
  featureKey: true,
  scopeKind: true,
  scopeId: true,
  requested: true,
  revision: true,
  events: {
    select: { revision: true, action: true, actorId: true, createdAt: true },
    orderBy: { revision: 'asc' },
  },
} satisfies Prisma.ExperimentalFeatureTargetSelect

export type ExperimentalFeatureTargetRecord = Prisma.ExperimentalFeatureTargetGetPayload<{ select: typeof targetSelect }>

export function listExperimentalFeatureTargets(tx: Prisma.TransactionClient) {
  return tx.experimentalFeatureTarget.findMany({
    where: { featureKey: 'opencds' },
    select: targetSelect,
    orderBy: [{ scopeKind: 'asc' }, { scopeId: 'asc' }],
  })
}

export function getExperimentalFeatureTarget(tx: Prisma.TransactionClient, id: string) {
  return tx.experimentalFeatureTarget.findUnique({ where: { id, featureKey: 'opencds' }, select: targetSelect })
}

export function getUpdatedExperimentalFeatureTarget(tx: Prisma.TransactionClient, id: string) {
  return tx.experimentalFeatureTarget.findUniqueOrThrow({ where: { id, featureKey: 'opencds' }, select: targetSelect })
}

export function getExperimentalFeatureScopeCount(tx: Prisma.TransactionClient, scope: ExperimentalFeatureScope) {
  switch (scope.kind) {
    case 'instance': return Promise.resolve(1)
    case 'cluster': return tx.cluster.count({ where: { id: scope.id } })
    case 'project': return tx.project.count({ where: { id: scope.id, status: { not: 'archived' } } })
    case 'environment': return tx.environment.count({ where: { id: scope.id, project: { status: { not: 'archived' } } } })
  }
}

export function upsertExperimentalFeatureTarget(tx: Prisma.TransactionClient, scope: ExperimentalFeatureScope, actorId: string) {
  return tx.experimentalFeatureTarget.upsert({
    where: { featureKey_scopeKind_scopeId: { featureKey: 'opencds', scopeKind: scope.kind, scopeId: scope.id } },
    create: {
      featureKey: 'opencds',
      scopeKind: scope.kind,
      scopeId: scope.id,
      events: { create: { revision: 0, action: 'authorize', actorId } },
    },
    update: {},
    select: targetSelect,
  })
}

export function updateExperimentalFeatureRequest(tx: Prisma.TransactionClient, id: string, request: ExperimentalFeatureRequest) {
  return tx.experimentalFeatureTarget.updateMany({
    where: { id, revision: request.expectedRevision },
    data: { requested: request.requested, revision: { increment: 1 } },
  })
}

export function createExperimentalFeatureEvent(tx: Prisma.TransactionClient, targetId: string, request: ExperimentalFeatureRequest, actorId: string) {
  return tx.experimentalFeatureEvent.create({
    data: {
      targetId,
      revision: request.expectedRevision + 1,
      action: request.requested ? 'activate' : 'suspend',
      actorId,
    },
  })
}
