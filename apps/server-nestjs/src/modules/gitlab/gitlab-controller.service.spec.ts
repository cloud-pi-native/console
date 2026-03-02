import { Test, TestingModule } from '@nestjs/testing'
import { GitlabControllerService } from './gitlab-controller.service'
import { GitlabService } from './gitlab.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { VaultService } from '../vault/vault.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { vi, describe, beforeEach, it, expect } from 'vitest'

describe('GitlabControllerService', () => {
  let service: GitlabControllerService
  let gitlabService: GitlabService
  let vaultService: VaultService
  let gitlabDatastore: GitlabDatastoreService

  const mockProject = {
    id: 'p1',
    slug: 'project-1',
    name: 'Project 1',
    members: [],
    repositories: [],
    clusters: [],
  }

  const mockConfigService = {
    projectRootDir: 'forge/console',
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
          },
        },
        {
          provide: GitlabDatastoreService,
          useValue: {
            getAllProjects: vi.fn(),
          },
        },
        {
          provide: VaultService,
          useValue: {
            read: vi.fn(),
            write: vi.fn(),
            destroy: vi.fn(),
          },
        },
        {
          provide: ConfigurationService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<GitlabControllerService>(GitlabControllerService)
    gitlabService = module.get<GitlabService>(GitlabService)
    vaultService = module.get<VaultService>(VaultService)
    gitlabDatastore = module.get<GitlabDatastoreService>(GitlabDatastoreService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('handleUpsert', () => {
    it('should reconcile project members and repositories', async () => {
      // Mock data
      const project = { ...mockProject }
      const group = { id: 123, full_path: 'forge/console/project-1' }

      // Mock implementations
      // @ts-ignore
      gitlabService.getOrCreateProjectGroup.mockResolvedValue(group)
      // @ts-ignore
      gitlabService.getGroupMembers.mockResolvedValue([])
      // @ts-ignore
      gitlabService.listRepositories.mockResolvedValue([])
      // @ts-ignore
      gitlabService.getProjectToken.mockResolvedValue({ token: 'token' })
      // @ts-ignore
      gitlabService.createEmptyProjectRepository.mockResolvedValue({ id: 1 })
      // @ts-ignore
      gitlabService.getMirrorProjectTriggerToken.mockResolvedValue({ repoId: 1, token: 'trigger-token' })
      // @ts-ignore
      vaultService.read.mockResolvedValue({ MIRROR_TOKEN: 'token' })

      await service.handleUpsert(project as any)

      expect(gitlabService.getOrCreateProjectGroup).toHaveBeenCalledWith(project.slug)
      expect(gitlabService.getGroupMembers).toHaveBeenCalledWith(group.id)
      expect(gitlabService.listRepositories).toHaveBeenCalledWith(project.slug)
    })
  })
})
