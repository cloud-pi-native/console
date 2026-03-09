import { Test } from '@nestjs/testing'
import { ENABLED } from '@cpn-console/shared'
import { GitlabControllerService } from './gitlab-controller.service'
import { GitlabService } from './gitlab.service'
import type { ProjectWithDetails } from './gitlab-datastore.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { VaultService } from '../vault/vault.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { vi, describe, beforeEach, it, expect, type Mocked } from 'vitest'
import type { AccessTokenExposedSchema, GroupSchema, PipelineTriggerTokenSchema, ProjectSchema, SimpleUserSchema } from '@gitbeaker/core'

function createGitlabControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      GitlabControllerService,
      {
        provide: GitlabService,
        useValue: {
          getOrCreateProjectSubGroup: vi.fn(),
          getGroupMembers: vi.fn(),
          addGroupMember: vi.fn(),
          removeGroupMember: vi.fn(),
          getUserByEmail: vi.fn(),
          createUser: vi.fn(),
          getRepos: vi.fn(),
          getProjectToken: vi.fn(),
          getInfraGroupRepoPublicUrl: vi.fn(),
          maybeCommitUpdate: vi.fn(),
          deleteGroup: vi.fn(),
          commitMirror: vi.fn(),
          getOrCreateMirrorPipelineTriggerToken: vi.fn(),
          createProjectToken: vi.fn(),
          createProjectMirrorAccessToken: vi.fn(),
          upsertProjectGroupRepo: vi.fn(),
          upsertProjectMirrorRepo: vi.fn(),
          getProjectGroupInternalRepoUrl: vi.fn(),
        } satisfies Partial<GitlabService>,
      },
      {
        provide: GitlabDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
        } satisfies Partial<GitlabDatastoreService>,
      },
      {
        provide: VaultService,
        useValue: {
          read: vi.fn(),
          write: vi.fn(),
          destroy: vi.fn(),
        } satisfies Partial<VaultService>,
      },
      {
        provide: ConfigurationService,
        useValue: {
          projectRootDir: 'forge/console',
          projectRootPath: 'forge',
        },
      },
    ],
  })
}

