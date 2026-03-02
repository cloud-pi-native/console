import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mocked } from 'vitest'
import { ArgoCDControllerService } from './argocd-controller.service'
import type { ArgoCDDatastoreService, ProjectWithDetails } from './argocd-datastore.service'
import type { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import type { GitlabService } from '../gitlab/gitlab.service'
import type { VaultService } from '../vault/vault.service'
import type { Project } from '@cpn-console/hooks'

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
  let datastore: Mocked<any>
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
        repositories: [],
        store: { argocd: { extraRepositories: 'repo2' } },
      } as unknown as ProjectWithDetails

      datastore.getAllProjects.mockResolvedValue([mockProject])
      gitlabService.getOrCreateInfraProject.mockResolvedValue({ id: 100, http_url_to_repo: 'http://gitlab/infra' })
      gitlabService.getPublicGroupUrl.mockResolvedValue('http://gitlab/group')
      gitlabService.listFiles.mockResolvedValue([])
      vaultService.getProjectValues.mockResolvedValue({ secret: 'value' })

      const results = await (service as any).reconcile()

      expect(results).toHaveLength(3) // 2 envs + 1 remove call

      // Verify Gitlab calls
      expect(gitlabService.commitCreateOrUpdate).toHaveBeenCalledTimes(2)
      expect(gitlabService.commitCreateOrUpdate).toHaveBeenCalledWith(
        100,
        expect.stringContaining('dso/project: Project 1'),
        'Project 1/cluster-1/dev/values.yaml',
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
      gitlabService.getOrCreateInfraProject.mockRejectedValue(new Error('Sync failed'))

      const results = await (service as any).reconcile()

      expect(results).toHaveLength(2) // 1 failed env + 1 remove call (which also fails in loop)
      const failed = results.find((r: any) => r.status === 'rejected')
      expect(failed).toBeDefined()
    })
  })

  describe('handleProjectDeleted', () => {
    it('should delete project resources', async () => {
      const mockProject = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'project-1',
        name: 'Project 1',
        clusters: [
          { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } },
        ],
      } as unknown as Project

      gitlabService.getOrCreateInfraProject.mockResolvedValue({ id: 100, http_url_to_repo: 'http://gitlab/infra' })
      gitlabService.listFiles.mockResolvedValue([
        { name: 'values.yaml', path: 'Project 1/values.yaml', type: 'blob' },
      ])

      await service.handleProjectDeleted(mockProject)

      expect(gitlabService.commitDelete).toHaveBeenCalledWith(100, ['Project 1/values.yaml'])
    })
  })
})
