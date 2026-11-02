import type { Cluster, Project } from '@prisma/client'
import type { Layer } from 'effect'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaService } from '../../infrastructure/database/prisma.service'
import type { AppEventsService } from '../events/app-events.service'
import type { AppEvents, Prisma } from './cluster-context'
import type { ClusterDetailsRecord } from './cluster-queries.utils'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { Effect } from 'effect'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeEnvironment } from '../environment/environment-testing.utils'
import { makeProject } from '../project/project-testing.utils'
import { makeClusterLayer } from './cluster-context'
import { ClusterNotFound, EnvironmentsActive, HookFailed } from './cluster-errors'
import {
  makeCluster,
  makeClusterDetailsRecord,
  makeClusterListRecord,
  makeCreateClusterBody,
} from './cluster-testing.utils'
import {
  createCluster,
  deleteCluster,
  getClusterUsage,
  listClustersForUser,
  updateCluster,
} from './cluster.service'

describe('clusterService', () => {
  let prisma: DeepMockProxy<PrismaService>
  let appEvents: DeepMockProxy<AppEventsService>
  let layer: Layer.Layer<Prisma | AppEvents>

  beforeEach(() => {
    prisma = mockDeep<PrismaService>()
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(prisma))
    appEvents = mockDeep<AppEventsService>()
    appEvents.emitClusterEvent.mockResolvedValue({})
    layer = makeClusterLayer(prisma, appEvents)
  })

  it('lists raw cluster records for an admin', async () => {
    const record = makeClusterListRecord({ infos: null })
    prisma.cluster.findMany.mockResolvedValue([record])

    const result = await Effect.runPromise(Effect.provide(listClustersForUser({ userId: 'admin-1', adminPermissions: ADMIN_PERMS.LIST_CLUSTERS }), layer))

    expect(result).toEqual([record])
  })

  it('passes the authorized user filter when listing clusters', async () => {
    prisma.cluster.findMany.mockResolvedValue([])

    const userId = faker.string.uuid()
    await Effect.runPromise(Effect.provide(listClustersForUser({ userId }), layer))

    expect(prisma.cluster.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: expect.any(Array) },
    }))
  })

  it('returns cluster usage from the aggregate', async () => {
    const usage = { cpu: 1, gpu: 0, memory: 8 }
    prisma.environment.aggregate.mockResolvedValue({
      _sum: { cpu: 1, gpu: 0, memory: 8 },
      _count: { _all: 1 },
      _avg: { cpu: null, gpu: null, memory: null },
      _min: { cpu: null, gpu: null, memory: null },
      _max: { cpu: null, gpu: null, memory: null },
    })

    const result = await Effect.runPromise(Effect.provide(getClusterUsage(faker.string.uuid()), layer))

    expect(result).toEqual(usage)
  })

  it('creates a cluster, links projects and stages, and emits the cluster event', async () => {
    const record = makeClusterListRecord()
    const cluster = makeCluster()
    const details = makeClusterDetailsRecord()
    prisma.cluster.findUnique.mockResolvedValue(null)
    prisma.cluster.create.mockResolvedValue(cluster)
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(details)

    const result = await Effect.runPromise(Effect.provide(createCluster(
      {
        label: record.label,
        infos: record.infos ?? '',
        clusterResources: record.clusterResources,
        privacy: record.privacy,
        zoneId: record.zoneId,
        cpu: record.cpu,
        gpu: record.gpu,
        memory: record.memory,
        projectIds: ['project-1'],
        stageIds: ['stage-1'],
        kubeconfig: { cluster: { tlsServerName: 'example.com' }, user: {} },
      },
      faker.string.uuid(),
      faker.string.uuid(),
    ), layer))

    expect(result.id).toEqual(details.id)
    expect(prisma.cluster.create).toHaveBeenCalled()
    expect(prisma.cluster.update).toHaveBeenCalled()
    expect(appEvents.emitClusterEvent).toHaveBeenCalledWith('cluster.upsert', expect.objectContaining({ clusterId: cluster.id }), expect.any(Object))
  })

  it('fails with HookFailed when a plugin reports KO on create', async () => {
    prisma.cluster.findUnique.mockResolvedValue(null)
    prisma.cluster.create.mockResolvedValue(makeCluster())
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(makeClusterDetailsRecord())
    appEvents.emitClusterEvent.mockResolvedValue({ gitlab: { status: 'KO', message: 'boom', executionTime: 1, error: new Error('boom') } })

    await expect(Effect.runPromise(Effect.provide(createCluster(
      makeCreateClusterBody({
        label: 'ko-cluster',
        infos: '',
        clusterResources: false,
        privacy: 'public',
      }),
      faker.string.uuid(),
      faker.string.uuid(),
    ), layer))).rejects.toBeInstanceOf(HookFailed)
  })

  it('fails with LabelTaken when the label already exists', async () => {
    prisma.cluster.findUnique.mockResolvedValue(makeCluster())

    await expect(Effect.runPromise(Effect.provide(createCluster(
      {
        label: 'taken',
        infos: '',
        clusterResources: true,
        privacy: 'public',
        zoneId: faker.string.uuid(),
        cpu: 1,
        gpu: 0,
        memory: 1,
        stageIds: [],
        kubeconfig: { cluster: { tlsServerName: 'example.com' }, user: {} },
      },
      faker.string.uuid(),
      faker.string.uuid(),
    ), layer))).rejects.toMatchObject({ _tag: 'LabelTaken', label: 'taken' })
  })

  it('updates cluster fields and emits the cluster event', async () => {
    const record = makeClusterDetailsRecord()
    prisma.cluster.findUnique.mockResolvedValue(record)
    prisma.cluster.update.mockResolvedValue(record)
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(record)

    const result = await Effect.runPromise(Effect.provide(updateCluster(
      { label: 'new-label' },
      record.id,
      faker.string.uuid(),
      faker.string.uuid(),
    ), layer))

    expect(result.id).toEqual(record.id)
    expect(prisma.cluster.update).toHaveBeenCalled()
    expect(appEvents.emitClusterEvent).toHaveBeenCalledWith('cluster.upsert', expect.objectContaining({ clusterId: record.id }), expect.any(Object))
  })

  it('fails with ClusterNotFound when updating a missing cluster', async () => {
    prisma.cluster.findUnique.mockResolvedValue(null)

    await expect(Effect.runPromise(Effect.provide(updateCluster({ label: 'new' }, faker.string.uuid(), faker.string.uuid(), faker.string.uuid()), layer))).rejects.toBeInstanceOf(ClusterNotFound)
  })

  it('deletes a cluster after a successful reconcile, event before delete', async () => {
    const record = makeClusterListRecord()
    prisma.environment.findFirst.mockResolvedValue(null)
    prisma.cluster.delete.mockResolvedValue(record)

    const forcedCount = await Effect.runPromise(Effect.provide(deleteCluster({
      clusterId: record.id,
      userId: faker.string.uuid(),
      requestId: faker.string.uuid(),
    }), layer))

    expect(forcedCount).toBe(0)
    expect(appEvents.emitClusterEvent).toHaveBeenCalledBefore(prisma.cluster.delete)
    expect(appEvents.emitClusterEvent).toHaveBeenCalledWith('cluster.delete', expect.objectContaining({ clusterId: record.id }), expect.any(Object))
  })

  it('fails with HookFailed on delete reconcile KO and keeps the row', async () => {
    const record = makeClusterListRecord()
    prisma.environment.findFirst.mockResolvedValue(null)
    appEvents.emitClusterEvent.mockResolvedValue({ gitlab: { status: 'KO', message: 'boom', executionTime: 1, error: new Error('boom') } })

    await expect(Effect.runPromise(Effect.provide(deleteCluster({
      clusterId: record.id,
      userId: faker.string.uuid(),
      requestId: faker.string.uuid(),
    }), layer))).rejects.toBeInstanceOf(HookFailed)

    expect(prisma.cluster.delete).not.toHaveBeenCalled()
  })

  it('fails with EnvironmentsActive when environments are deployed and force is off', async () => {
    prisma.environment.findFirst.mockResolvedValue(makeEnvironment())

    await expect(Effect.runPromise(Effect.provide(deleteCluster({
      clusterId: faker.string.uuid(),
      userId: faker.string.uuid(),
      requestId: faker.string.uuid(),
    }), layer))).rejects.toBeInstanceOf(EnvironmentsActive)
  })

  it('keeps dedicated project links when an update omits projectIds', async () => {
    const record: Cluster & { projects: Project[] } = { ...makeClusterDetailsRecord({ privacy: 'dedicated' }), projects: [makeProject()] }
    prisma.cluster.findUnique.mockResolvedValue(record)
    prisma.cluster.update.mockResolvedValue(record)
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(record)

    await Effect.runPromise(Effect.provide(updateCluster({ infos: 'updated' }, record.id, 'u', 'r'), layer))

    // Only the field update ran: no per-project disconnect when the body omits
    // projectIds.
    expect(prisma.cluster.update).toHaveBeenCalledTimes(1)
  })

  it('detaches dedicated project links on an explicit empty projectIds', async () => {
    const record = makeClusterDetailsRecord({ privacy: 'dedicated' })
    const dbCluster: Cluster & { projects: Project[] } = { ...record, projects: [makeProject({ id: 'project-1' })] }
    prisma.cluster.findUnique.mockResolvedValue(record)
    prisma.cluster.update.mockResolvedValue(record)
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(dbCluster)

    await Effect.runPromise(Effect.provide(updateCluster({ infos: 'updated', projectIds: [] }, record.id, 'u', 'r'), layer))

    expect(prisma.cluster.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ projects: { disconnect: { id: 'project-1' } } }),
    }))
  })

  it('detaches all projects when an update flips the cluster to public', async () => {
    const record = makeClusterDetailsRecord({ privacy: 'dedicated' })
    const publicRecord: ClusterDetailsRecord = { ...record, privacy: 'public' }
    const dbCluster: Cluster & { projects: Project[] } = { ...record, projects: [makeProject({ id: 'project-1' }), makeProject({ id: 'project-2' })] }
    prisma.cluster.findUnique.mockResolvedValue(record)
    prisma.cluster.update.mockResolvedValueOnce(publicRecord)
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(dbCluster)

    await Effect.runPromise(Effect.provide(updateCluster({ privacy: 'public' }, record.id, 'u', 'r'), layer))

    expect(prisma.cluster.update).toHaveBeenCalledTimes(3)
    expect(prisma.cluster.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ projects: { disconnect: { id: 'project-2' } } }),
    }))
  })
})
