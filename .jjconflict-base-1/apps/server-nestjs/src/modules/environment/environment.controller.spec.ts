import type { CreateEnvironment, UpdateEnvironment } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { FastifyRequest } from 'fastify'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { makeEnvironment, makeEnvironmentWithStage } from './environment-testing.utils'
import { EnvironmentController } from './environment.controller'
import { EnvironmentService } from './environment.service'

describe('environmentController', () => {
  let module: TestingModule
  let controller: EnvironmentController
  let service: DeepMockProxy<EnvironmentService>

  const projectId = '11111111-1111-1111-1111-111111111111'
  const userId = 'user-uuid-1234'
  const requestId = 'request-uuid-5678'

  const project: ProjectContext = { id: projectId, slug: 'my-project' }
  const user: UserContext = { userId }
  const request = { id: requestId } as FastifyRequest

  const validCreateEnvironment = {
    name: 'dev',
    clusterId: '22222222-2222-2222-2222-222222222222',
    stageId: '33333333-3333-3333-3333-333333333333',
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
    service = mockDeep<EnvironmentService>()

    module = await Test.createTestingModule({
      controllers: [EnvironmentController],
      providers: [
        { provide: EnvironmentService, useValue: service },
      ],
    })
      .overrideGuard(ProjectGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<EnvironmentController>(EnvironmentController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('list', () => {
    it('should call environmentService.listByProjectId with projectId', async () => {
      const expectedResult = [makeEnvironmentWithStage({ projectId })]

      service.listByProjectId.mockResolvedValue(expectedResult)

      const result = await controller.list(project)

      expect(service.listByProjectId).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('create', () => {
    it('should validate body and call environmentService.createEnvironment', async () => {
      const expectedResult = makeEnvironment({ projectId })

      service.createEnvironment.mockResolvedValue(expectedResult)

      const result = await controller.create(validCreateEnvironment, project, user, request)

      expect(service.createEnvironment).toHaveBeenCalledWith(
        projectId,
        validCreateEnvironment,
        userId,
        requestId,
      )
      expect(result).toEqual(expectedResult)
    })
  })

  describe('update', () => {
    it('should validate body and call environmentService.updateEnvironment', async () => {
      const environmentId = '44444444-4444-4444-4444-444444444444'
      const expectedResult = makeEnvironment({ id: environmentId, projectId })

      service.updateEnvironment.mockResolvedValue(expectedResult)

      const result = await controller.update(environmentId, validUpdateEnvironment, project, user, request)

      expect(service.updateEnvironment).toHaveBeenCalledWith(
        projectId,
        environmentId,
        validUpdateEnvironment,
        userId,
        requestId,
      )
      expect(result).toEqual(expectedResult)
    })
  })

  describe('delete', () => {
    it('should call environmentService.deleteEnvironment with environmentId', async () => {
      const environmentId = '44444444-4444-4444-4444-444444444444'

      service.deleteEnvironment.mockResolvedValue(undefined)

      const result = await controller.delete(environmentId, project, user, request)

      expect(service.deleteEnvironment).toHaveBeenCalledWith(projectId, environmentId, userId, requestId)
      expect(result).toBeUndefined()
    })
  })
})
