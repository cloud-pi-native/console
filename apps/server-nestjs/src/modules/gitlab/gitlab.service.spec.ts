import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { GitlabService } from './gitlab.service'
import { GitlabClientService } from './gitlab-client.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import type { MockedFunction } from 'vitest'
import { describe, it, expect, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { ExpandedGroupSchema, MemberSchema, ProjectSchema, RepositoryFileExpandedSchema } from '@gitbeaker/core'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'

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
          projectRootPath: 'forge',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('gitlab', () => {
  let service: GitlabService

  beforeEach(async () => {
    mockReset(gitlabMock)
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
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })

      // Mock Groups.show (root)
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: rootId, full_path: 'forge' } as ExpandedGroupSchema)

      // Mock find infra group (not found first)
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      // Mock create infra group
      gitlabMock.Groups.create.mockResolvedValue({ id: infraGroupId, full_path: 'forge/infra' } as ExpandedGroupSchema)

      // Mock find project (not found)
      const gitlabProjectsAllMock = gitlabMock.Projects.all as MockedFunction<typeof gitlabMock.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      // Mock create project
      gitlabMock.Projects.create.mockResolvedValue({
        id: projectId,
        path_with_namespace: 'forge/infra/zone-1',
        http_url_to_repo: 'https://gitlab.internal/repo.git',
      } as ProjectSchema)

      const result = await service.getOrCreateInfraGroupRepo(zoneSlug)

      expect(result).toEqual({
        id: projectId,
        http_url_to_repo: 'https://gitlab.internal/repo.git',
        path_with_namespace: 'forge/infra/zone-1',
      })
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
      const notFoundError = new GitbeakerRequestError('Not Found', { cause: { description: '404 File Not Found' } } as any)
      gitlabRepositoryFilesShowMock.mockRejectedValue(notFoundError)

      await service.maybeCommitUpdate(repoId, [{ content, filePath }])

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

      await service.maybeCommitUpdate(repoId, [{ content, filePath }])

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

      await service.maybeCommitUpdate(repoId, [{ content, filePath }])

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
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: rootId, full_path: 'forge' } as ExpandedGroupSchema)
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.create.mockResolvedValue({ id: groupId, name: projectSlug } as ExpandedGroupSchema)

      const result = await service.getOrCreateProjectSubGroup(projectSlug)

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
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: rootId, full_path: 'forge' } as ExpandedGroupSchema)
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: projectSlug, parent_id: rootId, full_path: 'forge/project-1' }],
        paginationInfo: { next: null },
      })

      const result = await service.getOrCreateProjectSubGroup(projectSlug)

      expect(result).toEqual({ id: groupId, name: projectSlug, parent_id: rootId, full_path: 'forge/project-1' })
      expect(gitlabMock.Groups.create).not.toHaveBeenCalled()
    })
  })

  describe('repositories', () => {
    it('should return internal repo url', async () => {
      const projectSlug = 'project-1'
      const repoName = 'repo-1'
      const rootId = 123
      const groupId = 1

      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: groupId, full_path: 'forge/project-1' }],
        paginationInfo: { next: null },
      })

      const result = await service.getProjectGroupInternalRepoUrl(projectSlug, repoName)
      expect(result).toBe('https://gitlab.internal/forge/project-1/repo-1.git')
    })

    it('should upsert mirror repo', async () => {
      const projectSlug = 'project-1'
      const repoId = 1

      const gitlabProjectsAllMock = gitlabMock.Projects.all as MockedFunction<typeof gitlabMock.Projects.all>
      gitlabProjectsAllMock.mockResolvedValue({
        data: [{ id: repoId, path_with_namespace: 'forge/project-1/mirror' }],
        paginationInfo: { next: null },
      })

      gitlabMock.Projects.edit.mockResolvedValue({ id: repoId, name: 'mirror' } as ProjectSchema)

      const result = await service.upsertProjectMirrorRepo(projectSlug)

      expect(result).toEqual({ id: repoId, name: 'mirror' })
      expect(gitlabMock.Projects.edit).toHaveBeenCalledWith(repoId, expect.objectContaining({
        name: 'mirror',
        path: 'mirror',
      }))
    })

    it('should create pipeline trigger token if not exists', async () => {
      const projectSlug = 'project-1'
      const repoId = 1
      const tokenDescription = 'mirroring-from-external-repo'

      const gitlabProjectsAllMock = gitlabMock.Projects.all as MockedFunction<typeof gitlabMock.Projects.all>
      gitlabProjectsAllMock.mockResolvedValue({
        data: [{ id: repoId, path_with_namespace: 'forge/project-1/mirror' }],
        paginationInfo: { next: null },
      })
      gitlabMock.Projects.edit.mockResolvedValue({ id: repoId, name: 'mirror' } as ProjectSchema)

      const gitlabPipelineTriggerTokensAllMock = gitlabMock.PipelineTriggerTokens.all as MockedFunction<typeof gitlabMock.PipelineTriggerTokens.all>
      gitlabPipelineTriggerTokensAllMock.mockResolvedValue({
        data: [],
        paginationInfo: { next: null } as any,
      })

      gitlabMock.PipelineTriggerTokens.create.mockResolvedValue({ id: 2, description: tokenDescription } as any)

      const result = await service.getOrCreateMirrorPipelineTriggerToken(projectSlug)

      expect(result).toEqual({ id: 2, description: tokenDescription })
      expect(gitlabMock.PipelineTriggerTokens.create).toHaveBeenCalledWith(repoId, tokenDescription)
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

  describe('createProjectMirrorAccessToken', () => {
    it('should create project access token with correct scopes', async () => {
      const projectSlug = 'project-1'
      const groupId = 456
      const tokenName = `${projectSlug}-bot`
      const token = { id: 1, name: tokenName, token: 'secret-token' }

      // Mock getProjectGroup
      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: 123, full_path: 'forge' }],
        paginationInfo: { next: null },
      }) // root
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: 123, full_path: 'forge' } as ExpandedGroupSchema)

      const gitlabGroupsAllSubgroupsMock = gitlabMock.Groups.allSubgroups as MockedFunction<typeof gitlabMock.Groups.allSubgroups>
      gitlabGroupsAllSubgroupsMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: projectSlug, parent_id: 123, full_path: 'forge/project-1' }],
        paginationInfo: { next: null },
      })

      gitlabMock.GroupAccessTokens.create.mockResolvedValue(token as any)

      const result = await service.createMirrorAccessToken(projectSlug)

      expect(result).toEqual(token)
      expect(gitlabMock.GroupAccessTokens.create).toHaveBeenCalledWith(
        groupId,
        tokenName,
        ['write_repository', 'read_repository', 'read_api'],
        expect.any(String),
      )
    })
  })

  describe('getOrCreateProjectGroupRepo', () => {
    it('should return existing repo', async () => {
      const subGroupPath = 'project-1'
      const repoName = 'repo-1'
      const fullPath = `${subGroupPath}/${repoName}`
      const projectId = 789

      const gitlabProjectsAllMock = gitlabMock.Projects.all as MockedFunction<typeof gitlabMock.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [{ id: projectId, path_with_namespace: `forge/${fullPath}` }],
        paginationInfo: { next: null },
      })

      const result = await service.getOrCreateProjectGroupRepo(fullPath)

      expect(result).toEqual(expect.objectContaining({ id: projectId }))
    })

    it('should create repo if not exists', async () => {
      const subGroupPath = 'project-1'
      const repoName = 'repo-1'
      const fullPath = `${subGroupPath}/${repoName}`
      const projectId = 789
      const groupId = 456
      const rootId = 123

      // Mock repo search (not found)
      const gitlabProjectsAllMock = gitlabMock.Projects.all as MockedFunction<typeof gitlabMock.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      // Mock parent group retrieval (recursive)
      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>

      // 1. Find root 'forge'
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })

      // 2. Find subgroup 'forge/project-1'
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: subGroupPath, parent_id: rootId, full_path: `forge/${subGroupPath}` }],
        paginationInfo: { next: null },
      })

      // Mock repo creation
      gitlabMock.Projects.create.mockResolvedValue({ id: projectId, name: repoName } as ProjectSchema)

      const result = await service.getOrCreateProjectGroupRepo(fullPath)

      expect(result).toEqual(expect.objectContaining({ id: projectId }))
      expect(gitlabMock.Projects.create).toHaveBeenCalledWith(expect.objectContaining({
        name: repoName,
        path: repoName,
        namespaceId: groupId,
      }))
    })
  })

  describe('getFile', () => {
    it('should return file content', async () => {
      const repoId = 1
      const filePath = 'file.txt'
      const ref = 'main'
      const file = { content: 'content' }

      gitlabMock.RepositoryFiles.show.mockResolvedValue(file as any)

      const result = await service.getFile(repoId, filePath, ref)
      expect(result).toEqual(file)
    })

    it('should return undefined on 404', async () => {
      const repoId = 1
      const filePath = 'file.txt'
      const ref = 'main'
      const error = new GitbeakerRequestError('Not Found', { cause: { description: '404 File Not Found' } } as any)

      gitlabMock.RepositoryFiles.show.mockRejectedValue(error)

      const result = await service.getFile(repoId, filePath, ref)
      expect(result).toBeUndefined()
    })

    it('should throw on other errors', async () => {
      const repoId = 1
      const filePath = 'file.txt'
      const ref = 'main'
      const error = new Error('Some other error')

      gitlabMock.RepositoryFiles.show.mockRejectedValue(error)

      await expect(service.getFile(repoId, filePath, ref)).rejects.toThrow(error)
    })
  })

  describe('listFiles', () => {
    it('should return files', async () => {
      const repoId = 1
      const files = [{ path: 'file.txt' }]

      gitlabMock.Repositories.allRepositoryTrees.mockResolvedValue(files as any)

      const result = await service.listFiles(repoId)
      expect(result).toEqual(files)
    })

    it('should return empty array on 404', async () => {
      const repoId = 1
      const error = new GitbeakerRequestError('Not Found', { cause: { description: '404 Tree Not Found' } } as any)

      gitlabMock.Repositories.allRepositoryTrees.mockRejectedValue(error)

      const result = await service.listFiles(repoId)
      expect(result).toEqual([])
    })
  })

  describe('getProjectToken', () => {
    it('should return specific token', async () => {
      const projectSlug = 'project-1'
      const groupId = 456
      const tokenName = `${projectSlug}-bot`
      const token = { id: 1, name: tokenName }

      // Mock getProjectGroup
      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: 123, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
      gitlabMock.Groups.show.mockResolvedValueOnce({ id: 123, full_path: 'forge' } as ExpandedGroupSchema)
      const gitlabGroupsAllSubgroupsMock = gitlabMock.Groups.allSubgroups as MockedFunction<typeof gitlabMock.Groups.allSubgroups>
      gitlabGroupsAllSubgroupsMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: projectSlug, parent_id: 123, full_path: `forge/${projectSlug}` }],
        paginationInfo: { next: null },
      })

      const gitlabGroupAccessTokensAllMock = gitlabMock.GroupAccessTokens.all as MockedFunction<typeof gitlabMock.GroupAccessTokens.all>
      gitlabGroupAccessTokensAllMock.mockResolvedValue({
        data: [token] as any,
        paginationInfo: { next: null } as any,
      })

      const result = await service.getProjectToken(projectSlug)
      expect(result).toEqual(token)
    })
  })

  describe('createUser', () => {
    it('should create user', async () => {
      const email = 'user@example.com'
      const username = 'user'
      const name = 'User Name'
      const user = { id: 1, username }

      gitlabMock.Users.create.mockResolvedValue(user)

      const result = await service.createUser(email, username, name)

      expect(result).toEqual(user)
      expect(gitlabMock.Users.create).toHaveBeenCalledWith(expect.objectContaining({
        email,
        username,
        name,
        skipConfirmation: true,
      }))
    })
  })

  describe('commitMirror', () => {
    it('should create mirror commit', async () => {
      const repoId = 1

      await service.commitMirror(repoId)

      expect(gitlabMock.Commits.create).toHaveBeenCalledWith(
        repoId,
        'main',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ filePath: '.gitlab-ci.yml', action: 'create' }),
          expect.objectContaining({ filePath: 'mirror.sh', action: 'create' }),
        ]),
      )
    })
  })
})
