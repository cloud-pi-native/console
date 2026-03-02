import { Test, type TestingModule } from '@nestjs/testing'
import { GitlabService } from './gitlab.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock gitbeaker
vi.mock('@gitbeaker/rest', () => {
  return {
    Gitlab: vi.fn().mockImplementation(() => ({
      Groups: {
        all: vi.fn(),
        create: vi.fn(),
        show: vi.fn(),
        allSubgroups: vi.fn(),
        remove: vi.fn(),
      },
      GroupMembers: {
        all: vi.fn(),
        add: vi.fn(),
        remove: vi.fn(),
      },
      Projects: {
        all: vi.fn(),
        create: vi.fn(),
        show: vi.fn(),
        remove: vi.fn(),
      },
      Commits: {
        create: vi.fn(),
      },
      RepositoryFiles: {
        show: vi.fn(),
      },
      Repositories: {
        allRepositoryTrees: vi.fn(),
      },
      GroupAccessTokens: {
        all: vi.fn(),
        create: vi.fn(),
        revoke: vi.fn(),
      },
      PipelineTriggerTokens: {
        all: vi.fn(),
        create: vi.fn(),
        remove: vi.fn(),
      },
      Users: {
        all: vi.fn(),
        create: vi.fn(),
      },
    })),
  }
})

