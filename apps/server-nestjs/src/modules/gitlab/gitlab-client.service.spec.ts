import type { Gitlab as GitlabApi } from '@gitbeaker/core'
import type { ConfigType } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import type { MockedFunction } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { GITLAB_REST_CLIENT, GitlabClientService } from './gitlab-client.service'
import {
  makeAccessTokenExposedSchema,
  makeAccessTokenSchema,
  makeExpandedGroupSchema,
  makeExpandedUserSchema,
  makeGitbeakerRequestError,
  makeGroupSchema,
  makeMemberSchema,
  makeOffsetPagination,
  makePipeline,
  makePipelineTriggerToken,
  makeProjectSchema,
  makeRepositoryFileExpandedSchema,
  makeRepositoryTreeSchema,
} from './gitlab-testing.utils'
import {
  GITLAB_CI_CONFIG_PATH,
  GROUP_ROOT_CUSTOM_ATTRIBUTE_KEY,
  INFRA_GROUP_CUSTOM_ATTRIBUTE_KEY,
  MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY,
  PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY,
  SPECIAL_REPO_NAMES,
  USER_ID_CUSTOM_ATTRIBUTE_KEY,
} from './gitlab.constants'

describe('gitlab-client', () => {
  let service: GitlabClientService
  let gitlabApi: DeepMockProxy<GitlabApi>

  beforeEach(async () => {
    gitlabApi = mockDeep<GitlabApi>()
    const config = mockDeep<ConfigType<typeof gitlabConfigFactory>>({
      url: 'https://gitlab.internal',
      token: 'token',
      internalUrl: 'https://gitlab.internal',
      projectRootDir: 'forge',
      mirrorTokenExpirationDays: 30,
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitlabClientService,
        { provide: GITLAB_REST_CLIENT, useValue: gitlabApi },
        { provide: gitlabConfigFactory.KEY, useValue: config },
      ],
    }).compile()
    service = module.get(GitlabClientService)
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })

      gitlabApi.Groups.show.mockResolvedValueOnce(makeExpandedGroupSchema({ id: rootId, full_path: 'forge' }))

      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      gitlabApi.Groups.create.mockResolvedValue(makeExpandedGroupSchema({ id: infraGroupId, full_path: 'forge/infra' }))

      const gitlabProjectsAllMock = gitlabApi.Projects.all as MockedFunction<typeof gitlabApi.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      gitlabApi.Projects.create.mockResolvedValue(makeProjectSchema({
        id: projectId,
        path_with_namespace: 'forge/infra/zone-1',
        http_url_to_repo: 'https://gitlab.internal/infra/zone-1.git',
      }))

      const result = await service.getOrCreateInfraGroupRepo(zoneSlug)

      expect(result).toEqual(expect.objectContaining({
        id: projectId,
        http_url_to_repo: 'https://gitlab.internal/infra/zone-1.git',
        path_with_namespace: 'forge/infra/zone-1',
      }))
      expect(gitlabApi.Groups.create).toHaveBeenCalledWith('infra', 'infra', expect.any(Object))
      expect(gitlabApi.GroupCustomAttributes.set).toHaveBeenCalledWith(rootId, GROUP_ROOT_CUSTOM_ATTRIBUTE_KEY, 'true')
      expect(gitlabApi.GroupCustomAttributes.set).toHaveBeenCalledWith(infraGroupId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
      expect(gitlabApi.GroupCustomAttributes.set).toHaveBeenCalledWith(infraGroupId, INFRA_GROUP_CUSTOM_ATTRIBUTE_KEY, 'true')
      expect(gitlabApi.Projects.create).toHaveBeenCalledWith(expect.objectContaining({
        name: zoneSlug,
        path: zoneSlug,
        namespaceId: infraGroupId,
      }))
      expect(gitlabApi.ProjectCustomAttributes.set).toHaveBeenCalledWith(projectId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
    })
  })

  describe('commitCreateOrUpdate', () => {
    it('should create commit if file not exists', async () => {
      const repoId = 1
      const repo = makeProjectSchema({ id: repoId })
      const content = 'content'
      const filePath = 'file.txt'
      const message = 'ci: :robot_face: Update file content'

      const gitlabRepositoryFilesShowMock = gitlabApi.RepositoryFiles.show as MockedFunction<typeof gitlabApi.RepositoryFiles.show>
      const notFoundError = makeGitbeakerRequestError({ description: '404 File Not Found' })
      gitlabRepositoryFilesShowMock.mockRejectedValue(notFoundError)

      const action = await service.generateCreateOrUpdateAction(repo, 'main', filePath, content)
      await service.maybeCreateCommit(repo, message, action ? [action] : [])

      expect(gitlabApi.Commits.create).toHaveBeenCalledWith(
        repoId,
        'main',
        message,
        [{ action: 'create', filePath, content }],
      )
    })

    it('should update commit if content differs', async () => {
      const repoId = 1
      const repo = makeProjectSchema({ id: repoId })
      const content = 'new content'
      const filePath = 'file.txt'
      const oldHash = 'oldhash'
      const message = 'ci: :robot_face: Update file content'

      const gitlabRepositoryFilesShowMock = gitlabApi.RepositoryFiles.show as MockedFunction<typeof gitlabApi.RepositoryFiles.show>
      gitlabRepositoryFilesShowMock.mockResolvedValue(makeRepositoryFileExpandedSchema({ content_sha256: oldHash }))

      const action = await service.generateCreateOrUpdateAction(repo, 'main', filePath, content)
      await service.maybeCreateCommit(repo, message, action ? [action] : [])

      expect(gitlabApi.Commits.create).toHaveBeenCalledWith(
        repoId,
        'main',
        message,
        [{ action: 'update', filePath, content }],
      )
    })

    it('should do nothing if content matches', async () => {
      const repoId = 1
      const repo = makeProjectSchema({ id: repoId })
      const content = 'content'
      const filePath = 'file.txt'
      const hash = 'ed7002b439e9ac845f22357d822bac1444730fbdb6016d3ec9432297b9ec9f73'
      const message = 'ci: :robot_face: Update file content'

      const gitlabRepositoryFilesShowMock = gitlabApi.RepositoryFiles.show as MockedFunction<typeof gitlabApi.RepositoryFiles.show>
      gitlabRepositoryFilesShowMock.mockResolvedValue(makeRepositoryFileExpandedSchema({ content_sha256: hash }))

      const action = await service.generateCreateOrUpdateAction(repo, 'main', filePath, content)
      await service.maybeCreateCommit(repo, message, action ? [action] : [])

      expect(gitlabApi.Commits.create).not.toHaveBeenCalled()
    })
  })

  describe('getOrCreateProjectGroup', () => {
    it('should create project group if not exists', async () => {
      const projectSlug = 'project-1'
      const rootId = 123
      const groupId = 456

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
      gitlabApi.Groups.show.mockResolvedValueOnce(makeExpandedGroupSchema({ id: rootId, full_path: 'forge' }))
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })
      gitlabApi.Groups.create.mockResolvedValue(makeExpandedGroupSchema({ id: groupId, name: projectSlug, path: projectSlug, full_path: `forge/${projectSlug}` }))

      const result = await service.getOrCreateProjectSubGroup(projectSlug)

      expect(result).toEqual(expect.objectContaining({ id: groupId, name: projectSlug }))
      expect(gitlabApi.Groups.create).toHaveBeenCalledWith(projectSlug, projectSlug, expect.objectContaining({
        parentId: rootId,
      }))
      expect(gitlabApi.GroupCustomAttributes.set).toHaveBeenCalledWith(groupId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
      expect(gitlabApi.GroupCustomAttributes.set).toHaveBeenCalledWith(groupId, PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY, projectSlug)
    })

    it('should return existing group', async () => {
      const projectSlug = 'project-1'
      const rootId = 123
      const groupId = 456

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
      gitlabApi.Groups.show.mockResolvedValueOnce(makeExpandedGroupSchema({ id: rootId, full_path: 'forge' }))
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: projectSlug, parent_id: rootId, full_path: 'forge/project-1' }],
        paginationInfo: { next: null },
      })

      const result = await service.getOrCreateProjectSubGroup(projectSlug)

      expect(result).toEqual({ id: groupId, name: projectSlug, parent_id: rootId, full_path: 'forge/project-1' })
      expect(gitlabApi.Groups.create).not.toHaveBeenCalled()
    })
  })

  describe('repositories', () => {
    it('should return internal repo url', async () => {
      const projectSlug = 'project-1'
      const repoName = 'repo-1'
      const rootId = 123
      const groupId = 1

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
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

      const gitlabProjectsAllMock = gitlabApi.Projects.all as MockedFunction<typeof gitlabApi.Projects.all>
      gitlabProjectsAllMock.mockResolvedValue({
        data: [{ id: repoId, path_with_namespace: 'forge/project-1/mirror' }],
        paginationInfo: { next: null },
      })

      gitlabApi.Projects.edit.mockResolvedValue(makeProjectSchema({ id: repoId, name: 'mirror' }))

      const result = await service.upsertProjectMirrorRepo(projectSlug)

      expect(result).toEqual(expect.objectContaining({ id: repoId, name: 'mirror' }))
      expect(gitlabApi.Projects.edit).toHaveBeenCalledWith(repoId, expect.objectContaining({
        name: 'mirror',
        path: 'mirror',
        ciConfigPath: '',
      }))
    })

    it('should set managed custom attribute when upserting a project repo', async () => {
      const projectSlug = 'project-1'
      const repoName = 'repo-1'
      const repoId = 101

      gitlabApi.Projects.show.mockResolvedValue(makeProjectSchema({ id: repoId }))
      gitlabApi.Projects.edit.mockResolvedValue(makeProjectSchema({ id: repoId, name: repoName }))

      const result = await service.upsertProjectGroupRepo(projectSlug, repoName, 'desc')

      expect(result).toEqual(expect.objectContaining({ id: repoId, name: repoName }))
      expect(gitlabApi.ProjectCustomAttributes.set).toHaveBeenCalledWith(repoId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
    })

    describe('triggerMirror', () => {
      const projectSlug = 'project-1'
      const mirrorId = 10

      function mockProjectGroupRepos(repos: { id: number, name: string }[]) {
        const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
        gitlabGroupsAllMock.mockResolvedValueOnce({
          data: [{ id: 123, full_path: 'forge' }],
          paginationInfo: { next: null },
        })
        gitlabGroupsAllMock.mockResolvedValueOnce({
          data: [{ id: 1, full_path: `forge/${projectSlug}` }],
          paginationInfo: { next: null },
        })
        const gitlabGroupsAllProjectsMock = gitlabApi.Groups.allProjects as MockedFunction<typeof gitlabApi.Groups.allProjects>
        gitlabGroupsAllProjectsMock.mockResolvedValue({
          data: repos,
          paginationInfo: { next: null },
        })
      }

      const populatedGroup = [
        { id: 9, name: 'infra-apps' },
        { id: mirrorId, name: 'mirror' },
        { id: 11, name: 'repo-1' },
        { id: 12, name: 'repo-2' },
      ]

      it('should start the pipeline on the mirror repo with the target as variable', async () => {
        mockProjectGroupRepos(populatedGroup)
        gitlabApi.Pipelines.create.mockResolvedValue(makePipeline({ id: 42 }))

        const pipeline = await service.triggerMirror(projectSlug, 'repo-1', false, 'feat/x')

        expect(pipeline.id).toBe(42)
        // The pipeline runs on the *mirror* repo, never on the target itself.
        expect(gitlabApi.Pipelines.create).toHaveBeenCalledWith(mirrorId, 'main', {
          variables: [
            { key: 'SYNC_ALL', value: 'false' },
            { key: 'GIT_BRANCH_DEPLOY', value: 'feat/x' },
            { key: 'PROJECT_NAME', value: 'repo-1' },
          ],
        })
      })

      it('should send an empty branch when syncing every branch', async () => {
        mockProjectGroupRepos(populatedGroup)
        gitlabApi.Pipelines.create.mockResolvedValue(makePipeline())

        await service.triggerMirror(projectSlug, 'repo-1', true)

        expect(gitlabApi.Pipelines.create).toHaveBeenCalledWith(mirrorId, 'main', {
          variables: [
            { key: 'SYNC_ALL', value: 'true' },
            { key: 'GIT_BRANCH_DEPLOY', value: '' },
            { key: 'PROJECT_NAME', value: 'repo-1' },
          ],
        })
      })

      it.each(SPECIAL_REPO_NAMES)('should refuse to mirror the special repository %s', async (specialRepo) => {
        await expect(service.triggerMirror(projectSlug, specialRepo, true))
          .rejects.toThrow('User requested for invalid mirroring')
        expect(gitlabApi.Pipelines.create).not.toHaveBeenCalled()
      })

      it('should fail when the target repository is absent from the group', async () => {
        mockProjectGroupRepos([{ id: mirrorId, name: 'mirror' }, { id: 12, name: 'repo-2' }])

        await expect(service.triggerMirror(projectSlug, 'repo-1', true))
          .rejects.toThrow('Unable to find target repository')
        expect(gitlabApi.Pipelines.create).not.toHaveBeenCalled()
      })

      it('should fail when the project group has no mirror repository', async () => {
        mockProjectGroupRepos([{ id: 11, name: 'repo-1' }, { id: 12, name: 'repo-2' }])

        await expect(service.triggerMirror(projectSlug, 'repo-1', true))
          .rejects.toThrow('Unable to find mirror repository')
        expect(gitlabApi.Pipelines.create).not.toHaveBeenCalled()
      })
    })

    describe('upsertUser', () => {
      it('should create user and set custom attribute if not exists', async () => {
        const consoleUser = { id: 'u1', email: 'new@example.com', firstName: 'New', lastName: 'User' }
        const gitlabUser = {
          email: consoleUser.email,
          username: 'new',
          name: 'New User',
        }
        const gitlabUsersAllMock = gitlabApi.Users.all as MockedFunction<typeof gitlabApi.Users.all>
        gitlabUsersAllMock.mockResolvedValue([])
        gitlabApi.Users.create.mockResolvedValue(makeExpandedUserSchema({ id: 999, email: consoleUser.email }))

        const result = await service.upsertUser(gitlabUser, { cpnUserId: consoleUser.id })

        expect(result).toEqual(expect.objectContaining({ id: 999, email: consoleUser.email }))
        expect(gitlabApi.Users.create).toHaveBeenCalledWith(expect.objectContaining({
          email: 'new@example.com',
          username: 'new',
          name: 'New User',
          externUid: 'new@example.com',
          provider: 'openid_connect',
          skipConfirmation: true,
        }))
        expect(gitlabApi.UserCustomAttributes.set).toHaveBeenCalledWith(999, USER_ID_CUSTOM_ATTRIBUTE_KEY, consoleUser.id)
        expect(gitlabApi.UserCustomAttributes.set).toHaveBeenCalledWith(999, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
      })

      it('should set custom attribute if user exists', async () => {
        const consoleUser = { id: 'u1', email: 'existing@example.com', firstName: 'Existing', lastName: 'User' }
        const gitlabUser = {
          email: consoleUser.email,
          username: 'existing',
          name: 'Existing User',
        }
        const gitlabUsersAllMock = gitlabApi.Users.all as MockedFunction<typeof gitlabApi.Users.all>
        gitlabUsersAllMock.mockResolvedValue([makeExpandedUserSchema({ id: 1000, email: consoleUser.email })])

        const result = await service.upsertUser(gitlabUser, { cpnUserId: consoleUser.id })

        expect(result).toEqual(expect.objectContaining({ id: 1000, email: consoleUser.email }))
        expect(gitlabApi.Users.edit).toHaveBeenCalledWith(1000, expect.objectContaining({
          email: 'existing@example.com',
          username: 'existing',
          name: 'Existing User',
          externUid: 'existing@example.com',
          provider: 'openid_connect',
        }))
        expect(gitlabApi.UserCustomAttributes.set).toHaveBeenCalledWith(1000, USER_ID_CUSTOM_ATTRIBUTE_KEY, consoleUser.id)
        expect(gitlabApi.UserCustomAttributes.set).toHaveBeenCalledWith(1000, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
        expect(gitlabApi.Users.create).not.toHaveBeenCalled()
      })

      it('should set admin flag when provided', async () => {
        const consoleUser = { id: 'u1', email: 'admin@example.com', firstName: 'Admin', lastName: 'User' }
        const gitlabUser = {
          email: consoleUser.email,
          username: 'admin',
          name: 'Admin User',
        }
        const gitlabUsersAllMock = gitlabApi.Users.all as MockedFunction<typeof gitlabApi.Users.all>
        gitlabUsersAllMock.mockResolvedValue([])
        gitlabApi.Users.create.mockResolvedValue(makeExpandedUserSchema({ id: 999, email: consoleUser.email }))

        await service.upsertUser({ ...gitlabUser, admin: true }, { cpnUserId: consoleUser.id })

        expect(gitlabApi.Users.create).toHaveBeenCalledWith(expect.objectContaining({
          email: 'admin@example.com',
          username: 'admin',
          name: 'Admin User',
          externUid: 'admin@example.com',
          provider: 'openid_connect',
          admin: true,
          skipConfirmation: true,
        }))
      })

      it('should not disable existing admin flag when enabling auditor flag', async () => {
        const consoleUser = { id: 'u1', email: 'admin-auditor@example.com', firstName: 'Admin', lastName: 'Auditor' }
        const gitlabUser = {
          email: consoleUser.email,
          username: 'admin-auditor',
          name: 'Admin Auditor',
        }
        const gitlabUsersAllMock = gitlabApi.Users.all as MockedFunction<typeof gitlabApi.Users.all>
        gitlabUsersAllMock.mockResolvedValue([
          makeExpandedUserSchema({ id: 1000, email: consoleUser.email, is_admin: true }),
        ])

        await service.upsertUser({ ...gitlabUser, auditor: true }, { cpnUserId: consoleUser.id })

        expect(gitlabApi.Users.edit).toHaveBeenCalledWith(1000, expect.not.objectContaining({
          admin: true,
        }))
      })

      it('should not disable existing auditor flag when enabling admin flag', async () => {
        const consoleUser = { id: 'u1', email: 'auditor-admin@example.com', firstName: 'Auditor', lastName: 'Admin' }
        const gitlabUser = {
          email: consoleUser.email,
          username: 'auditor-admin',
          name: 'Auditor Admin',
        }
        const gitlabUsersAllMock = gitlabApi.Users.all as MockedFunction<typeof gitlabApi.Users.all>
        gitlabUsersAllMock.mockResolvedValue([
          makeExpandedUserSchema({ id: 1000, email: consoleUser.email, is_auditor: true }),
        ])

        await service.upsertUser({ ...gitlabUser, admin: true }, { cpnUserId: consoleUser.id })

        expect(gitlabApi.Users.edit).toHaveBeenCalledWith(1000, expect.not.objectContaining({
          auditor: true,
        }))
      })
    })

    it('should create pipeline trigger token if not exists', async () => {
      const projectSlug = 'project-1'
      const repoId = 1
      const tokenDescription = 'mirroring-from-external-repo'

      const gitlabProjectsAllMock = gitlabApi.Projects.all as MockedFunction<typeof gitlabApi.Projects.all>
      gitlabProjectsAllMock.mockResolvedValue({
        data: [{ id: repoId, path_with_namespace: 'forge/project-1/mirror' }],
        paginationInfo: { next: null },
      })
      gitlabApi.Projects.edit.mockResolvedValue(makeProjectSchema({ id: repoId, name: 'mirror' }))

      const gitlabPipelineTriggerTokensAllMock = gitlabApi.PipelineTriggerTokens.all as MockedFunction<typeof gitlabApi.PipelineTriggerTokens.all>
      gitlabPipelineTriggerTokensAllMock.mockResolvedValue({
        data: [],
        paginationInfo: makeOffsetPagination({ next: null }),
      })

      gitlabApi.PipelineTriggerTokens.create.mockResolvedValue(makePipelineTriggerToken({ id: 2, description: tokenDescription }))

      const result = await service.getOrCreateMirrorPipelineTriggerToken(projectSlug)

      expect(result).toEqual(expect.objectContaining({ id: 2, description: tokenDescription }))
      expect(gitlabApi.PipelineTriggerTokens.create).toHaveBeenCalledWith(repoId, tokenDescription)
    })
  })

  describe('group Members', () => {
    it('should get group members', async () => {
      const groupId = 1
      const group = makeGroupSchema({ id: groupId })
      const members = [makeMemberSchema({ id: 1, name: 'user' })]
      const gitlabGroupMembersAllMock = gitlabApi.GroupMembers.all as MockedFunction<typeof gitlabApi.GroupMembers.all>
      gitlabGroupMembersAllMock.mockResolvedValue(members)

      const result = await service.getGroupMembers(group)
      expect(result).toEqual(members)
      expect(gitlabApi.GroupMembers.all).toHaveBeenCalledWith(groupId)
    })

    it('should add group member', async () => {
      const groupId = 1
      const group = makeGroupSchema({ id: groupId })
      const userId = 2
      const accessLevel = 30
      gitlabApi.GroupMembers.add.mockResolvedValue(makeMemberSchema({ id: userId }))

      await service.addGroupMember(group, userId, accessLevel)
      expect(gitlabApi.GroupMembers.add).toHaveBeenCalledWith(groupId, userId, accessLevel)
    })

    it('should remove group member', async () => {
      const groupId = 1
      const group = makeGroupSchema({ id: groupId })
      const userId = 2
      gitlabApi.GroupMembers.remove.mockResolvedValue(undefined)

      await service.removeGroupMember(group, userId)
      expect(gitlabApi.GroupMembers.remove).toHaveBeenCalledWith(groupId, userId)
    })
  })

  describe('createProjectMirrorAccessToken', () => {
    it('should create project access token with correct scopes', async () => {
      const projectSlug = 'project-1'
      const groupId = 456
      const tokenName = `${projectSlug}-bot`
      const token = makeAccessTokenExposedSchema({ id: 1, name: tokenName, token: 'secret-token' })

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: 123, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
      gitlabApi.Groups.show.mockResolvedValueOnce(makeExpandedGroupSchema({ id: 123, full_path: 'forge' }))

      const gitlabGroupsAllSubgroupsMock = gitlabApi.Groups.allSubgroups as MockedFunction<typeof gitlabApi.Groups.allSubgroups>
      gitlabGroupsAllSubgroupsMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: projectSlug, parent_id: 123, full_path: 'forge/project-1' }],
        paginationInfo: { next: null },
      })

      gitlabApi.GroupAccessTokens.create.mockResolvedValue(token)

      const result = await service.createMirrorAccessToken(projectSlug)

      expect(result).toEqual(token)
      expect(gitlabApi.GroupAccessTokens.create).toHaveBeenCalledWith(
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

      const gitlabProjectsAllMock = gitlabApi.Projects.all as MockedFunction<typeof gitlabApi.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [{ id: projectId, path_with_namespace: `forge/${fullPath}` }],
        paginationInfo: { next: null },
      })

      const result = await service.getOrCreateProjectGroupRepo(subGroupPath, fullPath)

      expect(result).toEqual(expect.objectContaining({ id: projectId }))
      expect(gitlabApi.ProjectCustomAttributes.set).toHaveBeenCalledWith(projectId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
      expect(gitlabApi.ProjectCustomAttributes.set).toHaveBeenCalledWith(projectId, PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY, 'project-1')
    })

    it('should create repo if not exists', async () => {
      const subGroupPath = 'project-1'
      const repoName = 'repo-1'
      const fullPath = `${subGroupPath}/${repoName}`
      const projectId = 789
      const groupId = 456
      const rootId = 123

      const gitlabProjectsAllMock = gitlabApi.Projects.all as MockedFunction<typeof gitlabApi.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })

      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: subGroupPath, parent_id: rootId, full_path: `forge/${subGroupPath}` }],
        paginationInfo: { next: null },
      })

      gitlabApi.Projects.create.mockResolvedValue(makeProjectSchema({ id: projectId, name: repoName }))

      const result = await service.getOrCreateProjectGroupRepo(subGroupPath, fullPath)

      expect(result).toEqual(expect.objectContaining({ id: projectId }))
      expect(gitlabApi.Projects.create).toHaveBeenCalledWith(expect.objectContaining({
        name: repoName,
        path: repoName,
        namespaceId: groupId,
      }))
      expect(gitlabApi.ProjectCustomAttributes.set).toHaveBeenCalledWith(projectId, MANAGED_BY_CONSOLE_CUSTOM_ATTRIBUTE_KEY, 'true')
      expect(gitlabApi.ProjectCustomAttributes.set).toHaveBeenCalledWith(projectId, PROJECT_GROUP_CUSTOM_ATTRIBUTE_KEY, 'project-1')
    })

    it('should create repo with a custom ciConfigPath when provided', async () => {
      const subGroupPath = 'project-1'
      const repoName = 'repo-1'
      const fullPath = `${subGroupPath}/${repoName}`
      const projectId = 789
      const groupId = 456
      const rootId = 123

      const gitlabProjectsAllMock = gitlabApi.Projects.all as MockedFunction<typeof gitlabApi.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })

      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: subGroupPath, parent_id: rootId, full_path: `forge/${subGroupPath}` }],
        paginationInfo: { next: null },
      })

      gitlabApi.Projects.create.mockResolvedValue(makeProjectSchema({ id: projectId, name: repoName }))

      const result = await service.getOrCreateProjectGroupRepo(subGroupPath, fullPath, GITLAB_CI_CONFIG_PATH)

      expect(result).toEqual(expect.objectContaining({ id: projectId }))
      expect(gitlabApi.Projects.create).toHaveBeenCalledWith(expect.objectContaining({
        ciConfigPath: GITLAB_CI_CONFIG_PATH,
      }))
    })

    it('should create repo without a ciConfigPath when none is provided', async () => {
      const subGroupPath = 'project-1'
      const repoName = 'repo-1'
      const fullPath = `${subGroupPath}/${repoName}`
      const projectId = 789
      const groupId = 456
      const rootId = 123

      const gitlabProjectsAllMock = gitlabApi.Projects.all as MockedFunction<typeof gitlabApi.Projects.all>
      gitlabProjectsAllMock.mockResolvedValueOnce({
        data: [],
        paginationInfo: { next: null },
      })

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: rootId, full_path: 'forge' }],
        paginationInfo: { next: null },
      })

      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: subGroupPath, parent_id: rootId, full_path: `forge/${subGroupPath}` }],
        paginationInfo: { next: null },
      })

      gitlabApi.Projects.create.mockResolvedValue(makeProjectSchema({ id: projectId, name: repoName }))

      const result = await service.getOrCreateProjectGroupRepo(subGroupPath, fullPath)

      expect(result).toEqual(expect.objectContaining({ id: projectId }))
      expect(gitlabApi.Projects.create).not.toHaveBeenCalledWith(expect.objectContaining({
        ciConfigPath: expect.anything(),
      }))
    })
  })

  describe('getFile', () => {
    it('should return file content', async () => {
      const repoId = 1
      const repo = makeProjectSchema({ id: repoId })
      const filePath = 'file.txt'
      const ref = 'main'
      const file = makeRepositoryFileExpandedSchema({ content: 'content' })

      gitlabApi.RepositoryFiles.show.mockResolvedValue(file)

      const result = await service.getFile(repo, filePath, ref)
      expect(result).toEqual(file)
    })

    it('should return undefined on 404', async () => {
      const repoId = 1
      const repo = makeProjectSchema({ id: repoId })
      const filePath = 'file.txt'
      const ref = 'main'
      const error = makeGitbeakerRequestError({ description: '404 File Not Found' })

      gitlabApi.RepositoryFiles.show.mockRejectedValue(error)

      const result = await service.getFile(repo, filePath, ref)
      expect(result).toBeUndefined()
    })

    it('should throw on other errors', async () => {
      const repoId = 1
      const repo = makeProjectSchema({ id: repoId })
      const filePath = 'file.txt'
      const ref = 'main'
      const error = new Error('Some other error')

      gitlabApi.RepositoryFiles.show.mockRejectedValue(error)

      await expect(service.getFile(repo, filePath, ref)).rejects.toThrow(error)
    })
  })

  describe('listFiles', () => {
    it('should return files', async () => {
      const repoId = 1
      const repo = makeProjectSchema({ id: repoId })
      const files = [makeRepositoryTreeSchema({ path: 'file.txt' })]

      gitlabApi.Repositories.allRepositoryTrees.mockResolvedValue(files)

      const result = await service.listFiles(repo)
      expect(result).toEqual(files)
    })

    it('should return empty array on 404', async () => {
      const repoId = 1
      const repo = makeProjectSchema({ id: repoId })
      const error = makeGitbeakerRequestError({ description: '404 Tree Not Found' })

      gitlabApi.Repositories.allRepositoryTrees.mockRejectedValue(error)

      const result = await service.listFiles(repo)
      expect(result).toEqual([])
    })
  })

  describe('getProjectToken', () => {
    it('should return specific token', async () => {
      const projectSlug = 'project-1'
      const groupId = 456
      const group = makeGroupSchema({ id: groupId })
      const tokenName = `${projectSlug}-bot`
      const token = makeAccessTokenSchema({ id: 1, name: tokenName })

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: 123, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
      gitlabApi.Groups.show.mockResolvedValueOnce(makeExpandedGroupSchema({ id: 123, full_path: 'forge' }))
      const gitlabGroupsAllSubgroupsMock = gitlabApi.Groups.allSubgroups as MockedFunction<typeof gitlabApi.Groups.allSubgroups>
      gitlabGroupsAllSubgroupsMock.mockResolvedValueOnce({
        data: [{ id: groupId, name: projectSlug, parent_id: 123, full_path: `forge/${projectSlug}` }],
        paginationInfo: { next: null },
      })

      const gitlabGroupAccessTokensAllMock = gitlabApi.GroupAccessTokens.all as MockedFunction<typeof gitlabApi.GroupAccessTokens.all>
      gitlabGroupAccessTokensAllMock.mockResolvedValue({
        data: [token],
        paginationInfo: makeOffsetPagination({ next: null }),
      })

      const result = await service.getProjectToken(group, projectSlug)
      expect(result).toEqual(token)
    })
  })

  describe('revokeProjectToken', () => {
    it('should revoke a project access token by group id and token id', async () => {
      const projectSlug = 'project-1'
      const groupId = 456
      const tokenId = 789
      const group = makeGroupSchema({ id: groupId, name: projectSlug, path: projectSlug, full_path: `forge/${projectSlug}`, full_name: `forge/${projectSlug}`, parent_id: 123 })

      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({
        data: [{ id: 123, full_path: 'forge' }],
        paginationInfo: { next: null },
      })
      gitlabApi.Groups.show.mockResolvedValueOnce(makeExpandedGroupSchema({ id: 123, full_path: 'forge' }))
      const gitlabGroupsAllSubgroupsMock = gitlabApi.Groups.allSubgroups as MockedFunction<typeof gitlabApi.Groups.allSubgroups>
      gitlabGroupsAllSubgroupsMock.mockResolvedValueOnce({
        data: [group],
        paginationInfo: { next: null },
      })

      await service.revokeProjectToken(group, tokenId)

      expect(gitlabApi.GroupAccessTokens.revoke).toHaveBeenCalledWith(groupId, tokenId)
    })
  })

  describe('getProjectGroup', () => {
    it('should return undefined when the project group is not found', async () => {
      const projectSlug = 'missing'
      const gitlabGroupsAllMock = gitlabApi.Groups.all as MockedFunction<typeof gitlabApi.Groups.all>
      gitlabGroupsAllMock.mockResolvedValueOnce({ data: [{ id: 123, full_path: 'forge' }], paginationInfo: { next: null } })
      gitlabApi.Groups.show.mockResolvedValueOnce(makeExpandedGroupSchema({ id: 123, full_path: 'forge' }))
      const gitlabGroupsAllSubgroupsMock = gitlabApi.Groups.allSubgroups as MockedFunction<typeof gitlabApi.Groups.allSubgroups>
      gitlabGroupsAllSubgroupsMock.mockResolvedValueOnce({ data: [], paginationInfo: { next: null } })

      await expect(service.getProjectGroup(projectSlug)).resolves.toBeUndefined()
    })
  })

  describe('validateProjectToken', () => {
    const server = setupServer()
    beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())

    function stubPersonalAccessTokenSelf(body: object, status = 200) {
      server.use(
        http.get('https://gitlab.internal/api/v4/personal_access_tokens/self', () =>
          HttpResponse.json(body, { status })),
      )
    }

    it('should send the candidate token and not the integration token', async () => {
      let capturedToken: string | null = null
      server.use(
        http.get('https://gitlab.internal/api/v4/personal_access_tokens/self', ({ request }) => {
          capturedToken = request.headers.get('private-token')
          return HttpResponse.json({ id: 1, active: true, revoked: false })
        }),
      )

      await expect(service.validateProjectToken('valid-token')).resolves.toBe(true)

      expect(capturedToken).toBe('valid-token')
    })

    it.each([
      { active: false, revoked: false },
      { active: true, revoked: true },
    ])('should return false for an inactive or revoked token (%o)', async (state) => {
      stubPersonalAccessTokenSelf({ id: 1, ...state })

      await expect(service.validateProjectToken('stale-token')).resolves.toBe(false)
    })

    it('should return false when GitLab rejects the token', async () => {
      stubPersonalAccessTokenSelf({ message: '401 Unauthorized' }, 401)

      await expect(service.validateProjectToken('invalid-token')).resolves.toBe(false)
    })

    it('should throw on transient failures instead of reporting an invalid token', async () => {
      stubPersonalAccessTokenSelf({ message: '502 Bad Gateway' }, 502)

      await expect(service.validateProjectToken('valid-token')).rejects.toThrow()
    })
  })

  describe('createUser', () => {
    it('should create user', async () => {
      const email = 'user@example.com'
      const username = 'user'
      const name = 'User Name'
      const user = makeExpandedUserSchema({ id: 1, username })

      gitlabApi.Users.create.mockResolvedValue(user)

      const result = await service.createUser({ email, username, name })

      expect(result).toEqual(user)
      expect(gitlabApi.Users.create).toHaveBeenCalledWith(expect.objectContaining({
        email,
        username,
        name,
        skipConfirmation: true,
      }))
    })

    it('should retry with a unique username when the derived username is taken (cross-email collision)', async () => {
      const email = 'alice@other.com'
      const username = 'alice'
      const name = 'Alice Other'
      const takenError = makeGitbeakerRequestError({ status: 409, description: 'Username has already been taken' })
      const created = makeExpandedUserSchema({ id: 42, email, username: 'alice_1', name })

      gitlabApi.Users.create
        .mockRejectedValueOnce(takenError)
        .mockResolvedValueOnce(created)

      const result = await service.createUser({ email, username, name })

      expect(result).toEqual(created)
      expect(gitlabApi.Users.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ username: 'alice' }))
      expect(gitlabApi.Users.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ username: 'alice_1' }))
    })

    it('should propagate a non-collision error', async () => {
      const email = 'user@example.com'
      const username = 'user'
      const name = 'User Name'
      const otherError = makeGitbeakerRequestError({ status: 500, description: 'Internal Server Error' })

      gitlabApi.Users.create.mockRejectedValue(otherError)

      await expect(service.createUser({ email, username, name })).rejects.toThrow()
      expect(gitlabApi.Users.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('commitMirror', () => {
    it('should create mirror commit', async () => {
      const repoId = 1

      await service.commitMirror(repoId)

      expect(gitlabApi.Commits.create).toHaveBeenCalledWith(
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
