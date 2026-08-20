import type { Repository } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Unprocessable422 } from '@/utils/errors.js'
import { addLogs, getProjectInfosAndRepos, getRepositoryById, initializeRepository, updateRepository as updateRepositoryQuery } from '@/resources/queries-index.js'
import * as hookWrapper from '@/utils/hook-wrapper.js'
import { createRepository, updateRepository } from './business.js'

vi.mock('@/resources/queries-index.js')
vi.mock('@/utils/hook-wrapper.js', () => ({
  hook: {
    misc: { syncRepository: vi.fn() },
    project: { upsert: vi.fn() },
  },
}))

const mockedAddLogs = vi.mocked(addLogs)
const mockedGetProjectRepos = vi.mocked(getProjectInfosAndRepos)
const mockedGetRepositoryById = vi.mocked(getRepositoryById)
const mockedInitialize = vi.mocked(initializeRepository)
const mockedUpdateQuery = vi.mocked(updateRepositoryQuery)
const mockedSyncHook = vi.mocked(hookWrapper.hook.misc.syncRepository)

const repositoryId = faker.string.uuid()
const projectId = faker.string.uuid()
const userId = faker.string.uuid()
const requestId = faker.string.uuid()

function makeRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    id: repositoryId,
    projectId,
    internalRepoName: faker.string.alpha({ length: 6, casing: 'lower' }),
    isInfra: false,
    isPrivate: false,
    externalRepoUrl: '',
    externalUserName: null,
    externalToken: null,
    deployRevision: 'HEAD',
    deployPath: '.',
    helmValuesFiles: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Repository
}

describe('repository business', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hookWrapper.hook.project.upsert).mockResolvedValue({ failed: false, results: [] } as any)
    mockedGetProjectRepos.mockResolvedValue({ repositories: [] } as any)
    mockedInitialize.mockResolvedValue(makeRepo())
    mockedSyncHook.mockResolvedValue({ args: { id: repositoryId }, failed: false } as any)
  })

  describe('createRepository', () => {
    const baseData = {
      projectId,
      internalRepoName: 'foo',
      isInfra: false,
      isPrivate: false,
    } as any

    it('triggers the mirror sync when the repo is created with an external URL', async () => {
      mockedInitialize.mockResolvedValue(makeRepo({ externalRepoUrl: 'https://x.com/r.git' }))

      await createRepository({ data: { ...baseData, externalRepoUrl: 'https://x.com/r.git' }, userId, requestId })

      expect(mockedSyncHook).toHaveBeenCalledWith(repositoryId, { syncAllBranches: true, branchName: undefined })
    })

    it('marks a failed mirror sync under the create action instead of discarding it', async () => {
      mockedInitialize.mockResolvedValue(makeRepo({ externalRepoUrl: 'https://x.com/r.git' }))
      // syncRepository returns Unprocessable422 when the hook reports failure.
      vi.spyOn(hookWrapper.hook.misc, 'syncRepository').mockResolvedValueOnce({ args: { id: repositoryId }, failed: true } as any)

      await createRepository({ data: { ...baseData, externalRepoUrl: 'https://x.com/r.git' }, userId, requestId })

      expect(mockedAddLogs).toHaveBeenCalledWith(expect.objectContaining({
        action: 'Create Repository',
        data: expect.objectContaining({ mirrorSync: 'failed' }),
        projectId,
      }))
    })

    it('does not surface a sync when no external URL is provided', async () => {
      await createRepository({ data: { ...baseData }, userId, requestId })

      expect(mockedSyncHook).not.toHaveBeenCalled()
    })
  })

  describe('updateRepository', () => {
    it('triggers a mirror sync when the external URL first appears', async () => {
      mockedGetRepositoryById.mockResolvedValue(makeRepo({ externalRepoUrl: '' }))
      mockedUpdateQuery.mockResolvedValue(makeRepo({ externalRepoUrl: 'https://x.com/r.git' }))

      await updateRepository({ repositoryId, data: { externalRepoUrl: 'https://x.com/r.git' }, userId, requestId })

      expect(mockedSyncHook).toHaveBeenCalledWith(repositoryId, { syncAllBranches: true, branchName: undefined })
    })

    it('marks a failed mirror sync under the update action instead of discarding it', async () => {
      mockedGetRepositoryById.mockResolvedValue(makeRepo({ externalRepoUrl: '' }))
      mockedUpdateQuery.mockResolvedValue(makeRepo({ externalRepoUrl: 'https://x.com/r.git' }))
      // syncRepository returns Unprocessable422 when the hook reports failure.
      vi.spyOn(hookWrapper.hook.misc, 'syncRepository').mockResolvedValueOnce({ args: { id: repositoryId }, failed: true } as any)

      await updateRepository({ repositoryId, data: { externalRepoUrl: 'https://x.com/r.git' }, userId, requestId })

      expect(mockedAddLogs).toHaveBeenCalledWith(expect.objectContaining({
        action: 'Update Repository',
        data: expect.objectContaining({ mirrorSync: 'failed' }),
        projectId,
      }))
    })

    it('does not trigger a mirror sync when the external URL is unchanged', async () => {
      const url = 'https://x.com/r.git'
      mockedGetRepositoryById.mockResolvedValue(makeRepo({ externalRepoUrl: url }))
      mockedUpdateQuery.mockResolvedValue(makeRepo({ externalRepoUrl: url }))

      await updateRepository({ repositoryId, data: { deployRevision: 'v2' }, userId, requestId })

      expect(mockedSyncHook).not.toHaveBeenCalled()
    })

    it('does not trigger a sync when the external URL is cleared', async () => {
      mockedGetRepositoryById.mockResolvedValue(makeRepo({ externalRepoUrl: 'https://x.com/r.git' }))
      mockedUpdateQuery.mockResolvedValue(makeRepo({ externalRepoUrl: '' }))

      await updateRepository({ repositoryId, data: { externalRepoUrl: '' }, userId, requestId })

      expect(mockedSyncHook).not.toHaveBeenCalled()
    })
  })
})
