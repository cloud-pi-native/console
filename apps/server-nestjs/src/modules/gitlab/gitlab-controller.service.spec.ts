import { Test } from '@nestjs/testing'
import { GitlabControllerService } from './gitlab-controller.service'
import { GitlabService } from './gitlab.service'
import type { ProjectWithDetails } from './gitlab-datastore.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { VaultService } from '../vault/vault.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { vi, describe, beforeEach, it, expect, type Mocked } from 'vitest'
import type { AccessTokenExposedSchema, GroupSchema, ProjectSchema, SimpleUserSchema } from '@gitbeaker/core'

function createGitlabControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      GitlabControllerService,
      {
        provide: GitlabService,
        useValue: {
          getOrCreateProjectGroup: vi.fn(),
          getGroupMembers: vi.fn(),
          addGroupMember: vi.fn(),
          removeGroupMember: vi.fn(),
          findUserByEmail: vi.fn(),
          createUser: vi.fn(),
          listRepositories: vi.fn(),
          createEmptyProjectRepository: vi.fn(),
          getProjectToken: vi.fn(),
          getPublicRepoUrl: vi.fn(),
          commitCreateOrUpdate: vi.fn(),
          deleteGroup: vi.fn(),
          provisionMirror: vi.fn(),
          getMirrorProjectTriggerToken: vi.fn(),
          deleteRepository: vi.fn(),
          createProjectToken: vi.fn(),
          updateProject: vi.fn(),
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
        },
      },
    ],
  })
}

describe('gitlabControllerService', () => {
  let service: GitlabControllerService
  let gitlabService: Mocked<GitlabService>
  let vaultService: Mocked<VaultService>

  beforeEach(async () => {
    const module = await createGitlabControllerServiceTestingModule().compile()
    service = module.get(GitlabControllerService)
    gitlabService = module.get(GitlabService)
    vaultService = module.get(VaultService)
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
      gitlabService.getOrCreateProjectGroup.mockResolvedValue(group)
      gitlabService.getGroupMembers.mockResolvedValue([])
      gitlabService.listRepositories.mockResolvedValue([])
      gitlabService.getProjectToken.mockResolvedValue({ token: 'token' } as AccessTokenExposedSchema)
      gitlabService.createEmptyProjectRepository.mockResolvedValue({ id: 1 } as ProjectSchema)
      gitlabService.getPublicRepoUrl.mockResolvedValue('http://gitlab/repo')
      gitlabService.getMirrorProjectTriggerToken.mockResolvedValue({ repoId: 1, token: 'trigger-token', id: 1 })
      gitlabService.findUserByEmail.mockResolvedValue({ id: 123, username: 'user' } as SimpleUserSchema)
      vaultService.read.mockResolvedValue({ MIRROR_TOKEN: 'token' })

      await service.handleUpsert(project)

      expect(gitlabService.getOrCreateProjectGroup).toHaveBeenCalledWith(project.slug)
      expect(gitlabService.getGroupMembers).toHaveBeenCalledWith(group.id)
      expect(gitlabService.listRepositories).toHaveBeenCalledWith(project.slug)
    })
  })
})
