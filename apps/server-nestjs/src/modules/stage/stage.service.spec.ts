import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeCluster } from '../environment/environment-testing.utils'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { makeStageEnvironmentRecord, makeStageRecord, makeStageWithClusters } from './stage-testing.utils'
import { StageService } from './stage.service'

describe('stageService', () => {
  let service: StageService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    prisma.$transaction.mockImplementation(fn => fn(prisma))

    const moduleRef = await Test.createTestingModule({
      providers: [
        StageService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = moduleRef.get(StageService)
  })

  it('lists raw stage records', async () => {
    const stages = [makeStageWithClusters(), makeStageWithClusters()]
    prisma.stage.findMany.mockResolvedValue(stages)

    expect(await service.listStages()).toEqual(stages)
  })

  it('returns raw stage environment records', async () => {
    const environment = makeStageEnvironmentRecord()
    prisma.environment.findMany.mockResolvedValue([environment])

    expect(await service.getStageAssociatedEnvironments(faker.string.uuid())).toEqual([environment])
  })

  it('creates a stage and links clusters', async () => {
    const stage = makeStageRecord()
    const created = makeStageWithClusters({ id: stage.id, name: stage.name })
    prisma.stage.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(created)
    prisma.stage.create.mockResolvedValue(stage)
    prisma.stage.update.mockResolvedValue(stage)

    const clusterIds = [faker.string.uuid()]
    const result = await service.createStage({ name: stage.name, clusterIds })

    expect(result).toEqual(created)
    expect(prisma.stage.create).toHaveBeenCalledWith({ data: { name: stage.name }, select: expect.anything() })
    expect(prisma.stage.update).toHaveBeenCalled()
  })

  it('rejects stage creation when the name is taken', async () => {
    prisma.stage.findUnique.mockResolvedValue(makeStageRecord())

    await expect(
      service.createStage({ name: 'taken', clusterIds: [] }),
    ).rejects.toThrow('Un type d\'environnement portant ce nom existe déjà')
  })

  it('updates stage name and cluster links', async () => {
    const stage = makeStageWithClusters()
    prisma.stage.findUnique.mockResolvedValue(stage)
    prisma.stage.update.mockResolvedValue(stage)

    const clusterIds = [faker.string.uuid()]
    const result = await service.updateStage(stage.id, { name: 'new-name', clusterIds })

    expect(result.id).toEqual(stage.id)
    expect(prisma.stage.update).toHaveBeenCalled()
  })

  it('rejects updating a missing stage', async () => {
    prisma.stage.findUnique.mockResolvedValue(null)

    await expect(
      service.updateStage(faker.string.uuid(), { name: 'new', clusterIds: [] }),
    ).rejects.toThrow()
  })

  it('deletes a stage when no environments are attached', async () => {
    prisma.environment.count.mockResolvedValue(0)
    prisma.stage.delete.mockResolvedValue(makeStageRecord())

    await service.deleteStage(faker.string.uuid())

    expect(prisma.stage.delete).toHaveBeenCalled()
  })

  it('rejects stage deletion when environments are attached', async () => {
    prisma.environment.count.mockResolvedValue(3)

    await expect(
      service.deleteStage(faker.string.uuid()),
    ).rejects.toThrow('Impossible de supprimer le stage')
  })

  it('links a cluster to all stages when linkToAll is set', async () => {
    prisma.stage.findMany.mockResolvedValue([makeStageRecord(), makeStageRecord()])
    prisma.cluster.update.mockResolvedValue(makeCluster())

    const clusterId = faker.string.uuid()
    await service.linkClusterToStages(clusterId, [], true)

    expect(prisma.stage.findMany).toHaveBeenCalled()
    expect(prisma.cluster.update).toHaveBeenCalled()
  })

  it('links nothing when stageIds is empty and linkToAll is not set', async () => {
    prisma.stage.findMany.mockResolvedValue([makeStageRecord(), makeStageRecord()])
    prisma.cluster.update.mockResolvedValue(makeCluster())

    const clusterId = faker.string.uuid()
    await service.linkClusterToStages(clusterId, [])

    expect(prisma.stage.findMany).not.toHaveBeenCalled()
    expect(prisma.cluster.update).toHaveBeenCalledWith(expect.objectContaining({ data: { stages: { connect: [] } } }))
  })
})
