import type { Prisma as PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { Effect } from 'effect'
import { describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeEnvironment } from '../environment/environment-testing.utils'
import { makeCluster, makeClusterDetailsRecord, makeClusterEnvironmentsRecord, makeClusterListRecord } from './cluster-testing.utils'
import { ClusterService } from './cluster.service'

const prismaMock = Object.assign(mockDeep<PrismaClient.TransactionClient>(), {
  $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(prismaMock)),
})

function createClusterBody(overrides: Partial<Parameters<ClusterService['createCluster']>[0]> = {}) {
  return {
    label: faker.helpers.slugify(faker.word.sample(5)).toLowerCase(),
    infos: '',
    clusterResources: true,
    privacy: 'public' as const,
    zoneId: faker.string.uuid(),
    cpu: 1,
    gpu: 0,
    memory: 1,
    projectIds: [],
    stageIds: [],
    kubeconfig: { cluster: { tlsServerName: 'example.com' }, user: {} },
    ...overrides,
  }
}

describe('cluster tasks', () => {
  const service = new ClusterService(
    prismaMock as never,
    { emitAsync: vi.fn().mockResolvedValue(undefined) } as never,
    { addLog: vi.fn().mockResolvedValue(undefined) } as never,
    {} as never,
  )
  it('lists clusters with stageIds and normalized infos', async () => {
    const record = makeClusterListRecord({ infos: null })
    prismaMock.cluster.findMany.mockResolvedValue([record])

    const result = await Effect.runPromise(service.listClusters())

    expect(result).toEqual([{
      id: record.id,
      label: record.label,
      infos: '',
      clusterResources: record.clusterResources,
      privacy: record.privacy,
      zoneId: record.zoneId,
      cpu: record.cpu,
      gpu: record.gpu,
      memory: record.memory,
      stageIds: [record.stages[0].id],
    }])
  })

  it('passes the authorized user filter when listing clusters', async () => {
    prismaMock.cluster.findMany.mockResolvedValue([])

    const userId = faker.string.uuid()
    await Effect.runPromise(service.listClusters(userId))

    expect(prismaMock.cluster.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: expect.any(Array) },
    }))
  })

  it('maps cluster details to the contract shape', async () => {
    const record = makeClusterDetailsRecord({ infos: null })
    prismaMock.cluster.findUniqueOrThrow.mockResolvedValue(record)

    const result = await Effect.runPromise(service.getClusterDetails(record.id))

    expect(result).toEqual(expect.objectContaining({
      id: record.id,
      infos: '',
      projectIds: [record.projects[0].id],
      stageIds: [record.stages[0].id],
      kubeconfig: { cluster: record.kubeconfig.cluster, user: record.kubeconfig.user },
    }))
  })

  it('returns cluster usage from the aggregate', async () => {
    prismaMock.environment.aggregate.mockResolvedValue({
      _sum: { cpu: 1, gpu: 0, memory: 8 },
      _count: { _all: 1 },
      _avg: { cpu: null, gpu: null, memory: null },
      _min: { cpu: null, gpu: null, memory: null },
      _max: { cpu: null, gpu: null, memory: null },
    })

    const result = await Effect.runPromise(service.getClusterUsage(faker.string.uuid()))

    expect(result).toEqual({ cpu: 1, gpu: 0, memory: 8 })
  })

  it('creates a cluster, links projects and stages, and emits the hook', async () => {
    const cluster = makeCluster()
    const details = makeClusterDetailsRecord({ id: cluster.id })
    prismaMock.cluster.findUnique.mockResolvedValue(null)
    prismaMock.cluster.create.mockResolvedValue(cluster)
    prismaMock.cluster.update.mockResolvedValue(cluster)
    prismaMock.cluster.findUniqueOrThrow.mockResolvedValue(details)

    const result = await Effect.runPromise(service.createCluster(
      createClusterBody({ label: cluster.label }),
      faker.string.uuid(),
      faker.string.uuid(),
    ))

    expect(result.id).toEqual(details.id)
    expect(prismaMock.cluster.create).toHaveBeenCalled()
    expect(prismaMock.cluster.findUniqueOrThrow).toHaveBeenCalled()
  })

  it('rejects cluster creation when the label is already taken', async () => {
    prismaMock.cluster.findUnique.mockResolvedValue(makeCluster())

    const exit = await Effect.runPromiseExit(service.createCluster(
      createClusterBody({ label: 'taken' }),
      faker.string.uuid(),
      faker.string.uuid(),
    ))

    expect(exit._tag).toBe('Failure')
  })

  it('updates cluster fields and emits the hook', async () => {
    const record = makeClusterDetailsRecord()
    prismaMock.cluster.findUnique.mockResolvedValue(record)
    prismaMock.cluster.update.mockResolvedValue(record)
    prismaMock.cluster.findUniqueOrThrow.mockResolvedValue(record)

    const result = await Effect.runPromise(service.updateCluster({ label: 'new-label' }, record.id, faker.string.uuid(), faker.string.uuid()))

    expect(result.id).toEqual(record.id)
    expect(prismaMock.cluster.update).toHaveBeenCalled()
  })

  it('rejects updating a missing cluster', async () => {
    prismaMock.cluster.findUnique.mockResolvedValue(null)

    const exit = await Effect.runPromiseExit(service.updateCluster({ label: 'new' }, faker.string.uuid(), faker.string.uuid(), faker.string.uuid()))

    expect(exit._tag).toBe('Failure')
  })

  it('deletes a cluster when no environments are deployed', async () => {
    const record = makeClusterListRecord()
    prismaMock.environment.findFirst.mockResolvedValue(null)
    prismaMock.cluster.delete.mockResolvedValue(record)

    const message = await Effect.runPromise(service.deleteCluster({ clusterId: record.id, userId: faker.string.uuid(), requestId: faker.string.uuid() }))

    expect(message).toBeNull()
    expect(prismaMock.cluster.delete).toHaveBeenCalledWith({ where: { id: expect.any(String) } })
  })

  it('rejects cluster deletion when environments are deployed', async () => {
    prismaMock.environment.findFirst.mockResolvedValue(makeEnvironment())

    const exit = await Effect.runPromiseExit(service.deleteCluster({ clusterId: faker.string.uuid(), userId: faker.string.uuid(), requestId: faker.string.uuid() }))

    expect(exit._tag).toBe('Failure')
    if (exit._tag === 'Failure') {
      expect(JSON.stringify(exit.cause)).toContain('EnvironmentsActive')
    }
  })

  it('maps cluster environments for the contract response', async () => {
    const envs = [makeClusterEnvironmentsRecord(), makeClusterEnvironmentsRecord()]
    prismaMock.environment.findMany.mockResolvedValue(envs)

    const result = await Effect.runPromise(service.getClusterAssociatedEnvironments(faker.string.uuid()))

    expect(result).toEqual(envs.map(env => ({
      project: env.project.name,
      name: env.name,
      owner: env.project.owner.email,
      cpu: env.cpu,
      gpu: env.gpu,
      memory: env.memory,
    })))
  })

  it('propagates upsert hook failure', async () => {
    const record = makeClusterDetailsRecord()
    prismaMock.cluster.findUnique.mockResolvedValue(record as never)
    prismaMock.cluster.update.mockResolvedValue(record as never)
    prismaMock.zone.update.mockResolvedValue(record as never)
    prismaMock.cluster.findUniqueOrThrow.mockResolvedValue(record as never)

    const failingService = new ClusterService(
      prismaMock as never,
      { emitAsync: vi.fn().mockRejectedValue(new Error('hook down')) } as never,
      { addLog: vi.fn().mockResolvedValue(undefined) } as never,
      {} as never,
    )

    const exit = await Effect.runPromiseExit(failingService.updateCluster({ infos: 'x' }, record.id, 'u', 'r'))

    expect(exit._tag).toBe('Failure')
  })
})
