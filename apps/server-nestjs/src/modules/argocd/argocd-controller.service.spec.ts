import { Test, type TestingModule } from '@nestjs/testing'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mocked } from 'vitest'
import { dump } from 'js-yaml'
import { ArgoCDControllerService } from './argocd-controller.service'
import { ArgoCDDatastoreService, type ProjectWithDetails } from './argocd-datastore.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { GitlabService } from '../gitlab/gitlab.service'
import { VaultService } from '../vault/vault.service'
import type { ProjectSchema } from '@gitbeaker/core'
import { generateNamespaceName } from '@cpn-console/shared'

function createArgoCDControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      ArgoCDControllerService,
      {
        provide: ArgoCDDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
        } satisfies Partial<ArgoCDDatastoreService>,
      },
      {
        provide: ConfigurationService,
        useValue: {
          keycloakControllerPurgeOrphans: true,
          argoNamespace: 'argocd',
          argocdUrl: 'http://argocd',
          argocdExtraRepositories: 'repo3',
          dsoEnvChartVersion: 'dso-env-1.6.0',
          dsoNsChartVersion: 'dso-ns-1.1.5',
        } satisfies Partial<ConfigurationService>,
      },
      {
        provide: GitlabService,
        useValue: {
          getOrCreateInfraGroupRepo: vi.fn(),
          getProjectGroupPublicUrl: vi.fn(),
          getInfraGroupRepoPublicUrl: vi.fn(),
          maybeCommitUpdate: vi.fn(),
          maybeCommitDelete: vi.fn(),
          listFiles: vi.fn(),
        } satisfies Partial<GitlabService>,
      },
      {
        provide: VaultService,
        useValue: {
          getProjectValues: vi.fn(),
        } satisfies Partial<VaultService>,
      },
    ],
  })
}

describe('argoCDControllerService', () => {
  let service: ArgoCDControllerService
  let datastore: Mocked<ArgoCDDatastoreService>
  let gitlabService: Mocked<GitlabService>
  let vaultService: Mocked<VaultService>

  beforeEach(async () => {
    vi.clearAllMocks()
    const module: TestingModule = await createArgoCDControllerServiceTestingModule().compile()
    service = module.get(ArgoCDControllerService)
    datastore = module.get(ArgoCDDatastoreService)
    gitlabService = module.get(GitlabService)
    vaultService = module.get(VaultService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('reconcile', () => {
    it('should sync project environments', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'project-1',
        name: 'Project 1',
        environments: [
          { id: '123e4567-e89b-12d3-a456-426614174001', name: 'dev', clusterId: 'c1', cpu: 1, gpu: 0, memory: 1, autosync: true },
          { id: '123e4567-e89b-12d3-a456-426614174002', name: 'prod', clusterId: 'c1', cpu: 1, gpu: 0, memory: 1, autosync: true },
        ],
        clusters: [
          { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } },
        ],
        repositories: [
          {
            id: 'repo-1',
            internalRepoName: 'infra-repo',
            url: 'http://gitlab/infra-repo',
            isInfra: true,
          },
        ],
        plugins: [{ pluginName: 'argocd', key: 'extraRepositories', value: 'repo2' }],
      } as unknown as ProjectWithDetails

      datastore.getAllProjects.mockResolvedValue([mockProject])
      gitlabService.getOrCreateInfraGroupRepo.mockResolvedValue({ id: 100, http_url_to_repo: 'http://gitlab/infra' } as ProjectSchema)
      gitlabService.getProjectGroupPublicUrl.mockResolvedValue('http://gitlab/group')
      gitlabService.getInfraGroupRepoPublicUrl.mockResolvedValue('http://gitlab/infra-repo')
      gitlabService.listFiles.mockResolvedValue([])
      vaultService.getProjectValues.mockResolvedValue({ secret: 'value' })

      const results = await service.reconcile()

      expect(results).toHaveLength(3) // 2 envs + 1 cleanup (1 zone)

      // Verify Gitlab calls
      expect(gitlabService.maybeCommitUpdate).toHaveBeenCalledTimes(2)
      expect(gitlabService.maybeCommitUpdate).toHaveBeenCalledWith(
        100,
        [
          {
            content: dump({
              common: {
                'dso/project': 'Project 1',
                'dso/project.id': '123e4567-e89b-12d3-a456-426614174000',
                'dso/project.slug': 'project-1',
                'dso/environment': 'dev',
                'dso/environment.id': '123e4567-e89b-12d3-a456-426614174001',
              },
              argocd: {
                cluster: 'in-cluster',
                namespace: 'argocd',
                project: 'project-1-dev-6293',
                envChartVersion: 'dso-env-1.6.0',
                nsChartVersion: 'dso-ns-1.1.5',
              },
              environment: {
                valueFileRepository: 'http://gitlab/infra',
                valueFileRevision: 'HEAD',
                valueFilePath: 'Project 1/cluster-1/dev/values.yaml',
                roGroup: '/project-project-1/console/dev/RO',
                rwGroup: '/project-project-1/console/dev/RW',
              },
              application: {
                quota: {
                  cpu: 1,
                  gpu: 0,
                  memory: '1Gi',
                },
                sourceRepositories: [
                  'http://gitlab/group/**',
                  'repo3',
                  'repo2',
                ],
                destination: {
                  namespace: generateNamespaceName(mockProject.id, mockProject.environments[0].id),
                  name: 'cluster-1',
                },
                autosync: true,
                vault: { secret: 'value' },
                repositories: [
                  {
                    repoURL: 'http://gitlab/infra-repo',
                    targetRevision: 'HEAD',
                    path: '.',
                    valueFiles: [],
                  },
                ],
              },
            }),
            filePath: 'Project 1/cluster-1/dev/values.yaml',
          },
        ],
        'ci: :robot_face: Update Project 1/cluster-1/dev/values.yaml',
      )
    })

    it('should handle errors gracefully', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'project-1',
        name: 'Project 1',
        environments: [{ id: '123e4567-e89b-12d3-a456-426614174001', name: 'dev', clusterId: 'c1', cpu: 1, gpu: 0, memory: 1, autosync: true }],
        clusters: [
          { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } },
        ],
      } as unknown as ProjectWithDetails

      datastore.getAllProjects.mockResolvedValue([mockProject])
      gitlabService.getOrCreateInfraGroupRepo.mockRejectedValue(new Error('Sync failed'))

      const results = await service.reconcile()

      // 1 env (fails) + 1 cleanup (fails because getOrCreateInfraProject fails)
      expect(results).toHaveLength(2)
      const failed = results.filter((r: any) => r.status === 'rejected')
      expect(failed).toHaveLength(2)
    })
  })
})
