import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { ProjectExecutionContext } from '../infrastructure/permission/project/project-context.decorator'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { makeDeployment, makeDeploymentWithRelations } from './deployment-testing.utils'
import { DeploymentController } from './deployment.controller'
import { DeploymentService } from './deployment.service'

describe('deploymentController', () => {
  let module: TestingModule
  let controller: DeploymentController
  let service: DeepMockProxy<DeploymentService>

  const projectCtx: ProjectExecutionContext = {
    projectId: '11111111-1111-1111-1111-111111111111',
    userId: 'user-uuid-1234',
    requestId: 'request-uuid-5678',
  }

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
    service = mockDeep<DeploymentService>()

    module = await Test.createTestingModule({
      controllers: [DeploymentController],
      providers: [
        { provide: DeploymentService, useValue: service },
      ],
    })
      .overrideGuard(ProjectGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<DeploymentController>(DeploymentController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('list', () => {
    it('should call deploymentService.listByProjectId with projectId', async () => {
      const projectId = '11111111-1111-1111-1111-111111111111'
      const expectedResult = [makeDeploymentWithRelations({ projectId })]

      service.listByProjectId.mockResolvedValue(expectedResult)

      const result = await controller.list(projectId)

      expect(service.listByProjectId).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('create', () => {
    it('should validate body and call deploymentService.createDeployment', async () => {
      const expectedResult = makeDeployment()

      service.createDeployment.mockResolvedValue(expectedResult)

      const result = await controller.create(validCreateDeployment, projectCtx)

      expect(service.createDeployment).toHaveBeenCalledWith(
        projectCtx,
        validCreateDeployment,
      )
      expect(result).toEqual(expectedResult)
    })
  })

  describe('update', () => {
    it('should validate body and call deploymentService.updateDeployment', async () => {
      const deploymentId = '55555555-5555-5555-5555-555555555555'
      const expectedResult = makeDeployment({ id: deploymentId })

      service.updateDeployment.mockResolvedValue(expectedResult)

      const result = await controller.update(deploymentId, validUpdateDeployment, projectCtx)

      expect(service.updateDeployment).toHaveBeenCalledWith(
        projectCtx,
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

      const result = await controller.delete(deploymentId, projectCtx)

      expect(service.deleteDeployment).toHaveBeenCalledWith(projectCtx, deploymentId)
      expect(result).toBeUndefined()
    })
  })
})
