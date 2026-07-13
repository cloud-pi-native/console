import type { CreateEnvironment, UpdateEnvironment } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { BadRequestException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { EnvironmentDatastoreService } from './environment-datastore.service'
import { makeCluster, makeEnvironment, makeEnvironmentWithCluster, makeProject, makeStage } from './environment-testing.utils'
import { EnvironmentValidationService } from './environment-validation.service'

describe('environmentValidationService', () => {
  let module: TestingModule
  let service: EnvironmentValidationService
  let datastore: DeepMockProxy<EnvironmentDatastoreService>

  const projectId = '11111111-1111-1111-1111-111111111111'
  const clusterId = '33333333-3333-3333-3333-333333333333'
  const stageId = '44444444-4444-4444-4444-444444444444'

  const validCreateEnvironment = {
    name: 'dev',
    clusterId,
    stageId,
    cpu: 2,
    gpu: 0,
    memory: 4,
    autosync: true,
  } satisfies CreateEnvironment

  const validUpdateEnvironment = {
    cpu: 4,
    gpu: 1,
    memory: 8,
    autosync: false,
  } satisfies UpdateEnvironment

  beforeEach(async () => {
    datastore = mockDeep<EnvironmentDatastoreService>()

    module = await Test.createTestingModule({
      providers: [
        EnvironmentValidationService,
        { provide: EnvironmentDatastoreService, useValue: datastore },
      ],
    }).compile()

    service = module.get<EnvironmentValidationService>(EnvironmentValidationService)
  })

  describe('validateCreate', () => {
    it('should pass when the stage, name and cluster are valid and no limit applies', async () => {
      datastore.getStageById.mockResolvedValue(makeStage({ id: stageId }))
      datastore.getEnvironmentByName.mockResolvedValue(null)
      // cpu/memory at 0 means the cluster resources are not configured
      datastore.getAvailableCluster.mockResolvedValue(makeCluster({ id: clusterId, cpu: 0, memory: 0 }))
      datastore.getProjectById.mockResolvedValue(makeProject({ id: projectId, limitless: true }))

      await expect(service.validateCreate(projectId, validCreateEnvironment)).resolves.toBeUndefined()
    })

    it('should reject when the environment name is already taken', async () => {
      datastore.getStageById.mockResolvedValue(makeStage({ id: stageId }))
      datastore.getEnvironmentByName.mockResolvedValue(makeEnvironment({ projectId, name: validCreateEnvironment.name }))
      datastore.getAvailableCluster.mockResolvedValue(makeCluster({ id: clusterId }))
      datastore.getProjectById.mockResolvedValue(makeProject({ id: projectId }))

      await expect(service.validateCreate(projectId, validCreateEnvironment))
        .rejects.toThrow(BadRequestException)
    })

    it('should reject when the stage does not exist', async () => {
      datastore.getStageById.mockResolvedValue(null)
      datastore.getEnvironmentByName.mockResolvedValue(null)
      datastore.getAvailableCluster.mockResolvedValue(makeCluster({ id: clusterId }))
      datastore.getProjectById.mockResolvedValue(makeProject({ id: projectId, limitless: true }))

      await expect(service.validateCreate(projectId, validCreateEnvironment))
        .rejects.toThrow('Type d\'environnement invalide.')
    })

    it('should reject when the cluster is not available for the project', async () => {
      datastore.getStageById.mockResolvedValue(makeStage({ id: stageId }))
      datastore.getEnvironmentByName.mockResolvedValue(null)
      datastore.getAvailableCluster.mockResolvedValue(null)

      await expect(service.validateCreate(projectId, validCreateEnvironment))
        .rejects.toThrow('Cluster invalide.')
    })

    it('should reject when the cluster does not have enough resources', async () => {
      datastore.getStageById.mockResolvedValue(makeStage({ id: stageId }))
      datastore.getEnvironmentByName.mockResolvedValue(null)
      datastore.getAvailableCluster.mockResolvedValue(makeCluster({ id: clusterId, cpu: 4, gpu: 0, memory: 8 }))
      datastore.getProjectById.mockResolvedValue(makeProject({ id: projectId, limitless: true }))
      datastore.sumEnvironmentResources.mockResolvedValue({
        _sum: { cpu: 3, gpu: 0, memory: 6 },
      })

      await expect(service.validateCreate(projectId, validCreateEnvironment))
        .rejects.toThrow('Le cluster ne dispose pas de suffisamment de ressources : CPU, Mémoire.')
    })

    it('should reject when the project does not have enough prod resources', async () => {
      datastore.getStageById.mockResolvedValue(makeStage({ id: stageId, name: 'prod' }))
      datastore.getEnvironmentByName.mockResolvedValue(null)
      datastore.getAvailableCluster.mockResolvedValue(makeCluster({ id: clusterId, cpu: 0, memory: 0 }))
      datastore.getProjectById.mockResolvedValue(makeProject({
        id: projectId,
        limitless: false,
        prodCpu: 2,
        prodGpu: 0,
        prodMemory: 4,
      }))
      datastore.getProdStageIds.mockResolvedValue([{ id: stageId }])
      datastore.sumEnvironmentResources.mockResolvedValue({
        _sum: { cpu: 1, gpu: 0, memory: 2 },
      })

      await expect(service.validateCreate(projectId, validCreateEnvironment))
        .rejects.toThrow('Le projet ne dispose pas de suffisamment de ressources : CPU, Mémoire.')
    })

    it('should reject when the project does not have enough non-prod resources', async () => {
      datastore.getStageById.mockResolvedValue(makeStage({ id: stageId, name: 'dev' }))
      datastore.getEnvironmentByName.mockResolvedValue(null)
      datastore.getAvailableCluster.mockResolvedValue(makeCluster({ id: clusterId, cpu: 0, memory: 0 }))
      datastore.getProjectById.mockResolvedValue(makeProject({
        id: projectId,
        limitless: false,
        hprodCpu: 2,
        hprodGpu: 0,
        hprodMemory: 4,
      }))
      datastore.getProdStageIds.mockResolvedValue([{ id: '55555555-5555-5555-5555-555555555555' }])
      datastore.sumEnvironmentResources.mockResolvedValue({
        _sum: { cpu: 1, gpu: 0, memory: 2 },
      })

      await expect(service.validateCreate(projectId, validCreateEnvironment))
        .rejects.toThrow('Le projet ne dispose pas de suffisamment de ressources : CPU, Mémoire.')
    })
  })

  describe('validateUpdate', () => {
    it('should pass when the project is limitless and the cluster limits are not configured', async () => {
      const environment = makeEnvironmentWithCluster({
        projectId,
        cluster: makeCluster({ id: clusterId, cpu: 0, memory: 0 }),
      })
      datastore.getProjectById.mockResolvedValue(makeProject({ id: projectId, limitless: true }))

      await expect(service.validateUpdate(environment, validUpdateEnvironment)).resolves.toBeUndefined()
    })

    it('should reject when the cluster does not have enough resources', async () => {
      const environment = makeEnvironmentWithCluster({
        projectId,
        cluster: makeCluster({ id: clusterId, cpu: 4, gpu: 0, memory: 8 }),
      })
      datastore.getProjectById.mockResolvedValue(makeProject({ id: projectId, limitless: true }))
      datastore.sumEnvironmentResources.mockResolvedValue({
        _sum: { cpu: 3, gpu: 0, memory: 6 },
      })

      await expect(service.validateUpdate(environment, validUpdateEnvironment))
        .rejects.toThrow('Le cluster ne dispose pas de suffisamment de ressources : CPU, GPU, Mémoire.')
    })
  })
})
