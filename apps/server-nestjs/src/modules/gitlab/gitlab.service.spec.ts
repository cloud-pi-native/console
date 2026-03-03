import { Test, type TestingModule } from '@nestjs/testing'
import { GitlabService } from './gitlab.service'
import { GitlabClientService } from './gitlab-client.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import type { MockedFunction } from 'vitest'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import type { ExpandedGroupSchema, MemberSchema, ProjectSchema, RepositoryFileExpandedSchema } from '@gitbeaker/core'

const gitlabMock = mockDeep<GitlabClientService>()

function createGitlabServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      GitlabService,
      {
        provide: GitlabClientService,
        useValue: gitlabMock,
      },
      {
        provide: ConfigurationService,
        useValue: {
          gitlabUrl: 'https://gitlab.internal',
          gitlabToken: 'token',
          gitlabInternalUrl: 'https://gitlab.internal',
          projectRootDir: 'forge/console',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('gitlabService', () => {
  let service: GitlabService

  beforeEach(async () => {
    vi.clearAllMocks()
    const module: TestingModule = await createGitlabServiceTestingModule().compile()
    service = module.get(GitlabService)
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
      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge/console' }],
        paginationInfo: { next: null },
      })

      // Mock Groups.show (root)
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: rootId, full_path: 'forge/console' } as ExpandedGroupSchema)

      // Mock find infra group (not found first)
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      // Mock create infra group
      gitlabMock.Groups.create.mockResolvedValue({ id: infraGroupId, full_path: 'forge/console/infra' } as ExpandedGroupSchema)

      // Mock find project (not found)
      const gitlabProjectsAllMock = gitlabMock.Projects.all as MockedFunction<typeof gitlabMock.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      // Mock create project
      gitlabMock.Projects.create.mockResolvedValue({
        id: projectId,
        path_with_namespace: 'forge/console/infra/zone-1',
        http_url_to_repo: 'http://gitlab/repo.git',
      } as ProjectSchema)

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
    it('should create commit if file not exists', async () => {
      const repoId = 1
      const content = 'content'
      const filePath = 'file.txt'

      const gitlabRepositoryFilesShowMock = gitlabMock.RepositoryFiles.show as MockedFunction<typeof gitlabMock.RepositoryFiles.show>
      gitlabRepositoryFilesShowMock.mockRejectedValue(new Error('Not found'))

      await service.commitCreateOrUpdate(repoId, content, filePath)

      expect(gitlabMock.Commits.create).toHaveBeenCalledWith(
        repoId,
        'main',
        expect.any(String),
        [{ action: 'create', filePath, content }],
      )
    })

    it('should update commit if content differs', async () => {
      const repoId = 1
      const content = 'new content'
      const filePath = 'file.txt'
      const oldHash = 'oldhash'

      const gitlabRepositoryFilesShowMock = gitlabMock.RepositoryFiles.show as MockedFunction<typeof gitlabMock.RepositoryFiles.show>
      gitlabRepositoryFilesShowMock.mockResolvedValue({
        content_sha256: oldHash,
      } as RepositoryFileExpandedSchema)

      await service.commitCreateOrUpdate(repoId, content, filePath)

      expect(gitlabMock.Commits.create).toHaveBeenCalledWith(
        repoId,
        'main',
        expect.any(String),
        [{ action: 'update', filePath, content }],
      )
    })

    it('should do nothing if content matches', async () => {
      const repoId = 1
      const content = 'content'
      const filePath = 'file.txt'
      const hash = 'ed7002b439e9ac845f22357d822bac1444730fbdb6016d3ec9432297b9ec9f73' // sha256 of 'content'

      const gitlabRepositoryFilesShowMock = gitlabMock.RepositoryFiles.show as MockedFunction<typeof gitlabMock.RepositoryFiles.show>
      gitlabRepositoryFilesShowMock.mockResolvedValue({
        content_sha256: hash,
      } as RepositoryFileExpandedSchema)

      await service.commitCreateOrUpdate(repoId, content, filePath)

      expect(gitlabMock.Commits.create).not.toHaveBeenCalled()
    })
  })

  describe('getOrCreateProjectGroup', () => {
    it('should create project group if not exists', async () => {
      const projectSlug = 'project-1'
      const rootId = 123
      const groupId = 456

      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge/console' }],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: rootId, full_path: 'forge/console' } as ExpandedGroupSchema)
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.create.mockResolvedValue({ id: groupId, name: projectSlug } as ExpandedGroupSchema)

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

      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge/console' }],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: rootId, full_path: 'forge/console' } as ExpandedGroupSchema)
      gitlabGroupsAllMock.mockResolvedValueOnce({
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
      const members = [{ id: 1, name: 'user' } as MemberSchema]
      const gitlabGroupMembersAllMock = gitlabMock.GroupMembers.all as MockedFunction<typeof gitlabMock.GroupMembers.all>
      gitlabGroupMembersAllMock.mockResolvedValue(members)

      const result = await service.getGroupMembers(groupId)
      expect(result).toEqual(members)
      expect(gitlabMock.GroupMembers.all).toHaveBeenCalledWith(groupId)
    })

    it('should add group member', async () => {
      const groupId = 1
      const userId = 2
      const accessLevel = 30
      gitlabMock.GroupMembers.add.mockResolvedValue({ id: userId } as MemberSchema)

      await service.addGroupMember(groupId, userId, accessLevel)
      expect(gitlabMock.GroupMembers.add).toHaveBeenCalledWith(groupId, userId, accessLevel)
    })

    it('should remove group member', async () => {
      const groupId = 1
      const userId = 2
      gitlabMock.GroupMembers.remove.mockResolvedValue(undefined)

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
      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: 123, full_path: 'forge/console' }],
        paginationInfo: { next: null },
      }) // root
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: 123, full_path: 'forge/console' } as ExpandedGroupSchema)
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: projectSlug, parent_id: 123 }],
        paginationInfo: { next: null },
      })

      gitlabMock.Projects.create.mockResolvedValue({ id: projectId } as ProjectSchema)

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
