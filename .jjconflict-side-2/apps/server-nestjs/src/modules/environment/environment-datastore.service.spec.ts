import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { EnvironmentDatastoreService } from './environment-datastore.service'
import { makeCluster, makeEnvironment, makeStage } from './environment-testing.utils'

describe('environmentDatastoreService', () => {
  let module: TestingModule
  let service: EnvironmentDatastoreService
  let prisma: DeepMockProxy<PrismaService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        EnvironmentDatastoreService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(EnvironmentDatastoreService)
  })

  describe('getProjectEnvironment', () => {
    it('should return an environment with its cluster scoped to the project', async () => {
      const environment = makeEnvironment({ id: 'env1', projectId: 'project1' })
      prisma.environment.findFirst.mockResolvedValue(environment)

      const result = await service.getProjectEnvironment('project1', 'env1')

      expect(prisma.environment.findFirst).toHaveBeenCalledWith({
        where: { id: 'env1', projectId: 'project1' },
        include: { cluster: true },
      })
      expect(result).toEqual(environment)
    })
  })

  describe('getEnvironmentsByProjectId', () => {
    it('should return environments for a project with their stage', async () => {
      const environments = [makeEnvironment({ projectId: 'project1' })]
      prisma.environment.findMany.mockResolvedValue(environments)

      const result = await service.getEnvironmentsByProjectId('project1')

      expect(prisma.environment.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project1' },
        include: { stage: true },
      })
      expect(result).toEqual(environments)
    })
  })

  describe('getEnvironmentByName', () => {
    it('should look the environment up by its project unique name', async () => {
      prisma.environment.findUnique.mockResolvedValue(null)

      const result = await service.getEnvironmentByName('project1', 'dev')

      expect(prisma.environment.findUnique).toHaveBeenCalledWith({
        where: { projectId_name: { projectId: 'project1', name: 'dev' } },
      })
      expect(result).toBeNull()
    })
  })

  describe('getStageById', () => {
    it('should return the stage', async () => {
      const stage = makeStage({ id: 'stage1' })
      prisma.stage.findUnique.mockResolvedValue(stage)

      const result = await service.getStageById('stage1')

      expect(prisma.stage.findUnique).toHaveBeenCalledWith({ where: { id: 'stage1' } })
      expect(result).toEqual(stage)
    })
  })

  describe('getProdStageIds', () => {
    it('should return the ids of the prod stages', async () => {
      prisma.stage.findMany.mockResolvedValue([makeStage({ id: 'stage1', name: 'prod' })])

      await service.getProdStageIds()

      expect(prisma.stage.findMany).toHaveBeenCalledWith({
        select: { id: true },
        where: { name: 'prod' },
      })
    })
  })

  describe('getAvailableCluster', () => {
    it('should only match public clusters or dedicated clusters of the project', async () => {
      const cluster = makeCluster({ id: 'cluster1' })
      prisma.cluster.findFirst.mockResolvedValue(cluster)

      const result = await service.getAvailableCluster('cluster1', 'project1')

      expect(prisma.cluster.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{
            id: 'cluster1',
            privacy: 'public',
          }, {
            id: 'cluster1',
            privacy: 'dedicated',
            projects: { some: { id: 'project1' } },
          }],
        },
      })
      expect(result).toEqual(cluster)
    })
  })

  describe('sumEnvironmentResources', () => {
    it('should aggregate cpu, gpu and memory', async () => {
      await service.sumEnvironmentResources({ clusterId: 'cluster1' })

      expect(prisma.environment.aggregate).toHaveBeenCalledWith({
        _sum: {
          cpu: true,
          gpu: true,
          memory: true,
        },
        where: { clusterId: 'cluster1' },
      })
    })
  })

  describe('createEnvironment', () => {
    it('should create an environment', async () => {
      const environment = makeEnvironment()
      prisma.environment.create.mockResolvedValue(environment)

      const result = await service.createEnvironment({
        projectId: environment.projectId,
        name: environment.name,
        clusterId: environment.clusterId,
        stageId: environment.stageId,
        cpu: environment.cpu,
        gpu: environment.gpu,
        memory: environment.memory,
        autosync: environment.autosync,
      })

      expect(prisma.environment.create).toHaveBeenCalled()
      expect(result).toEqual(environment)
    })
  })

  describe('updateEnvironment', () => {
    it('should update the environment resources', async () => {
      const environment = makeEnvironment({ id: 'env1' })
      prisma.environment.update.mockResolvedValue(environment)

      const result = await service.updateEnvironment('env1', { cpu: 2, gpu: 0, memory: 4, autosync: false })

      expect(prisma.environment.update).toHaveBeenCalledWith({
        where: { id: 'env1' },
        data: { cpu: 2, gpu: 0, memory: 4, autosync: false },
      })
      expect(result).toEqual(environment)
    })
  })

  describe('deleteEnvironment', () => {
    it('should delete the environment', async () => {
      const environment = makeEnvironment({ id: 'env1' })
      prisma.environment.delete.mockResolvedValue(environment)

      const result = await service.deleteEnvironment('env1')

      expect(prisma.environment.delete).toHaveBeenCalledWith({ where: { id: 'env1' } })
      expect(result).toEqual(environment)
    })
  })
})
