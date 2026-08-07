import type { CreateRepository, UpdateRepository } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { FastifyRequest } from 'fastify'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { makeRepository } from './repository-testing.utils'
import { RepositoryController } from './repository.controller'
import { RepositoryService } from './repository.service'

describe('repositoryController', () => {
  let module: TestingModule
  let controller: RepositoryController
  let service: DeepMockProxy<RepositoryService>

  let projectId: string
  let repositoryId: string
  let userId: string
  let requestId: string
  let projectSlug: string
  let project: ProjectContext
  let user: UserContext
  let request: FastifyRequest
  let validCreateRepository: CreateRepository
  let validUpdateRepository: UpdateRepository

  beforeEach(async () => {
    projectId = faker.string.uuid()
    repositoryId = faker.string.uuid()
    userId = faker.string.uuid()
    requestId = faker.string.uuid()
    projectSlug = faker.string.alphanumeric(8).toLowerCase()
    project = { id: projectId, slug: projectSlug }
    user = { userId }
    request = { id: requestId } as FastifyRequest
    validCreateRepository = {
      internalRepoName: faker.string.alphanumeric(8).toLowerCase(),
      externalRepoUrl: '',
      isInfra: false,
      isPrivate: false,
      deployRevision: 'HEAD',
      deployPath: '.',
      helmValuesFiles: '',
    }
    validUpdateRepository = {
      isPrivate: false,
      deployRevision: faker.git.branch(),
    }

    service = mockDeep<RepositoryService>()

    module = await Test.createTestingModule({
      controllers: [RepositoryController],
      providers: [
        { provide: RepositoryService, useValue: service },
      ],
    })
      .overrideGuard(ProjectGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<RepositoryController>(RepositoryController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('list', () => {
    it('calls repositoryService.listByProjectId with the project id', async () => {
      const expectedResult = [makeRepository({ projectId })]
      service.listByProjectId.mockResolvedValue(expectedResult)

      const result = await controller.list(project)

      expect(service.listByProjectId).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('create', () => {
    it('calls repositoryService.createRepository with the body and request context', async () => {
      const expectedResult = makeRepository({ projectId })
      service.createRepository.mockResolvedValue(expectedResult)

      const result = await controller.create(validCreateRepository, project, user, request)

      expect(service.createRepository).toHaveBeenCalledWith(projectId, projectSlug, validCreateRepository, userId, requestId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('update', () => {
    it('calls repositoryService.updateRepository with the repository id, body and request context', async () => {
      const expectedResult = makeRepository({ id: repositoryId, projectId })
      service.updateRepository.mockResolvedValue(expectedResult)

      const result = await controller.update(repositoryId, validUpdateRepository, project, user, request)

      expect(service.updateRepository).toHaveBeenCalledWith(projectId, projectSlug, repositoryId, validUpdateRepository, userId, requestId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('sync', () => {
    it('calls repositoryService.syncRepository with the body and request context', async () => {
      const syncRequest = { syncAllBranches: false, branchName: faker.git.branch() }
      service.syncRepository.mockResolvedValue(undefined)

      const result = await controller.sync(repositoryId, syncRequest, project, user, request)

      expect(service.syncRepository).toHaveBeenCalledWith(projectId, projectSlug, repositoryId, syncRequest, userId, requestId)
      expect(result).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('calls repositoryService.deleteRepository with the repository id and request context', async () => {
      service.deleteRepository.mockResolvedValue(undefined)

      const result = await controller.delete(repositoryId, project, user, request)

      expect(service.deleteRepository).toHaveBeenCalledWith(projectId, repositoryId, userId, requestId)
      expect(result).toBeUndefined()
    })
  })
})
