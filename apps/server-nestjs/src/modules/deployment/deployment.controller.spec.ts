import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeploymentController } from './deployment.controller.js'
import { DeploymentService } from './deployment.service.js'

// Global mock for DeploymentService
const mockDeploymentService = {
  listByProjectId: vi.fn(),
  createDeployment: vi.fn(),
  updateDeployment: vi.fn(),
  deleteDeployment: vi.fn(),
}

describe('deploymentController', () => {
  let module: TestingModule
  let controller: DeploymentController

  const validCreateDeployment = {
    name: 'dev',
    projectId: '11111111-1111-1111-1111-111111111111',
    environmentId: '22222222-2222-2222-2222-222222222222',
    cpu: 1,
    gpu: 0,
    memory: 512,
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
    vi.clearAllMocks()

    module = await Test.createTestingModule({
      controllers: [DeploymentController],
      providers: [
        {
          provide: DeploymentService,
          useValue: mockDeploymentService,
        },
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

      mockDeploymentService.listByProjectId.mockResolvedValue(expectedResult)

      const result = await controller.list(projectId)

      expect(mockDeploymentService.listByProjectId).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('create', () => {
    it('should validate body and call deploymentService.createDeployment', async () => {
      const expectedResult = { id: 'new-deployment-id' }

      mockDeploymentService.createDeployment.mockResolvedValue(expectedResult)

      const result = await controller.create(validCreateDeployment)

      expect(mockDeploymentService.createDeployment).toHaveBeenCalledWith(
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

      mockDeploymentService.updateDeployment.mockResolvedValue(expectedResult)

      const result = await controller.update(deploymentId, validUpdateDeployment)

      expect(mockDeploymentService.updateDeployment).toHaveBeenCalledWith(
        deploymentId,
        validUpdateDeployment,
      )
      expect(result).toEqual(expectedResult)
    })
  })

  describe('delete', () => {
    it('should call deploymentService.deleteDeployment with deploymentId', async () => {
      const deploymentId = '55555555-5555-5555-5555-555555555555'

      mockDeploymentService.deleteDeployment.mockResolvedValue(undefined)

      const result = await controller.delete(deploymentId)

      expect(mockDeploymentService.deleteDeployment).toHaveBeenCalledWith(deploymentId)
      expect(result).toBeUndefined()
    })
  })
})
