import type { TestingModule } from '@nestjs/testing'
import type { Mocked } from 'vitest'
import type { ProjectWithDetails } from './argocd-datastore.service'
import { generateNamespaceName } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stringify } from 'yaml'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { makeProjectSchema } from '../gitlab/gitlab-testing.utils'
import { VaultClientService } from '../vault/vault-client.service'
import { ArgoCDControllerService } from './argocd-controller.service'
import { ArgoCDDatastoreService } from './argocd-datastore.service'

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
          argoNamespace: 'argocd',
          argocdUrl: 'https://argocd.internal',
          argocdExtraRepositories: 'repo3',
          dsoEnvChartVersion: 'dso-env-1.6.0',
          dsoNsChartVersion: 'dso-ns-1.1.5',
        } satisfies Partial<ConfigurationService>,
      },
      {
        provide: GitlabClientService,
        useValue: {
          getOrCreateInfraGroupRepo: vi.fn(),
          getOrCreateProjectGroupPublicUrl: vi.fn(),
          getOrCreateInfraGroupRepoPublicUrl: vi.fn(),
          generateCreateOrUpdateAction: vi.fn(),
          maybeCommitActions: vi.fn(),
          listFiles: vi.fn(),
        } satisfies Partial<GitlabClientService>,
      },
      {
        provide: VaultClientService,
        useValue: {
          readProjectValues: vi.fn(),
        } satisfies Partial<VaultClientService>,
      },
    ],
  })
}

describe('argoCDControllerService', () => {
  let service: ArgoCDControllerService
  let datastore: Mocked<ArgoCDDatastoreService>
  let gitlab: Mocked<GitlabClientService>
  let vault: Mocked<VaultClientService>

  beforeEach(async () => {
    vi.clearAllMocks()
    const module: TestingModule = await createArgoCDControllerServiceTestingModule().compile()
    service = module.get(ArgoCDControllerService)
    datastore = module.get(ArgoCDDatastoreService)
    gitlab = module.get(GitlabClientService)
    vault = module.get(VaultClientService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

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
          isInfra: true,
          deployRevision: 'HEAD',
          deployPath: '.',
          helmValuesFiles: '',
        },
      ],
      plugins: [{ pluginName: 'argocd', key: 'extraRepositories', value: 'repo2' }],
    } satisfies ProjectWithDetails

    datastore.getAllProjects.mockResolvedValue([mockProject])
    gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' }))
    gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
    gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
    gitlab.listFiles.mockResolvedValue([])
    vault.readProjectValues.mockResolvedValue({ secret: 'value' })
    gitlab.generateCreateOrUpdateAction.mockImplementation(async (_repoId, _ref, filePath: string, content: string) => {
      return { action: 'create', filePath, content } as any
    })

    await expect(service.handleCron()).resolves.not.toThrow()

    // Verify Gitlab calls
    expect(gitlab.maybeCommitActions).toHaveBeenCalledTimes(1)
    expect(gitlab.maybeCommitActions).toHaveBeenCalledWith(
      100,
      expect.arrayContaining([
        {
          action: 'create',
          content: stringify({
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
              valueFileRepository: 'https://gitlab.internal/infra',
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
                'https://gitlab.internal/group/**',
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
                  repoURL: 'https://gitlab.internal/infra-repo',
                  targetRevision: 'HEAD',
                  path: '.',
                  valueFiles: [],
                },
              ],
            },
          }),
          filePath: 'Project 1/cluster-1/dev/values.yaml',
        },
        {
          action: 'create',
          content: stringify({
            common: {
              'dso/project': 'Project 1',
              'dso/project.id': '123e4567-e89b-12d3-a456-426614174000',
              'dso/project.slug': 'project-1',
              'dso/environment': 'prod',
              'dso/environment.id': '123e4567-e89b-12d3-a456-426614174002',
            },
            argocd: {
              cluster: 'in-cluster',
              namespace: 'argocd',
              project: 'project-1-prod-c626',
              envChartVersion: 'dso-env-1.6.0',
              nsChartVersion: 'dso-ns-1.1.5',
            },
            environment: {
              valueFileRepository: 'https://gitlab.internal/infra',
              valueFileRevision: 'HEAD',
              valueFilePath: 'Project 1/cluster-1/prod/values.yaml',
              roGroup: '/project-project-1/console/prod/RO',
              rwGroup: '/project-project-1/console/prod/RW',
            },
            application: {
              quota: {
                cpu: 1,
                gpu: 0,
                memory: '1Gi',
              },
              sourceRepositories: [
                'https://gitlab.internal/group/**',
                'repo3',
                'repo2',
              ],
              destination: {
                namespace: generateNamespaceName(mockProject.id, mockProject.environments[1].id),
                name: 'cluster-1',
              },
              autosync: true,
              vault: { secret: 'value' },
              repositories: [
                {
                  repoURL: 'https://gitlab.internal/infra-repo',
                  targetRevision: 'HEAD',
                  path: '.',
                  valueFiles: [],
                },
              ],
            },
          }),
          filePath: 'Project 1/cluster-1/prod/values.yaml',
        },
      ]),
      'ci: :robot_face: Sync project-1',
    )

    expect(gitlab.listFiles).toHaveBeenCalledWith(100, {
      path: 'Project 1/',
      recursive: true,
    })

    expect(gitlab.generateCreateOrUpdateAction).toHaveBeenCalledTimes(2)
  })

  it('should delete values file when an environment is removed', async () => {
    const mockProject = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      slug: 'project-1',
      name: 'Project 1',
      environments: [
        { id: '123e4567-e89b-12d3-a456-426614174001', name: 'dev', clusterId: 'c1', cpu: 1, gpu: 0, memory: 1, autosync: true },
      ],
      clusters: [
        { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } },
      ],
      repositories: [
        {
          id: 'repo-1',
          internalRepoName: 'infra-repo',
          isInfra: true,
          deployRevision: 'HEAD',
          deployPath: '.',
          helmValuesFiles: '',
        },
      ],
      plugins: [],
    } satisfies ProjectWithDetails

    datastore.getAllProjects.mockResolvedValue([mockProject])
    gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' }))
    gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
    gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
    gitlab.listFiles.mockResolvedValue([
      { name: 'values.yaml', path: 'Project 1/cluster-1/dev/values.yaml' },
      { name: 'values.yaml', path: 'Project 1/cluster-1/prod/values.yaml' },
    ] as any)
    vault.readProjectValues.mockResolvedValue({ secret: 'value' })
    gitlab.generateCreateOrUpdateAction.mockImplementation(async (_repoId, _ref, filePath: string, content: string) => {
      return { action: 'create', filePath, content } as any
    })

    await expect(service.handleCron()).resolves.not.toThrow()

    expect(gitlab.maybeCommitActions).toHaveBeenCalledTimes(1)
    expect(gitlab.maybeCommitActions).toHaveBeenCalledWith(
      100,
      expect.arrayContaining([
        expect.objectContaining({
          action: 'create',
          filePath: 'Project 1/cluster-1/dev/values.yaml',
        }),
        {
          action: 'delete',
          filePath: 'Project 1/cluster-1/prod/values.yaml',
        },
      ]),
      'ci: :robot_face: Sync project-1',
    )

    expect(gitlab.generateCreateOrUpdateAction).toHaveBeenCalledTimes(1)
  })
})
