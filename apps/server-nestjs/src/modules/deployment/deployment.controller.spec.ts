import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { DeploymentController } from './deployment.controller'
import { DeploymentService } from './deployment.service'

describe('deploymentController', () => {
  let module: TestingModule
  let controller: DeploymentController
  let service: DeepMockProxy<DeploymentService>

  beforeEach(async () => {
    service = mockDeep<DeploymentService>()

    module = await Test.createTestingModule({
      controllers: [DeploymentController],
      providers: [
        { provide: DeploymentService, useValue: service },
      ],
    }).compile()

    controller = module.get<DeploymentController>(DeploymentController)
  })

  const validCreateDeployment = {
    name: 'dev',
    projectId: '11111111-1111-1111-1111-111111111111',
    environmentId: '22222222-2222-2222-2222-222222222222',
    autosync: true,
    deploymentSources: [
      {
        repositoryId: '33333333-3333-3333-3333-333333333333',
        type: 'git',
        targetRevision: 'main',
        path: '/app',
      },
    ],
  } satisfies CreateDeployment

  const validUpdateDeployment = {
    ...validCreateDeployment,
    deploymentSources: [
      {
        id: '44444444-4444-4444-4444-444444444444',
        repositoryId: '33333333-3333-3333-3333-333333333333',
        type: 'git',
        targetRevision: 'develop',
        path: '/updated-app',
      },
    ],
  } satisfies UpdateDeployment

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [DeploymentController],
      providers: [
        { provide: DeploymentService, useValue: service },
      ],
    }).compile()

    controller = module.get<DeploymentController>(DeploymentController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('list', () => {
    it('should call deploymentService.listByProjectId with projectId', async () => {
      const projectId = '11111111-1111-1111-1111-111111111111'
      const expectedResult = [{ id: 'deployment-1' }]

      service.listByProjectId.mockResolvedValue(expectedResult)

      const result = await controller.list(projectId)

      expect(service.listByProjectId).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('create', () => {
    it('should validate body and call deploymentService.createDeployment', async () => {
      const expectedResult = { id: 'new-deployment-id' }

      service.createDeployment.mockResolvedValue(expectedResult)

      const result = await controller.create(validCreateDeployment)

      expect(service.createDeployment).toHaveBeenCalledWith(
        validCreateDeployment.projectId,
        validCreateDeployment,
      )
      expect(result).toEqual(expectedResult)
    })
  })

  describe('update', () => {
    it('should validate body and call deploymentService.updateDeployment', async () => {
      const deploymentId = '55555555-5555-5555-5555-555555555555'
      const expectedResult = { id: deploymentId }

      service.updateDeployment.mockResolvedValue(expectedResult)

      const result = await controller.update(deploymentId, validUpdateDeployment)

      expect(service.updateDeployment).toHaveBeenCalledWith(
        deploymentId,
        validUpdateDeployment,
      )
      expect(result).toEqual(expectedResult)
    })
  })

  describe('delete', () => {
    it('should call deploymentService.deleteDeployment with deploymentId', async () => {
      const deploymentId = '55555555-5555-5555-5555-555555555555'

      service.deleteDeployment.mockResolvedValue(undefined)

      const result = await controller.delete(deploymentId)

      expect(service.deleteDeployment).toHaveBeenCalledWith(deploymentId)
      expect(result).toBeUndefined()
    })
  })
})
