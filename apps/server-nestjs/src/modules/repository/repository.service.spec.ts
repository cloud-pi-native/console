import type { CreateRepository, UpdateRepository } from '@cpn-console/shared'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AppEventsService } from '../events/app-events.service'
import { VaultClientService } from '../vault/vault-client.service'
import { RepositoryDatastoreService } from './repository-datastore.service'
import { makeRepository } from './repository-testing.utils'
import { RepositoryService } from './repository.service'

describe('repositoryService', () => {
  let module: TestingModule
  let service: RepositoryService
  let datastore: DeepMockProxy<RepositoryDatastoreService>
  let appEvents: DeepMockProxy<AppEventsService>
  let vault: DeepMockProxy<VaultClientService>

  let projectId: string
  let projectSlug: string
  let repositoryId: string
  let userId: string
  let requestId: string
  let validCreateRepository: CreateRepository
  let validUpdateRepository: UpdateRepository

  beforeEach(async () => {
    projectId = faker.string.uuid()
    projectSlug = faker.string.alphanumeric(8).toLowerCase()
    repositoryId = faker.string.uuid()
    userId = faker.string.uuid()
    requestId = faker.string.uuid()
    validCreateRepository = {
      internalRepoName: faker.string.alphanumeric(8).toLowerCase(),
      externalRepoUrl: `https://${faker.internet.domainName()}/repo.git`,
      externalUserName: faker.internet.username(),
      externalToken: faker.string.alphanumeric(16),
      isInfra: false,
      isPrivate: true,
      deployRevision: 'HEAD',
      deployPath: '.',
      helmValuesFiles: '',
    }
    validUpdateRepository = {
      isPrivate: false,
      deployRevision: faker.git.branch(),
    }

    datastore = mockDeep<RepositoryDatastoreService>()
    appEvents = mockDeep<AppEventsService>()
    vault = mockDeep<VaultClientService>()
    // Creating a repository with an external source fires a sync; give every test a
    // resolving default so only the tests that assert on it have to care.
    appEvents.emitRepositoryEvent.mockResolvedValue({})

    module = await Test.createTestingModule({
      providers: [
        RepositoryService,
        { provide: RepositoryDatastoreService, useValue: datastore },
        { provide: AppEventsService, useValue: appEvents },
        { provide: VaultClientService, useValue: vault },
      ],
    }).compile()

    service = module.get<RepositoryService>(RepositoryService)
  })

  const failedReconciliation = {
    gitlab: { status: 'KO', message: 'Unable to provision repository', executionTime: 1, error: new Error('boom') },
  } as const

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('listByProjectId', () => {
    it('returns the repositories of the project', async () => {
      const repositories = [
        makeRepository({ projectId, internalRepoName: 'alpha' }),
        makeRepository({ projectId, internalRepoName: 'bravo' }),
        makeRepository({ projectId, internalRepoName: 'charlie' }),
      ]
      datastore.getRepositoriesByProjectId.mockResolvedValue(repositories)

      const result = await service.listByProjectId(projectId)

      expect(datastore.getRepositoriesByProjectId).toHaveBeenCalledWith(projectId)
      expect(result).toEqual(repositories)
    })
  })

  describe('createRepository', () => {
    it('creates a private repository, seeds the mirror token in Vault before reconciling', async () => {
      const repository = makeRepository({ id: repositoryId, projectId, internalRepoName: validCreateRepository.internalRepoName, isPrivate: true })
      datastore.hasRepositoryWithName.mockResolvedValue(false)
      datastore.createRepository.mockResolvedValue(repository)
      vault.writeGitlabMirrorCreds.mockResolvedValue(undefined)
      appEvents.emitProjectEvent.mockResolvedValue({})

      const result = await service.createRepository(projectId, projectSlug, validCreateRepository, userId, requestId)

      expect(datastore.hasRepositoryWithName).toHaveBeenCalledWith(projectId, validCreateRepository.internalRepoName)
      expect(datastore.createRepository).toHaveBeenCalledWith(expect.objectContaining({
        projectId,
        internalRepoName: validCreateRepository.internalRepoName,
        isPrivate: true,
      }))
      expect(vault.writeGitlabMirrorCreds).toHaveBeenCalledWith(projectSlug, repository.internalRepoName, {
        GIT_INPUT_USER: validCreateRepository.isPrivate ? validCreateRepository.externalUserName : undefined,
        GIT_INPUT_PASSWORD: validCreateRepository.isPrivate ? validCreateRepository.externalToken : undefined,
      })
      // The token must reach Vault before the reconciliation reads it.
      expect(vault.writeGitlabMirrorCreds.mock.invocationCallOrder[0])
        .toBeLessThan(appEvents.emitProjectEvent.mock.invocationCallOrder[0])
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, {
        action: 'Create Repository',
        userId,
        requestId,
      })
      expect(result).toEqual(repository)
    })

    it('triggers a full mirror sync when the repository declares an external source', async () => {
      const repository = makeRepository({ id: repositoryId, projectId, internalRepoName: validCreateRepository.internalRepoName })
      datastore.hasRepositoryWithName.mockResolvedValue(false)
      datastore.createRepository.mockResolvedValue(repository)
      vault.writeGitlabMirrorCreds.mockResolvedValue(undefined)
      appEvents.emitProjectEvent.mockResolvedValue({})

      await service.createRepository(projectId, projectSlug, validCreateRepository, userId, requestId)

      expect(appEvents.emitRepositoryEvent).toHaveBeenCalledWith(
        'repository.sync',
        expect.objectContaining({ internalRepoName: repository.internalRepoName, syncAllBranches: true }),
        expect.objectContaining({ action: 'Sync Repository' }),
      )
    })

    it('does not trigger a sync when no external source is declared', async () => {
      const withoutExternalSource = { ...validCreateRepository, externalRepoUrl: '' }
      const repository = makeRepository({ id: repositoryId, projectId, internalRepoName: withoutExternalSource.internalRepoName })
      datastore.hasRepositoryWithName.mockResolvedValue(false)
      datastore.createRepository.mockResolvedValue(repository)
      vault.writeGitlabMirrorCreds.mockResolvedValue(undefined)
      appEvents.emitProjectEvent.mockResolvedValue({})

      await service.createRepository(projectId, projectSlug, withoutExternalSource, userId, requestId)

      expect(appEvents.emitRepositoryEvent).not.toHaveBeenCalled()
    })

    it('does not touch Vault when creating a public repository', async () => {
      const publicRepository = {
        internalRepoName: faker.string.alphanumeric(8).toLowerCase(),
        externalRepoUrl: '',
        isInfra: false,
        isPrivate: false,
        deployRevision: 'HEAD',
        deployPath: '.',
        helmValuesFiles: '',
      } satisfies CreateRepository
      datastore.hasRepositoryWithName.mockResolvedValue(false)
      datastore.createRepository.mockResolvedValue(makeRepository({ projectId, internalRepoName: publicRepository.internalRepoName, isPrivate: false }))
      appEvents.emitProjectEvent.mockResolvedValue({})

      await service.createRepository(projectId, projectSlug, publicRepository, userId, requestId)

      expect(vault.writeGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, expect.objectContaining({ action: 'Create Repository' }))
    })

    it('waits for the reconciliation and rejects with 422 when a plugin fails', async () => {
      const repository = makeRepository({ id: repositoryId, projectId, internalRepoName: validCreateRepository.internalRepoName })
      datastore.hasRepositoryWithName.mockResolvedValue(false)
      datastore.createRepository.mockResolvedValue(repository)
      vault.writeGitlabMirrorCreds.mockResolvedValue(undefined)
      appEvents.emitProjectEvent.mockResolvedValue(failedReconciliation)

      await expect(service.createRepository(projectId, projectSlug, validCreateRepository, userId, requestId))
        .rejects.toThrow(UnprocessableEntityException)
      expect(datastore.createRepository).toHaveBeenCalled()
      // A failed reconciliation stops the request before the mirror sync, as in v1.
      expect(appEvents.emitRepositoryEvent).not.toHaveBeenCalled()
    })

    // Legacy parity: v1 returned 422 when the post-creation sync failed. The DB row
    // stays committed — the sync is replayable via the dedicated endpoint.
    it('rejects with 422 when the post-creation mirror sync fails', async () => {
      const repository = makeRepository({ id: repositoryId, projectId, internalRepoName: validCreateRepository.internalRepoName })
      datastore.hasRepositoryWithName.mockResolvedValue(false)
      datastore.createRepository.mockResolvedValue(repository)
      vault.writeGitlabMirrorCreds.mockResolvedValue(undefined)
      appEvents.emitProjectEvent.mockResolvedValue({})
      appEvents.emitRepositoryEvent.mockResolvedValue({
        gitlab: { status: 'KO', message: 'Unable to find mirror repository', executionTime: 1, error: new Error('boom') },
      })

      await expect(service.createRepository(projectId, projectSlug, validCreateRepository, userId, requestId))
        .rejects.toThrow(UnprocessableEntityException)
    })

    it('still returns the repository when no sync plugin is enabled (empty results)', async () => {
      const repository = makeRepository({ id: repositoryId, projectId, internalRepoName: validCreateRepository.internalRepoName })
      datastore.hasRepositoryWithName.mockResolvedValue(false)
      datastore.createRepository.mockResolvedValue(repository)
      appEvents.emitProjectEvent.mockResolvedValue({})
      appEvents.emitRepositoryEvent.mockResolvedValue({})

      const result = await service.createRepository(projectId, projectSlug, validCreateRepository, userId, requestId)

      expect(result).toEqual(repository)
    })

    it('rejects when a repository with the same internal name already exists', async () => {
      datastore.hasRepositoryWithName.mockResolvedValue(true)

      await expect(service.createRepository(projectId, projectSlug, validCreateRepository, userId, requestId))
        .rejects.toThrow(BadRequestException)
      expect(datastore.createRepository).not.toHaveBeenCalled()
      expect(vault.writeGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).not.toHaveBeenCalled()
    })
  })

  describe('updateRepository', () => {
    it('writes a new token to Vault before reconciling, using the updated row username', async () => {
      const externalToken = faker.string.alphanumeric(16)
      const updated = makeRepository({ id: repositoryId, projectId, isPrivate: true, externalUserName: faker.internet.username() })
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      datastore.updateRepository.mockResolvedValue(updated)
      vault.writeGitlabMirrorCreds.mockResolvedValue(undefined)
      appEvents.emitProjectEvent.mockResolvedValue({})

      const result = await service.updateRepository(projectId, projectSlug, repositoryId, { isPrivate: true, externalToken }, userId, requestId)

      expect(vault.writeGitlabMirrorCreds).toHaveBeenCalledWith(projectSlug, updated.internalRepoName, {
        GIT_INPUT_USER: updated.externalUserName,
        GIT_INPUT_PASSWORD: externalToken,
      })
      expect(vault.writeGitlabMirrorCreds.mock.invocationCallOrder[0])
        .toBeLessThan(appEvents.emitProjectEvent.mock.invocationCallOrder[0])
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, {
        action: 'Update Repository',
        userId,
        requestId,
      })
      expect(result).toEqual(updated)
    })

    it('clears the Vault credentials when the repository is turned public', async () => {
      const updated = makeRepository({ id: repositoryId, projectId, isPrivate: false })
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      datastore.updateRepository.mockResolvedValue(updated)
      vault.deleteGitlabMirrorCreds.mockResolvedValue(undefined)
      appEvents.emitProjectEvent.mockResolvedValue({})

      await service.updateRepository(projectId, projectSlug, repositoryId, { isPrivate: false }, userId, requestId)

      expect(vault.deleteGitlabMirrorCreds).toHaveBeenCalledWith(projectSlug, updated.internalRepoName)
      expect(vault.writeGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, expect.objectContaining({ action: 'Update Repository' }))
    })

    it('leaves Vault untouched when the update carries no credential change', async () => {
      const updated = makeRepository({ id: repositoryId, projectId })
      datastore.getRepositoryById.mockResolvedValue(updated)
      datastore.updateRepository.mockResolvedValue(updated)
      appEvents.emitProjectEvent.mockResolvedValue({})

      await service.updateRepository(projectId, projectSlug, repositoryId, { deployRevision: faker.git.branch() }, userId, requestId)

      expect(vault.writeGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(vault.deleteGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, expect.objectContaining({ action: 'Update Repository' }))
    })

    it('waits for the reconciliation and rejects with 422 when a plugin fails', async () => {
      const repository = makeRepository({ id: repositoryId, projectId })
      datastore.getRepositoryById.mockResolvedValue(repository)
      datastore.updateRepository.mockResolvedValue(repository)
      appEvents.emitProjectEvent.mockResolvedValue(failedReconciliation)

      await expect(service.updateRepository(projectId, projectSlug, repositoryId, validUpdateRepository, userId, requestId))
        .rejects.toThrow(UnprocessableEntityException)
      expect(datastore.updateRepository).toHaveBeenCalled()
    })

    it('rejects when the repository belongs to another project', async () => {
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId: faker.string.uuid() }))

      await expect(service.updateRepository(projectId, projectSlug, repositoryId, validUpdateRepository, userId, requestId))
        .rejects.toThrow(NotFoundException)
      expect(datastore.updateRepository).not.toHaveBeenCalled()
      expect(vault.writeGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(vault.deleteGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).not.toHaveBeenCalled()
    })
  })

  describe('syncRepository', () => {
    const syncRequest = { syncAllBranches: true } as const

    it('emits the sync event with the repository addressed by slug and name', async () => {
      const repository = makeRepository({ id: repositoryId, projectId })
      datastore.getRepositoryById.mockResolvedValue(repository)
      appEvents.emitRepositoryEvent.mockResolvedValue({ gitlab: { status: 'OK', message: 'Up to date', executionTime: 1 } })

      await service.syncRepository(projectId, projectSlug, repositoryId, syncRequest, userId, requestId)

      // A full sync carries no branch key at all — not an undefined one.
      expect(appEvents.emitRepositoryEvent).toHaveBeenCalledWith(
        'repository.sync',
        {
          projectId,
          projectSlug,
          internalRepoName: repository.internalRepoName,
          syncAllBranches: true,
        },
        { action: 'Sync Repository', userId, requestId },
      )
    })

    it('forwards the requested branch when not syncing every branch', async () => {
      const repository = makeRepository({ id: repositoryId, projectId })
      const branchName = faker.git.branch()
      datastore.getRepositoryById.mockResolvedValue(repository)
      appEvents.emitRepositoryEvent.mockResolvedValue({})

      await service.syncRepository(projectId, projectSlug, repositoryId, { syncAllBranches: false, branchName }, userId, requestId)

      expect(appEvents.emitRepositoryEvent).toHaveBeenCalledWith(
        'repository.sync',
        expect.objectContaining({ syncAllBranches: false, branchName }),
        expect.objectContaining({ action: 'Sync Repository' }),
      )
    })

    it('rejects with 422 when a plugin fails the synchronization', async () => {
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      appEvents.emitRepositoryEvent.mockResolvedValue({
        gitlab: { status: 'KO', message: 'Unable to find mirror repository', executionTime: 1, error: new Error('boom') },
      })

      await expect(service.syncRepository(projectId, projectSlug, repositoryId, syncRequest, userId, requestId))
        .rejects.toThrow(UnprocessableEntityException)
    })

    it('rejects when the repository belongs to another project', async () => {
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId: faker.string.uuid() }))

      await expect(service.syncRepository(projectId, projectSlug, repositoryId, syncRequest, userId, requestId))
        .rejects.toThrow(NotFoundException)
      expect(appEvents.emitRepositoryEvent).not.toHaveBeenCalled()
    })
  })

  describe('deleteRepository', () => {
    it('deletes the repository and triggers the project reconciliation', async () => {
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      datastore.deleteRepository.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      appEvents.emitProjectEvent.mockResolvedValue({})

      await service.deleteRepository(projectId, repositoryId, userId, requestId)

      expect(datastore.deleteRepository).toHaveBeenCalledWith(repositoryId)
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, {
        action: 'Delete Repository',
        userId,
        requestId,
      })
    })

    it('waits for the reconciliation and rejects with 422 when a plugin fails', async () => {
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      datastore.deleteRepository.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      appEvents.emitProjectEvent.mockResolvedValue(failedReconciliation)

      await expect(service.deleteRepository(projectId, repositoryId, userId, requestId))
        .rejects.toThrow(UnprocessableEntityException)
      expect(datastore.deleteRepository).toHaveBeenCalledWith(repositoryId)
    })

    it('rejects when the repository belongs to another project', async () => {
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId: faker.string.uuid() }))

      await expect(service.deleteRepository(projectId, repositoryId, userId, requestId))
        .rejects.toThrow(NotFoundException)
      expect(datastore.deleteRepository).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).not.toHaveBeenCalled()
    })
  })

  describe('without vault configured', () => {
    let vaultlessService: RepositoryService

    beforeEach(async () => {
      const vaultlessModule = await Test.createTestingModule({
        providers: [
          RepositoryService,
          { provide: RepositoryDatastoreService, useValue: datastore },
          { provide: AppEventsService, useValue: appEvents },
        ],
      }).compile()

      vaultlessService = vaultlessModule.get<RepositoryService>(RepositoryService)
    })

    it('creates a private repository without storing the mirror credentials', async () => {
      const repository = makeRepository({ id: repositoryId, projectId, internalRepoName: validCreateRepository.internalRepoName, isPrivate: true })
      datastore.hasRepositoryWithName.mockResolvedValue(false)
      datastore.createRepository.mockResolvedValue(repository)
      appEvents.emitProjectEvent.mockResolvedValue({})

      const result = await vaultlessService.createRepository(projectId, projectSlug, validCreateRepository, userId, requestId)

      expect(result).toEqual(repository)
      expect(vault.writeGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, expect.objectContaining({ action: 'Create Repository' }))
    })

    it('updates a repository without applying the credential intent', async () => {
      const updated = makeRepository({ id: repositoryId, projectId, isPrivate: true })
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      datastore.updateRepository.mockResolvedValue(updated)
      appEvents.emitProjectEvent.mockResolvedValue({})

      const result = await vaultlessService.updateRepository(projectId, projectSlug, repositoryId, { isPrivate: true, externalToken: faker.string.alphanumeric(16) }, userId, requestId)

      expect(result).toEqual(updated)
      expect(vault.writeGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(vault.deleteGitlabMirrorCreds).not.toHaveBeenCalled()
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, expect.objectContaining({ action: 'Update Repository' }))
    })

    it('deletes a repository', async () => {
      datastore.getRepositoryById.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      datastore.deleteRepository.mockResolvedValue(makeRepository({ id: repositoryId, projectId }))
      appEvents.emitProjectEvent.mockResolvedValue({})

      await vaultlessService.deleteRepository(projectId, repositoryId, userId, requestId)

      expect(datastore.deleteRepository).toHaveBeenCalledWith(repositoryId)
      expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', projectId, expect.objectContaining({ action: 'Delete Repository' }))
    })
  })
})
