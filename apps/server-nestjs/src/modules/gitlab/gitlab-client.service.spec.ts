import type { ExpandedGroupSchema, Gitlab as GitlabApi, MemberSchema, ProjectSchema, RepositoryFileExpandedSchema } from '@gitbeaker/core'
import type { TestingModule } from '@nestjs/testing'
import type { MockedFunction } from 'vitest'
import { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { GITLAB_REST_CLIENT, GitlabClientService } from './gitlab-client.service'
import { makeExpandedUserSchema } from './gitlab-testing.utils'
import { INFRA_GROUP_CUSTOM_ATTRIBUTE_KEY, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY, USER_ID_CUSTOM_ATTRIBUTE_KEY } from './gitlab.constants'

const gitlabMock = mockDeep<GitlabApi>()

function createGitlabClientServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      GitlabClientService,
      {
        provide: GITLAB_REST_CLIENT,
        useValue: gitlabMock,
      },
      {
        provide: ConfigurationService,
        useValue: {
          gitlabUrl: 'https://gitlab.internal',
          gitlabToken: 'token',
          gitlabInternalUrl: 'https://gitlab.internal',
          projectRootDir: 'forge',
          gitlabMirrorTokenExpirationDays: 30,
          getInternalOrPublicGitlabUrl: () => 'https://gitlab.internal',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('gitlab-client', () => {
  let service: GitlabClientService

  beforeEach(async () => {
    mockReset(gitlabMock)
    const module: TestingModule = await createGitlabClientServiceTestingModule().compile()
    service = module.get(GitlabClientService)
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

      gitlabMock.Groups.create.mockResolvedValue({ id: infraGroupId, full_path: 'forge/infra' } as ExpandedGroupSchema)

      const gitlabProjectsAllMock = gitlabMock.Projects.all as MockedFunction<typeof gitlabMock.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      gitlabMock.Projects.create.mockResolvedValue({
        id: projectId,
        path_with_namespace: 'forge/infra/zone-1',
        http_url_to_repo: 'https://gitlab.internal/infra/zone-1.git',
      } as ProjectSchema)

      const result = await service.getOrCreateInfraGroupRepo(zoneSlug)

      expect(result).toEqual({
        id: projectId,
        http_url_to_repo: 'https://gitlab.internal/infra/zone-1.git',
        path_with_namespace: 'forge/infra/zone-1',
      })
      expect(gitlabMock.Groups.create).toHaveBeenCalledWith('infra', 'infra', expect.any(Object))
      expect(gitlabMock.GroupCustomAttributes.set).toHaveBeenCalledWith(infraGroupId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
      expect(gitlabMock.GroupCustomAttributes.set).toHaveBeenCalledWith(infraGroupId, INFRA_GROUP_CUSTOM_ATTRIBUTE_KEY, 'true')
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
      const repo = { id: repoId } as any
      const content = 'content'
      const filePath = 'file.txt'
      const message = 'ci: :robot_face: Update file content'

      const gitlabRepositoryFilesShowMock = gitlabMock.RepositoryFiles.show as MockedFunction<typeof gitlabMock.RepositoryFiles.show>
      const notFoundError = new GitbeakerRequestError('Not Found', { cause: { description: '404 File Not Found' } } as any)
      gitlabRepositoryFilesShowMock.mockRejectedValue(notFoundError)

      const action = await service.generateCreateOrUpdateAction(repo, 'main', filePath, content)
      await service.maybeCreateCommit(repo, message, action ? [action] : [])

      expect(gitlabMock.Commits.create).toHaveBeenCalledWith(
        repoId,
        'main',
        message,
        [{ action: 'create', filePath, content }],
      )
    })

    it('should update commit if content differs', async () => {
      const repoId = 1
      const repo = { id: repoId } as any
      const content = 'new content'
      const filePath = 'file.txt'
      const oldHash = 'oldhash'
      const message = 'ci: :robot_face: Update file content'

      const gitlabRepositoryFilesShowMock = gitlabMock.RepositoryFiles.show as MockedFunction<typeof gitlabMock.RepositoryFiles.show>
      gitlabRepositoryFilesShowMock.mockResolvedValue({
        content_sha256: oldHash,
      } as RepositoryFileExpandedSchema)

      const action = await service.generateCreateOrUpdateAction(repo, 'main', filePath, content)
      await service.maybeCreateCommit(repo, message, action ? [action] : [])

      expect(gitlabMock.Commits.create).toHaveBeenCalledWith(
        repoId,
        'main',
        message,
        [{ action: 'update', filePath, content }],
      )
    })

    it('should do nothing if content matches', async () => {
      const repoId = 1
      const repo = { id: repoId } as any
      const content = 'content'
      const filePath = 'file.txt'
      const hash = 'ed7002b439e9ac845f22357d822bac1444730fbdb6016d3ec9432297b9ec9f73'
      const message = 'ci: :robot_face: Update file content'

      const gitlabRepositoryFilesShowMock = gitlabMock.RepositoryFiles.show as MockedFunction<typeof gitlabMock.RepositoryFiles.show>
      gitlabRepositoryFilesShowMock.mockResolvedValue({
        content_sha256: hash,
      } as RepositoryFileExpandedSchema)

      const action = await service.generateCreateOrUpdateAction(repo, 'main', filePath, content)
      await service.maybeCreateCommit(repo, message, action ? [action] : [])

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
      expect(gitlabMock.GroupCustomAttributes.set).toHaveBeenCalledWith(groupId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
      expect(gitlabMock.GroupCustomAttributes.set).toHaveBeenCalledWith(groupId, PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY, projectSlug)
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

      const result = await service.getOrCreateProjectGroupInternalRepoUrl(projectSlug, repoName)
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

    it('should set managed custom attribute when upserting a project repo', async () => {
      const projectSlug = 'project-1'
      const repoName = 'repo-1'
      const repoId = 101

      gitlabMock.Projects.show.mockResolvedValue({ id: repoId } as any)
      gitlabMock.Projects.edit.mockResolvedValue({ id: repoId, name: repoName } as ProjectSchema)

      const result = await service.upsertProjectGroupRepo(projectSlug, repoName, 'desc')

      expect(result).toEqual({ id: repoId, name: repoName })
      expect(gitlabMock.ProjectCustomAttributes.set).toHaveBeenCalledWith(repoId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
    })

    describe('upsertUser', () => {
      it('should create user and set custom attribute if not exists', async () => {
        const consoleUser = { id: 'u1', email: 'new@example.com', firstName: 'New', lastName: 'User' }
        const gitlabUsersAllMock = gitlabMock.Users.all as MockedFunction<typeof gitlabMock.Users.all>
        gitlabUsersAllMock.mockResolvedValue([])
        gitlabMock.Users.create.mockResolvedValue(makeExpandedUserSchema({ id: 999, email: consoleUser.email }))

        const result = await service.upsertUser(consoleUser)

        expect(result).toEqual(expect.objectContaining({ id: 999, email: consoleUser.email }))
        expect(gitlabMock.UserCustomAttributes.set).toHaveBeenCalledWith(999, USER_ID_CUSTOM_ATTRIBUTE_KEY, consoleUser.id)
      })

      it('should set custom attribute if user exists', async () => {
        const consoleUser = { id: 'u1', email: 'existing@example.com', firstName: 'Existing', lastName: 'User' }
        const gitlabUsersAllMock = gitlabMock.Users.all as MockedFunction<typeof gitlabMock.Users.all>
        gitlabUsersAllMock.mockResolvedValue([makeExpandedUserSchema({ id: 1000, email: consoleUser.email })])

        const result = await service.upsertUser(consoleUser)

        expect(result).toEqual(expect.objectContaining({ id: 1000, email: consoleUser.email }))
        expect(gitlabMock.UserCustomAttributes.set).toHaveBeenCalledWith(1000, USER_ID_CUSTOM_ATTRIBUTE_KEY, consoleUser.id)
        expect(gitlabMock.Users.create).not.toHaveBeenCalled()
      })
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
      const group = { id: groupId } as any
      const members = [{ id: 1, name: 'user' } as MemberSchema]
      const gitlabGroupMembersAllMock = gitlabMock.GroupMembers.all as MockedFunction<typeof gitlabMock.GroupMembers.all>
      gitlabGroupMembersAllMock.mockResolvedValue(members)

      const result = await service.getGroupMembers(group)
      expect(result).toEqual(members)
      expect(gitlabMock.GroupMembers.all).toHaveBeenCalledWith(groupId)
    })

    it('should add group member', async () => {
      const groupId = 1
      const group = { id: groupId } as any
      const userId = 2
      const accessLevel = 30
      gitlabMock.GroupMembers.add.mockResolvedValue({ id: userId } as MemberSchema)

      await service.addGroupMember(group, userId, accessLevel)
      expect(gitlabMock.GroupMembers.add).toHaveBeenCalledWith(groupId, userId, accessLevel)
    })

    it('should remove group member', async () => {
      const groupId = 1
      const group = { id: groupId } as any
      const userId = 2
      gitlabMock.GroupMembers.remove.mockResolvedValue(undefined)

      await service.removeGroupMember(group, userId)
      expect(gitlabMock.GroupMembers.remove).toHaveBeenCalledWith(groupId, userId)
    })
  })

  describe('createProjectMirrorAccessToken', () => {
    it('should create project access token with correct scopes', async () => {
      const projectSlug = 'project-1'
      const groupId = 456
      const tokenName = `${projectSlug}-bot`
      const token = { id: 1, name: tokenName, token: 'secret-token' }

      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: 123, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
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

      const gitlabProjectsAllMock = gitlabMock.Projects.all as MockedFunction<typeof gitlabMock.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      const gitlabGroupsAllMock = gitlabMock.Groups.all as MockedFunction<typeof gitlabMock.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })

      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: subGroupPath, parent_id: rootId, full_path: `forge/${subGroupPath}` }],
        paginationInfo: { next: null },
      })

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
      const repo = { id: repoId } as any
      const filePath = 'file.txt'
      const ref = 'main'
      const file = { content: 'content' }

      gitlabMock.RepositoryFiles.show.mockResolvedValue(file as any)

      const result = await service.getFile(repo, filePath, ref)
      expect(result).toEqual(file)
    })

    it('should return undefined on 404', async () => {
      const repoId = 1
      const repo = { id: repoId } as any
      const filePath = 'file.txt'
      const ref = 'main'
      const error = new GitbeakerRequestError('Not Found', { cause: { description: '404 File Not Found' } } as any)

      gitlabMock.RepositoryFiles.show.mockRejectedValue(error)

      const result = await service.getFile(repo, filePath, ref)
      expect(result).toBeUndefined()
    })

    it('should throw on other errors', async () => {
      const repoId = 1
      const repo = { id: repoId } as any
      const filePath = 'file.txt'
      const ref = 'main'
      const error = new Error('Some other error')

      gitlabMock.RepositoryFiles.show.mockRejectedValue(error)

      await expect(service.getFile(repo, filePath, ref)).rejects.toThrow(error)
    })
  })

  describe('listFiles', () => {
    it('should return files', async () => {
      const repoId = 1
      const repo = { id: repoId } as any
      const files = [{ path: 'file.txt' }]

      gitlabMock.Repositories.allRepositoryTrees.mockResolvedValue(files as any)

      const result = await service.listFiles(repo)
      expect(result).toEqual(files)
    })

    it('should return empty array on 404', async () => {
      const repoId = 1
      const repo = { id: repoId } as any
      const error = new GitbeakerRequestError('Not Found', { cause: { description: '404 Tree Not Found' } } as any)

      gitlabMock.Repositories.allRepositoryTrees.mockRejectedValue(error)

      const result = await service.listFiles(repo)
      expect(result).toEqual([])
    })
  })

  describe('getProjectToken', () => {
    it('should return specific token', async () => {
      const projectSlug = 'project-1'
      const groupId = 456
      const tokenName = `${projectSlug}-bot`
      const token = { id: 1, name: tokenName }

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
      const user = makeExpandedUserSchema({ id: 1, username })

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
