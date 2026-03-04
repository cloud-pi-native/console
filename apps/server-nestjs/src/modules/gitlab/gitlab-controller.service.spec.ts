import { Test } from '@nestjs/testing'
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
          gitlabControllerPurgeOrphanMembers: false,
        },
      },
    ],
  })
}

describe('gitlabControllerService', () => {
  let service: GitlabControllerService
  let gitlabService: Mocked<GitlabService>
  let vaultService: Mocked<VaultService>
  let configService: Mocked<ConfigurationService>

  beforeEach(async () => {
    const module = await createGitlabControllerServiceTestingModule().compile()
    service = module.get(GitlabControllerService)
    gitlabService = module.get(GitlabService)
    vaultService = module.get(VaultService)
    configService = module.get(ConfigurationService)
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
      } as ProjectWithDetails
      const group = {
        id: 123,
        full_path: 'forge/console/project-1',
        path: 'project-1',
      } as GroupSchema

      // Mock implementations
      gitlabService.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlabService.getGroupMembers.mockResolvedValue([])
      gitlabService.getRepos.mockReturnValue((async function* () { })())
      gitlabService.getProjectToken.mockResolvedValue({ token: 'token' } as AccessTokenExposedSchema)
      gitlabService.upsertProjectGroupRepo.mockResolvedValue({ id: 1 } as ProjectSchema)
      gitlabService.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlabService.getInfraGroupRepoPublicUrl.mockResolvedValue('http://gitlab/repo')
      gitlabService.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)
      gitlabService.getUserByEmail.mockResolvedValue({ id: 123, username: 'user' } as SimpleUserSchema)
      vaultService.read.mockResolvedValue({ data: { MIRROR_TOKEN: 'token' }, metadata: {} } as any)

      await service.handleUpsert(project)

      expect(gitlabService.getOrCreateProjectSubGroup).toHaveBeenCalledWith(project.slug)
      expect(gitlabService.getGroupMembers).toHaveBeenCalledWith(group.id)
      expect(gitlabService.getRepos).toHaveBeenCalledWith(project.slug)
    })

    it('should remove orphan member if purge enabled', async () => {
      configService.gitlabControllerPurgeOrphanMembers = true
      const project = {
        id: 'p1',
        slug: 'project-1',
        name: 'Project 1',
        description: 'Test project',
        members: [],
        repositories: [],
        clusters: [],
      } as ProjectWithDetails
      const group = { id: 123, path: 'project-1' } as GroupSchema

      gitlabService.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlabService.getGroupMembers.mockResolvedValue([{ id: 999, username: 'orphan' } as any])
      gitlabService.getRepos.mockReturnValue((async function* () { })())
      gitlabService.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlabService.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)
      vaultService.read.mockResolvedValue({ data: { MIRROR_TOKEN: 'token' }, metadata: {} } as any)

      await service.handleUpsert(project)

      expect(gitlabService.removeGroupMember).toHaveBeenCalledWith(group.id, 999)
    })

    it('should not remove orphan member if purge disabled', async () => {
      configService.gitlabControllerPurgeOrphanMembers = false
      const project = {
        id: 'p1',
        slug: 'project-1',
        name: 'Project 1',
        description: 'Test project',
        members: [],
        repositories: [],
        clusters: [],
      } as ProjectWithDetails
      const group = { id: 123, path: 'project-1' } as GroupSchema

      gitlabService.getOrCreateProjectSubGroup.mockResolvedValue(group)
      gitlabService.getGroupMembers.mockResolvedValue([{ id: 999, username: 'orphan' } as any])
      gitlabService.getRepos.mockReturnValue((async function* () { })())
      gitlabService.upsertProjectMirrorRepo.mockResolvedValue({ id: 1, empty_repo: false } as ProjectSchema)
      gitlabService.getOrCreateMirrorPipelineTriggerToken.mockResolvedValue({ id: 1, repoId: 1, token: 'trigger-token' } as unknown as PipelineTriggerTokenSchema)
      vaultService.read.mockResolvedValue({ data: { MIRROR_TOKEN: 'token' }, metadata: {} } as any)

      await service.handleUpsert(project)

      expect(gitlabService.removeGroupMember).not.toHaveBeenCalled()
    })
  })
})