describe('gitlabControllerService', () => {
  let service: GitlabControllerService
  let gitlab: Mocked<GitlabService>
  let vault: Mocked<VaultService>

  beforeEach(async () => {
    const module = await createGitlabControllerServiceTestingModule().compile()
    service = module.get(GitlabControllerService)
    gitlab = module.get(GitlabService)
    vault = module.get(VaultService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('handleUpsert', () => {
    it('should reconcile project members and repositories', async () => {
      // Mock data
      const project = {
        id: 'p1',
        slug: 'project-1',
        name: 'Project 1',
        description: 'Test project',
        members: [],
        repositories: [],
        clusters: [],
        plugins: [],
      } as ProjectWithDetails
      const group = {
        id: 123,
        full_path: 'forge/console/project-1',
        path: 'project-1',
      } as GroupSchema

      // Mock implementations
      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.getProjectToken.mockResolvedValue({ token: 'token' } as AccessTokenExposedSchema)
      gitlab.upsertProjectGroupRepo.mockResolvedValue({ id: 1 } as ProjectSchema)
      gitlab.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlab.getInfraGroupRepoPublicUrl.mockResolvedValue('http://gitlab/repo')
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)
      gitlab.getUserByEmail.mockResolvedValue({ id: 123, username: 'user' } as SimpleUserSchema)
      vault.read.mockResolvedValue({ data: { MIRROR_TOKEN: 'token' }, metadata: {} } as any)

      await service.handleUpsert(project)

      expect(gitlab.getOrCreateProjectSubGroup).toHaveBeenCalledWith(project.slug)
      expect(gitlab.getGroupMembers).toHaveBeenCalledWith(group.id)
      expect(gitlab.getRepos).toHaveBeenCalledWith(project.slug)
    })

    it('should remove orphan member if purge enabled', async () => {
      const project = {
        id: 'p1',
        slug: 'project-1',
        name: 'Project 1',
        description: 'Test project',
        members: [],
        repositories: [],
        clusters: [],
        plugins: [{ pluginName: 'gitlab', key: 'purge', value: ENABLED }],
      } as ProjectWithDetails
      const group = { id: 123, path: 'project-1' } as GroupSchema

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([{ id: 999, username: 'orphan' } as any])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)
      vault.read.mockResolvedValue({ data: { MIRROR_TOKEN: 'token' }, metadata: {} } as any)

      await service.handleUpsert(project)

      expect(gitlab.removeGroupMember).toHaveBeenCalledWith(group.id, 999)
    })

    it('should not remove managed user (bot) even if purge enabled', async () => {
      const project = {
        id: 'p1',
        slug: 'project-1',
        members: [],
        repositories: [],
        clusters: [],
        plugins: [{ pluginName: 'gitlab', key: 'purge', value: ENABLED }],
      } as unknown as ProjectWithDetails
      const group = { id: 123, path: 'project-1' } as GroupSchema

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      // group_123_bot is a managed user pattern
      gitlab.getGroupMembers.mockResolvedValue([{ id: 888, username: 'group_123_bot' } as any])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)
      vault.read.mockResolvedValue({ data: { MIRROR_TOKEN: 'token' }, metadata: {} } as any)

      await service.handleUpsert(project)

      expect(gitlab.removeGroupMember).not.toHaveBeenCalled()
    })

    it('should not remove orphan member if purge disabled', async () => {
      const project = {
        id: 'p1',
        slug: 'project-1',
        name: 'Project 1',
        description: 'Test project',
        members: [],
        repositories: [],
        clusters: [],
        plugins: [],
      } as ProjectWithDetails
      const group = { id: 123, path: 'project-1' } as GroupSchema

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([{ id: 999, username: 'orphan' } as any])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)
      vault.read.mockResolvedValue({ data: { MIRROR_TOKEN: 'token' }, metadata: {} } as any)

      await service.handleUpsert(project)

      expect(gitlab.removeGroupMember).not.toHaveBeenCalled()
    })

    it('should create gitlab user if not exists', async () => {
      const project = {
        id: 'p1',
        slug: 'project-1',
        members: [{ user: { id: 'u1', email: 'new@example.com', firstName: 'New', lastName: 'User' } }],
        repositories: [],
        clusters: [],
        plugins: [],
      } as unknown as ProjectWithDetails
      const group = { id: 123 } as GroupSchema

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getUserByEmail.mockResolvedValue(undefined as any)
      gitlab.createUser.mockResolvedValue({ id: 999, username: 'new' } as any)
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)
      vault.read.mockResolvedValue({ data: { MIRROR_TOKEN: 'token' }, metadata: {} } as any)

      await service.handleUpsert(project)

      expect(gitlab.createUser).toHaveBeenCalledWith('new@example.com', 'new', 'New User')
      expect(gitlab.addGroupMember).toHaveBeenCalledWith(group.id, 999, expect.any(Number))
    })

    it('should configure repository mirroring if external url is present', async () => {
      const project = {
        id: 'p1',
        slug: 'project-1',
        members: [],
        repositories: [{
          internalRepoName: 'repo-1',
          externalRepoUrl: 'https://github.com/org/repo.git',
          isPrivate: true,
          externalUserName: 'user',
        }],
        clusters: [],
        plugins: [],
      } as unknown as ProjectWithDetails
      const group = { id: 123 } as GroupSchema
      const gitlabRepo = { id: 101, name: 'repo-1' } as ProjectSchema

      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockReturnValue((async function* () { yield gitlabRepo })())
      gitlab.getProjectGroupInternalRepoUrl.mockResolvedValue('https://gitlab.internal/group/repo-1.git')
      gitlab.createProjectMirrorAccessToken.mockResolvedValue({ name: 'bot', token: 'mirror-token' } as any)
      vault.read.mockResolvedValue(null)
      gitlab.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)

      await service.handleUpsert(project)

      expect(vault.write).toHaveBeenCalledWith(
        expect.objectContaining({
          GIT_INPUT_URL: 'github.com/org/repo.git',
          GIT_OUTPUT_USER: 'bot',
          GIT_OUTPUT_PASSWORD: 'mirror-token',
        }),
        expect.stringContaining('repo-1-mirror'),
      )
    })
  })

  describe('handleCron', () => {
    it('should reconcile all projects', async () => {
      const projects = [{ id: 'p1', slug: 'project-1', members: [], repositories: [], clusters: [], plugins: [] }] as unknown as ProjectWithDetails[]
      // @ts-ignore
      const gitlabDatastoreService = service.gitlabDatastore as Mocked<GitlabDatastoreService>
      gitlabDatastoreService.getAllProjects.mockResolvedValue(projects)

      const group = { id: 123 } as GroupSchema
      gitlab.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlab.getGroupMembers.mockResolvedValue([])
      gitlab.getRepos.mockReturnValue((async function* () { })())
      gitlab.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlab.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)
      vault.read.mockResolvedValue({ data: { MIRROR_TOKEN: 'token' }, metadata: {} } as any)

      await service.handleCron()

      expect(gitlabDatastoreService.getAllProjects).toHaveBeenCalled()
      expect(gitlab.getOrCreateProjectSubGroup).toHaveBeenCalledWith('project-1')
    })
  })
})
