import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mocked } from 'vitest'
import { load } from 'js-yaml'
import { ArgoCDControllerService } from './argocd-controller.service'
import type { ArgoCDDatastoreService, ProjectWithDetails } from './argocd-datastore.service'
import type { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import type { GitlabService } from '../gitlab/gitlab.service'
import type { VaultService } from '../vault/vault.service'

const mockArgoCDDatastore = {
  getAllProjects: vi.fn(),
} as unknown as Mocked<ArgoCDDatastoreService>

const mockConfigService = {
  keycloakControllerPurgeOrphans: true,
  argoNamespace: 'argocd',
  argocdUrl: 'http://argocd',
  argocdExtraRepositories: 'repo3',
  dsoEnvChartVersion: 'dso-env-1.6.0',
  dsoNsChartVersion: 'dso-ns-1.1.5',
} as unknown as Mocked<ConfigurationService>

const mockGitlabService = {
  getOrCreateInfraProject: vi.fn(),
  getPublicGroupUrl: vi.fn(),
  getPublicRepoUrl: vi.fn(),
  commitCreateOrUpdate: vi.fn(),
  commitDelete: vi.fn(),
  listFiles: vi.fn(),
} as unknown as Mocked<GitlabService>

const mockVaultService = {
  getProjectValues: vi.fn(),
} as unknown as Mocked<VaultService>

describe('argoCDControllerService', () => {
  let service: ArgoCDControllerService
  let datastore: Mocked<ArgoCDDatastoreService>
  let gitlabService: Mocked<GitlabService>
  let vaultService: Mocked<VaultService>

  beforeEach(() => {
    service = new ArgoCDControllerService(
      mockArgoCDDatastore,
      mockConfigService,
      mockGitlabService,
      mockVaultService,
    )
    datastore = mockArgoCDDatastore
    gitlabService = mockGitlabService
    vaultService = mockVaultService
    vi.clearAllMocks()
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
      gitlabService.getOrCreateInfraProject.mockResolvedValue({ id: 100, http_url_to_repo: 'http://gitlab/infra' })
      gitlabService.getPublicGroupUrl.mockResolvedValue('http://gitlab/group')
      gitlabService.getPublicRepoUrl.mockResolvedValue('http://gitlab/infra-repo')
      gitlabService.listFiles.mockResolvedValue([])
      vaultService.getProjectValues.mockResolvedValue({ secret: 'value' })

      const results = await (service as any).reconcile()

      expect(results).toHaveLength(3) // 2 envs + 1 cleanup (1 zone)

      // Verify Gitlab calls
      expect(gitlabService.commitCreateOrUpdate).toHaveBeenCalledTimes(2)

      const calls = gitlabService.commitCreateOrUpdate.mock.calls
      const devCall = calls.find(c => c[2] === 'Project 1/cluster-1/dev/values.yaml')
      expect(devCall).toBeDefined()

      const content = load(devCall![1]) as any
      expect(content).toMatchObject({
        common: {
          'dso/project': 'Project 1',
          'dso/project.slug': 'project-1',
          'dso/environment': 'dev',
        },
        argocd: {
          namespace: 'argocd',
          project: expect.stringMatching(/^project-1-dev-[a-f0-9]{4}$/),
        },
        environment: {
          valueFileRepository: 'http://gitlab/infra',
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
          sourceRepositories: expect.arrayContaining([
            expect.stringContaining('repo3'),
            expect.stringContaining('repo2'),
            expect.stringContaining('http://gitlab/group'),
          ]),
          destination: {
            namespace: expect.any(String),
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
      })
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
      gitlabService.getOrCreateInfraProject.mockRejectedValue(new Error('Sync failed'))

      const results = await (service as any).reconcile()

      // 1 env (fails) + 1 cleanup (fails because getOrCreateInfraProject fails)
      expect(results).toHaveLength(2)
      const failed = results.filter((r: any) => r.status === 'rejected')
      expect(failed).toHaveLength(2)
    })
  })
})
