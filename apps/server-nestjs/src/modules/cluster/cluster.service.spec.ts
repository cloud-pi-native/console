import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { baseConfigFactory } from '../../config/base.config'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import {
  makeCluster,
  makeClusterDetailsRecord,
  makeClusterEnvironmentsRecord,
  makeClusterListRecord,
  makeEnvironment,
} from './cluster-testing.utils'
import { ClusterService } from './cluster.service'

describe('ClusterService', () => {
  let service: ClusterService
  let prisma: DeepMockProxy<PrismaService>
  let logs: DeepMockProxy<LogService>
  let events: DeepMockProxy<EventEmitter2>
  let baseConfig: DeepMockProxy<ConfigType<typeof baseConfigFactory>>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    logs = mockDeep<LogService>()
    events = mockDeep<EventEmitter2>()
    baseConfig = mockDeep<ConfigType<typeof baseConfigFactory>>()

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClusterService,
        { provide: PrismaService, useValue: prisma },
        { provide: LogService, useValue: logs },
        { provide: EventEmitter2, useValue: events },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
      ],
    }).compile()

    service = moduleRef.get(ClusterService)
  })

  it('lists clusters with stageIds and normalized infos', async () => {
    const record = makeClusterListRecord({ infos: null })
    prisma.cluster.findMany.mockResolvedValue([record])

    const result = await service.listClusters()

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
    prisma.cluster.findMany.mockResolvedValue([])

    const userId = faker.string.uuid()
    await service.listClusters(userId)

    expect(prisma.cluster.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: expect.any(Array) },
    }))
  })

  it('maps cluster details to the contract shape', async () => {
    const record = makeClusterDetailsRecord({ infos: null })
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(record)

    const result = await service.getClusterDetails(record.id)

    expect(result).toEqual(expect.objectContaining({
      id: record.id,
      infos: '',
      projectIds: [record.projects[0].id],
      stageIds: [record.stages[0].id],
      kubeconfig: { cluster: record.kubeconfig.cluster, user: record.kubeconfig.user },
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

    const result = await service.getClusterUsage(faker.string.uuid())

    expect(result).toEqual(usage)
  })

  it('creates a cluster, links projects and stages, and emits the hook', async () => {
    const record = makeClusterListRecord()
    const cluster = makeCluster()
    const details = makeClusterDetailsRecord()
    prisma.cluster.findUnique.mockResolvedValue(null)
    prisma.cluster.create.mockResolvedValue(cluster)
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(details)

    const result = await service.createCluster(
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
    )

    expect(result.id).toEqual(details.id)
    expect(prisma.cluster.create).toHaveBeenCalled()
    expect(prisma.cluster.update).toHaveBeenCalled()
    expect(events.emitAsync).toHaveBeenCalledWith('cluster.upsert', expect.objectContaining({ clusterId: cluster.id }))
    expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'Create Cluster' }))
  })

  it('rejects cluster creation when the label is already taken', async () => {
    prisma.cluster.findUnique.mockResolvedValue(makeCluster())

    await expect(
      service.createCluster(
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
      ),
    ).rejects.toThrow('Ce label existe déjà')
  })

  it('updates cluster fields and emits the hook', async () => {
    const record = makeClusterDetailsRecord()
    prisma.cluster.findUnique.mockResolvedValue(record)
    prisma.cluster.update.mockResolvedValue(record)
    prisma.cluster.findUniqueOrThrow.mockResolvedValue(record)

    const result = await service.updateCluster(
      { label: 'new-label' },
      record.id,
      faker.string.uuid(),
      faker.string.uuid(),
    )

    expect(result.id).toEqual(record.id)
    expect(prisma.cluster.update).toHaveBeenCalled()
    expect(events.emitAsync).toHaveBeenCalledWith('cluster.upsert', expect.objectContaining({ clusterId: record.id }))
    expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'Update Cluster' }))
  })

  it('rejects updating a missing cluster', async () => {
    prisma.cluster.findUnique.mockResolvedValue(null)

    await expect(
      service.updateCluster({ label: 'new' }, faker.string.uuid(), faker.string.uuid(), faker.string.uuid()),
    ).rejects.toThrow('Cluster not found')
  })

  it('deletes a cluster when no environments are deployed', async () => {
    const record = makeClusterListRecord()
    prisma.environment.findFirst.mockResolvedValue(null)
    prisma.cluster.delete.mockResolvedValue(record)

    const message = await service.deleteCluster({
      clusterId: record.id,
      userId: faker.string.uuid(),
      requestId: faker.string.uuid(),
    })

    expect(message).toBeNull()
    expect(prisma.cluster.delete).toHaveBeenCalledWith({ where: { id: record.id } })
    expect(events.emitAsync).toHaveBeenCalledWith('cluster.delete', expect.objectContaining({ clusterId: record.id }))
    expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'Delete Cluster' }))
  })

  it('rejects cluster deletion when environments are deployed', async () => {
    prisma.environment.findFirst.mockResolvedValue(makeEnvironment())

    await expect(
      service.deleteCluster({
        clusterId: faker.string.uuid(),
        userId: faker.string.uuid(),
        requestId: faker.string.uuid(),
      }),
    ).rejects.toThrow('Impossible de supprimer le cluster')
  })

  it('maps cluster environments for the contract response', async () => {
    const envs = [makeClusterEnvironmentsRecord(), makeClusterEnvironmentsRecord()]
    prisma.environment.findMany.mockResolvedValue(envs)

    const result = await service.getClusterAssociatedEnvironments(faker.string.uuid())

    expect(result).toEqual(envs.map(env => ({
      project: env.project.name,
      name: env.name,
      owner: env.project.owner.email,
      cpu: env.cpu,
      gpu: env.gpu,
      memory: env.memory,
    })))
  })
})
