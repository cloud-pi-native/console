import type { CreateEnvironment, UpdateEnvironment } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AppEventsService } from '../events/app-events.service'
import { EnvironmentDatastoreService } from './environment-datastore.service'
import { makeEnvironment, makeEnvironmentWithCluster, makeEnvironmentWithStage } from './environment-testing.utils'
import { EnvironmentValidationService } from './environment-validation.service'
import { EnvironmentService } from './environment.service'

describe('environmentService', () => {
  let module: TestingModule
  let service: EnvironmentService
  let datastore: DeepMockProxy<EnvironmentDatastoreService>
  let validation: DeepMockProxy<EnvironmentValidationService>
  let appEvents: DeepMockProxy<AppEventsService>

  const projectId = '11111111-1111-1111-1111-111111111111'
  const userId = 'user-uuid-1234'
  const requestId = 'request-uuid-5678'
  const environmentId = '22222222-2222-2222-2222-222222222222'
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
    validation = mockDeep<EnvironmentValidationService>()
    appEvents = mockDeep<AppEventsService>()

    module = await Test.createTestingModule({
      providers: [
        EnvironmentService,
        { provide: EnvironmentDatastoreService, useValue: datastore },
        { provide: EnvironmentValidationService, useValue: validation },
        { provide: AppEventsService, useValue: appEvents },
      ],
    }).compile()

    service = module.get<EnvironmentService>(EnvironmentService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('listByProjectId', () => {
    it('should return environments by projectId', async () => {
      const environments = [makeEnvironmentWithStage({ id: environmentId, projectId })]
      datastore.getEnvironmentsByProjectId.mockResolvedValue(environments)

      const result = await service.listByProjectId(projectId)

      expect(datastore.getEnvironmentsByProjectId).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(environments)
    })
  })

  describe('createEnvironment', () => {
    it('should validate, create the environment and trigger the project reconciliation', async () => {
      const environment = makeEnvironment({ id: environmentId, projectId, clusterId, stageId })
      validation.validateCreate.mockResolvedValue(undefined)
      datastore.createEnvironment.mockResolvedValue(environment)
      appEvents.emitProjectEvent.mockResolvedValue({})

      const result = await service.createEnvironment(projectId, validCreateEnvironment, userId, requestId)

      expect(validation.validateCreate).toHaveBeenCalledWith(projectId, validCreateEnvironment)
      expect(datastore.createEnvironment).toHaveBeenCalledWith({
        projectId,
        name: validCreateEnvironment.name,
        clusterId,
        stageId,
        cpu: validCreateEnvironment.cpu,
        gpu: validCreateEnvironment.gpu,
        memory: validCreateEnvironment.memory,
        autosync: validCreateEnvironment.autosync,
      })
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, {
        action: 'Create Environment',
        userId,
        requestId,
      })
      expect(result).toEqual(environment)
    })

    it('should not create the environment when the validation fails', async () => {
      validation.validateCreate.mockRejectedValue(new BadRequestException('Cluster invalide.'))

      await expect(service.createEnvironment(projectId, validCreateEnvironment, userId, requestId))
        .rejects.toThrow(BadRequestException)
      expect(datastore.createEnvironment).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).not.toHaveBeenCalled()
    })
  })

  describe('updateEnvironment', () => {
    it('should validate, update the environment and trigger the project reconciliation', async () => {
      const existing = makeEnvironmentWithCluster({ id: environmentId, projectId })
      const updated = makeEnvironment({ id: environmentId, projectId, ...validUpdateEnvironment })
      datastore.getProjectEnvironment.mockResolvedValue(existing)
      validation.validateUpdate.mockResolvedValue(undefined)
      datastore.updateEnvironment.mockResolvedValue(updated)
      appEvents.emitProjectEvent.mockResolvedValue({})

      const result = await service.updateEnvironment(projectId, environmentId, validUpdateEnvironment, userId, requestId)

      expect(validation.validateUpdate).toHaveBeenCalledWith(existing, validUpdateEnvironment)
      expect(datastore.updateEnvironment).toHaveBeenCalledWith(environmentId, validUpdateEnvironment)
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, {
        action: 'Update Environment',
        userId,
        requestId,
      })
      expect(result).toEqual(updated)
    })

    it('should reject when the environment is not found in the project', async () => {
      datastore.getProjectEnvironment.mockResolvedValue(null)

      await expect(service.updateEnvironment(projectId, environmentId, validUpdateEnvironment, userId, requestId))
        .rejects.toThrow(NotFoundException)
      expect(datastore.getProjectEnvironment).toHaveBeenCalledWith(projectId, environmentId)
      expect(validation.validateUpdate).not.toHaveBeenCalled()
      expect(datastore.updateEnvironment).not.toHaveBeenCalled()
    })

    it('should not update the environment when the validation fails', async () => {
      datastore.getProjectEnvironment.mockResolvedValue(makeEnvironmentWithCluster({ id: environmentId, projectId }))
      validation.validateUpdate.mockRejectedValue(new BadRequestException('Le cluster ne dispose pas de suffisamment de ressources : CPU.'))

      await expect(service.updateEnvironment(projectId, environmentId, validUpdateEnvironment, userId, requestId))
        .rejects.toThrow(BadRequestException)
      expect(datastore.updateEnvironment).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).not.toHaveBeenCalled()
    })
  })

  describe('deleteEnvironment', () => {
    it('should delete the environment and trigger the project reconciliation', async () => {
      datastore.getProjectEnvironment.mockResolvedValue(makeEnvironmentWithCluster({ id: environmentId, projectId }))
      datastore.deleteEnvironment.mockResolvedValue(makeEnvironment({ id: environmentId, projectId }))
      appEvents.emitProjectEvent.mockResolvedValue({})

      await service.deleteEnvironment(projectId, environmentId, userId, requestId)

      expect(datastore.deleteEnvironment).toHaveBeenCalledWith(environmentId)
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, {
        action: 'Delete Environment',
        userId,
        requestId,
      })
    })

    it('should reject when the environment is not found in the project', async () => {
      datastore.getProjectEnvironment.mockResolvedValue(null)

      await expect(service.deleteEnvironment(projectId, environmentId, userId, requestId))
        .rejects.toThrow(NotFoundException)
      expect(datastore.getProjectEnvironment).toHaveBeenCalledWith(projectId, environmentId)
      expect(datastore.deleteEnvironment).not.toHaveBeenCalled()
    })
  })
})