describe('gitlabService', () => {
  let service: GitlabService
  // let configService: ConfigurationService
  let gitlabMock: any

  const mockConfigService = {
    gitlabUrl: 'https://gitlab.example.com',
    gitlabToken: 'token',
    gitlabInternalUrl: 'https://gitlab.internal.example.com',
    projectRootDir: 'forge/console',
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitlabService,
        {
          provide: ConfigurationService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<GitlabService>(GitlabService)
    // configService = module.get<ConfigurationService>(ConfigurationService)

    // Initialize module (calls onModuleInit)
    service.onModuleInit()
    gitlabMock = (service as any).api
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getOrCreateInfraProject', () => {
    it('should create infra project if not exists', async () => {
      const zoneSlug = 'zone-1'
      const rootId = 123
      const infraGroupId = 456
      const projectId = 789

      // Mock getGroupRootId logic
      gitlabMock.Groups.all.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge/console' }],
        paginationInfo: { next: null },
      })

      // Mock Groups.show (root)
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: rootId, full_path: 'forge/console' })

      // Mock find infra group (not found first)
      gitlabMock.Groups.all.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      // Mock create infra group
      gitlabMock.Groups.create.mockResolvedValue({ id: infraGroupId, full_path: 'forge/console/infra' })

      // Mock find project (not found)
      gitlabMock.Projects.all.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      // Mock create project
      gitlabMock.Projects.create.mockResolvedValue({
        id: projectId,
        path_with_namespace: 'forge/console/infra/zone-1',
        http_url_to_repo: 'http://gitlab/repo.git',
      })

      const result = await service.getOrCreateInfraProject(zoneSlug)

      expect(result).toEqual({ id: projectId, http_url_to_repo: 'http://gitlab/repo.git' })
      expect(gitlabMock.Groups.create).toHaveBeenCalledWith('infra', 'infra', expect.any(Object))
      expect(gitlabMock.Projects.create).toHaveBeenCalledWith(expect.objectContaining({
        name: zoneSlug,
        path: zoneSlug,
        namespaceId: infraGroupId,
      }))
    })
  })

  describe('commitCreateOrUpdate', () => {
    it('should stage creation if file not exists', async () => {
      const repoId = 1
      const content = 'content'
      const filePath = 'file.txt'

      gitlabMock.RepositoryFiles.show.mockRejectedValue(new Error('Not found'))

      await service.commitCreateOrUpdate(repoId, content, filePath)

      expect(gitlabMock.Commits.create).not.toHaveBeenCalled()
    })

    it('should stage update if content differs', async () => {
      const repoId = 1
      const content = 'new content'
      const filePath = 'file.txt'
      const oldHash = 'oldhash'

      gitlabMock.RepositoryFiles.show.mockResolvedValue({
        content_sha256: oldHash,
      })

      await service.commitCreateOrUpdate(repoId, content, filePath)

      expect(gitlabMock.Commits.create).not.toHaveBeenCalled()
    })

    it('should do nothing if content matches', async () => {
      const repoId = 1
      const content = 'content'
      const filePath = 'file.txt'
      const hash = 'ed7002b439e9ac845f22357d822bac1444730fbdb6016d3ec9432297b9ec9f73' // sha256 of 'content'

      gitlabMock.RepositoryFiles.show.mockResolvedValue({
        content_sha256: hash,
      })

      await service.commitCreateOrUpdate(repoId, content, filePath)

      expect(gitlabMock.Commits.create).not.toHaveBeenCalled()
    })
  })

  describe('commitFiles', () => {
    it('should commit staged files', async () => {
      const repoId = 1
      const content = 'content'
      const filePath = 'file.txt'

      gitlabMock.RepositoryFiles.show.mockRejectedValue(new Error('Not found'))
      await service.commitCreateOrUpdate(repoId, content, filePath)
      await service.commitFiles()

      expect(gitlabMock.Commits.create).toHaveBeenCalledWith(
        repoId,
        'main',
        expect.stringContaining('Update 1 file'),
        [{ action: 'create', filePath, content }],
      )
    })

    it('should not commit if nothing staged', async () => {
      await service.commitFiles()
      expect(gitlabMock.Commits.create).not.toHaveBeenCalled()
    })
  })

  describe('getOrCreateProjectGroup', () => {
    it('should create project group if not exists', async () => {
      const projectSlug = 'project-1'
      const rootId = 123
      const groupId = 456

      gitlabMock.Groups.all.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge/console' }],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: rootId, full_path: 'forge/console' })
      gitlabMock.Groups.all.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.create.mockResolvedValue({ id: groupId, name: projectSlug })

      const result = await service.getOrCreateProjectGroup(projectSlug)

      expect(result).toEqual({ id: groupId, name: projectSlug })
      expect(gitlabMock.Groups.create).toHaveBeenCalledWith(projectSlug, projectSlug, expect.objectContaining({
        parentId: rootId,
      }))
    })

    it('should return existing group', async () => {
      const projectSlug = 'project-1'
      const rootId = 123
      const groupId = 456

      gitlabMock.Groups.all.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge/console' }],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: rootId, full_path: 'forge/console' })
      gitlabMock.Groups.all.mockResolvedValueOnce({
        data: [{ id: groupId, name: projectSlug, parent_id: rootId }],
        paginationInfo: { next: null },
      })

      const result = await service.getOrCreateProjectGroup(projectSlug)

      expect(result).toEqual({ id: groupId, name: projectSlug, parent_id: rootId })
      expect(gitlabMock.Groups.create).not.toHaveBeenCalled()
    })
  })

  describe('group Members', () => {
    it('should get group members', async () => {
      const groupId = 1
      const members = [{ id: 1, name: 'user' }]
      gitlabMock.GroupMembers.all.mockResolvedValue(members)

      const result = await service.getGroupMembers(groupId)
      expect(result).toEqual(members)
      expect(gitlabMock.GroupMembers.all).toHaveBeenCalledWith(groupId)
    })

    it('should add group member', async () => {
      const groupId = 1
      const userId = 2
      const accessLevel = 30
      gitlabMock.GroupMembers.add.mockResolvedValue({ id: userId })

      await service.addGroupMember(groupId, userId, accessLevel)
      expect(gitlabMock.GroupMembers.add).toHaveBeenCalledWith(groupId, userId, accessLevel)
    })

    it('should remove group member', async () => {
      const groupId = 1
      const userId = 2
      gitlabMock.GroupMembers.remove.mockResolvedValue(true)

      await service.removeGroupMember(groupId, userId)
      expect(gitlabMock.GroupMembers.remove).toHaveBeenCalledWith(groupId, userId)
    })
  })

  describe('createEmptyProjectRepository', () => {
    it('should create repository and first commit', async () => {
      const projectSlug = 'project-1'
      const repoName = 'repo-1'
      const groupId = 456
      const projectId = 789

      // Mock getOrCreateProjectGroup
      gitlabMock.Groups.all.mockResolvedValueOnce({ data: [{ id: 123 }] }) // root
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: 123 })
      gitlabMock.Groups.all.mockResolvedValueOnce({ data: [{ id: groupId, name: projectSlug, parent_id: 123 }] })

      gitlabMock.Projects.create.mockResolvedValue({ id: projectId })

      await service.createEmptyProjectRepository(projectSlug, repoName)

      expect(gitlabMock.Projects.create).toHaveBeenCalledWith(expect.objectContaining({
        name: repoName,
        path: repoName,
        namespaceId: groupId,
      }))
      expect(gitlabMock.Commits.create).toHaveBeenCalledWith(projectId, 'main', expect.any(String), [])
    })
  })
})
