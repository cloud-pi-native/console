import type { TestingModule } from '@nestjs/testing'
import type { Mocked } from 'vitest'
import type { ProjectWithDetails } from './argocd-datastore.service'
import { generateNamespaceName } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stringify } from 'yaml'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { makeCommitAction, makeProjectSchema, makeRepositoryTreeSchema } from '../gitlab/gitlab-testing.utils'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { ArgoCDDatastoreService } from './argocd-datastore.service'
import { ArgoCDService } from './argocd.service'

function createArgoCDControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      ArgoCDService,
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
          maybeCreateCommit: vi.fn(),
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

describe('argoCDService', () => {
  let service: ArgoCDService
  let datastore: Mocked<ArgoCDDatastoreService>
  let gitlab: Mocked<GitlabClientService>
  let vault: Mocked<VaultClientService>

  beforeEach(async () => {
    vi.clearAllMocks()
    const module: TestingModule = await createArgoCDControllerServiceTestingModule().compile()
    service = module.get(ArgoCDService)
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

    const infraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' })
    datastore.getAllProjects.mockResolvedValue([mockProject])
    gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(infraProject)
    gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
    gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
    gitlab.listFiles.mockResolvedValue([])
    vault.readProjectValues.mockResolvedValue({ secret: 'value' })
    gitlab.generateCreateOrUpdateAction.mockImplementation(async (_repoId, _ref, filePath: string, content: string) => {
      return makeCommitAction({ filePath, content })
    })

    await expect(service.handleCron()).resolves.not.toThrow()

    // Verify Gitlab calls
    expect(gitlab.maybeCreateCommit).toHaveBeenCalledTimes(1)
    expect(gitlab.maybeCreateCommit).toHaveBeenCalledWith(
      infraProject,
      'ci: :robot_face: Sync project-1',
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
              roGroup: '/project-1/console/dev/RO',
              rwGroup: '/project-1/console/dev/RW',
              consoleAdminGroup: '/console/admin',
              platformAdminGroup: '/console/admin',
              platformReadonlyGroup: '/console/readonly',
              platformSecurityGroup: '/console/security',
              projectAdminGroup: '/project-1/console/admin',
              projectDevopsGroup: '/project-1/console/devops',
              projectDevelopperGroup: '/project-1/console/developer',
              projectSecurityGroup: '/project-1/console/security',
              projectReadonlyGroup: '/project-1/console/readonly',
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
            features: {
              fineGrainedRoles: {
                enabled: true,
              },
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
              roGroup: '/project-1/console/prod/RO',
              rwGroup: '/project-1/console/prod/RW',
              consoleAdminGroup: '/console/admin',
              platformAdminGroup: '/console/admin',
              platformReadonlyGroup: '/console/readonly',
              platformSecurityGroup: '/console/security',
              projectAdminGroup: '/project-1/console/admin',
              projectDevopsGroup: '/project-1/console/devops',
              projectDevelopperGroup: '/project-1/console/developer',
              projectSecurityGroup: '/project-1/console/security',
              projectReadonlyGroup: '/project-1/console/readonly',
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
            features: {
              fineGrainedRoles: {
                enabled: true,
              },
            },
          }),
          filePath: 'Project 1/cluster-1/prod/values.yaml',
        },
      ]),
    )

    expect(gitlab.listFiles).toHaveBeenCalledWith(infraProject, {
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

    const infraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' })
    datastore.getAllProjects.mockResolvedValue([mockProject])
    gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(infraProject)
    gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
    gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
    gitlab.listFiles.mockResolvedValue([
      makeRepositoryTreeSchema(
        { name: 'values.yaml', path: 'Project 1/cluster-1/dev/values.yaml' },
      ),
      makeRepositoryTreeSchema(
        { name: 'values.yaml', path: 'Project 1/cluster-1/prod/values.yaml' },
      ),
    ])
    vault.readProjectValues.mockResolvedValue({ secret: 'value' })
    gitlab.generateCreateOrUpdateAction.mockImplementation(async (_repoId, _ref, filePath: string, content: string) => {
      return makeCommitAction({ filePath, content })
    })

    await expect(service.handleCron()).resolves.not.toThrow()

    expect(gitlab.maybeCreateCommit).toHaveBeenCalledTimes(1)
    expect(gitlab.maybeCreateCommit).toHaveBeenCalledWith(
      infraProject,
      'ci: :robot_face: Sync project-1',
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
    )

    expect(gitlab.generateCreateOrUpdateAction).toHaveBeenCalledTimes(1)
  })

  it('should not commit when there is no diff', async () => {
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

    const infraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' })
    datastore.getAllProjects.mockResolvedValue([mockProject])
    gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(infraProject)
    gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
    gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
    gitlab.listFiles.mockResolvedValue([])
    vault.readProjectValues.mockResolvedValue({ secret: 'value' })

    gitlab.generateCreateOrUpdateAction.mockResolvedValue(null as any)

    await expect(service.handleCron()).resolves.not.toThrow()

    expect(gitlab.maybeCreateCommit).not.toHaveBeenCalled()
  })
})
