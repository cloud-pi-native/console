import type { TestingModule } from '@nestjs/testing'
import type { Repository } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { RepositoryDatastoreService } from './repository-datastore.service'
import {
  makeExternalRepository,
  makeInternalRepository,
  stubRepositoryTable,
} from './repository-testing.utils'

describe('repositoryDatastoreService', () => {
  let module: TestingModule
  let service: RepositoryDatastoreService
  let prisma: DeepMockProxy<PrismaService>

  let projectId: string
  let rows: Repository[]

  beforeEach(async () => {
    projectId = faker.string.uuid()
    rows = []
    prisma = mockDeep<PrismaService>()
    stubRepositoryTable(prisma, () => rows)

    module = await Test.createTestingModule({
      providers: [
        RepositoryDatastoreService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(RepositoryDatastoreService)
  })

  describe('getRepositoriesByProjectId', () => {
    it('returns only the repositories of the given project', async () => {
      const mine = makeInternalRepository({ projectId })
      rows = [mine, makeInternalRepository()]

      const result = await service.getRepositoriesByProjectId(projectId)

      expect(result).toEqual([mine])
    })

    it('returns the repositories from the oldest to the most recently created', async () => {
      const oldest = makeInternalRepository({ projectId, createdAt: new Date('2024-01-01') })
      const middle = makeExternalRepository({ projectId, createdAt: new Date('2024-06-01') })
      const newest = makeInternalRepository({ projectId, createdAt: new Date('2025-02-01') })
      rows = [newest, oldest, middle]

      const result = await service.getRepositoriesByProjectId(projectId)

      expect(result).toEqual([oldest, middle, newest])
    })

    it('returns an empty list when the project has no repository', async () => {
      rows = [makeInternalRepository()]

      const result = await service.getRepositoriesByProjectId(projectId)

      expect(result).toEqual([])
    })
  })

  describe('getRepositoryById', () => {
    it('returns the repository matching the id', async () => {
      const repository = makeExternalRepository()
      prisma.repository.findUniqueOrThrow.mockResolvedValue(repository)

      const result = await service.getRepositoryById(repository.id)

      expect(result).toEqual(repository)
    })

    it('rejects when no repository matches the id', async () => {
      prisma.repository.findUniqueOrThrow.mockRejectedValue(new Error('No Repository found'))

      await expect(service.getRepositoryById(faker.string.uuid())).rejects.toThrow()
    })
  })

  describe('hasRepositoryWithName', () => {
    it('returns true when a repository with the internal name exists in the project', async () => {
      const repository = makeInternalRepository({ projectId })
      rows = [repository]

      const result = await service.hasRepositoryWithName(projectId, repository.internalRepoName)

      expect(result).toBe(true)
    })

    it('returns false when no repository with the internal name exists in the project', async () => {
      rows = [makeInternalRepository({ projectId })]

      const result = await service.hasRepositoryWithName(projectId, faker.string.alphanumeric(8).toLowerCase())

      expect(result).toBe(false)
    })

    it('returns false when the internal name is only taken in another project', async () => {
      const repository = makeInternalRepository()
      rows = [repository]

      const result = await service.hasRepositoryWithName(projectId, repository.internalRepoName)

      expect(result).toBe(false)
    })
  })

  describe('createRepository', () => {
    it('returns the created repository', async () => {
      const repository = makeInternalRepository({ projectId })
      prisma.repository.create.mockResolvedValue(repository)

      const result = await service.createRepository({
        projectId,
        internalRepoName: repository.internalRepoName,
      })

      expect(result).toEqual(repository)
    })
  })

  describe('updateRepository', () => {
    it('returns the updated repository', async () => {
      const repository = makeExternalRepository({ isPrivate: false })
      prisma.repository.update.mockResolvedValue(repository)

      const result = await service.updateRepository(repository.id, { isPrivate: false })

      expect(result).toEqual(repository)
    })
  })

  describe('deleteRepository', () => {
    it('returns the deleted repository', async () => {
      const repository = makeInternalRepository()
      prisma.repository.delete.mockResolvedValue(repository)

      const result = await service.deleteRepository(repository.id)

      expect(result).toEqual(repository)
    })
  })
})
