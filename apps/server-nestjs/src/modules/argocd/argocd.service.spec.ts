import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { generateNamespaceName } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { parse, stringify } from 'yaml'
import { argocdConfigFactory } from '../../config/argocd.config'
import { baseConfigFactory } from '../../config/base.config'
import { vaultConfigFactory } from '../../config/vault.config'
import { GitlabClientService } from '../gitlab/gitlab-client.service'
import { makeCommitAction, makeProjectSchema, makeRepositoryTreeSchema } from '../gitlab/gitlab-testing.utils'
import { VaultClientService } from '../vault/vault-client.service'
import { ArgoCDDatastoreService } from './argocd-datastore.service'
import {
  makeProjectDeployment,
  makeProjectDeploymentSource,
  makeProjectEnvironment,
  makeProjectExternalValueSource,
  makeProjectInternalValueSource,
  makeProjectRepository,
  makeProjectWithDetails,
} from './argocd-testing.utils'
import { ArgoCDService } from './argocd.service'

describe('argoCDService', () => {
  let service: ArgoCDService
  let datastore: DeepMockProxy<ArgoCDDatastoreService>
  let gitlab: DeepMockProxy<GitlabClientService>
  let vault: DeepMockProxy<VaultClientService>
  let argocdConfig: DeepMockProxy<ConfigType<typeof argocdConfigFactory>>
  let baseConfig: DeepMockProxy<ConfigType<typeof baseConfigFactory>>
  let vaultConfig: DeepMockProxy<ConfigType<typeof vaultConfigFactory>>

  beforeEach(async () => {
    datastore = mockDeep<ArgoCDDatastoreService>()
    gitlab = mockDeep<GitlabClientService>()
    vault = mockDeep<VaultClientService>()
    argocdConfig = mockDeep<ConfigType<typeof argocdConfigFactory>>({
      namespace: 'argocd',
      url: 'https://argocd.internal',
      internalUrl: undefined,
      extraRepositories: ['repo3'],
      dsoEnvChartVersion: 'dso-env-1.6.0',
      dsoNsChartVersion: 'dso-ns-1.1.5',
      vaultDeployVaultConnectionInNs: false,
    })
    baseConfig = mockDeep<ConfigType<typeof baseConfigFactory>>({
      projectsRootDir: 'forge',
    })
    vaultConfig = mockDeep<ConfigType<typeof vaultConfigFactory>>({
      url: 'https://vault.internal',
      kvName: 'kv',
      internalUrl: undefined,
    })

    datastore.getAllZoneSlugs.mockResolvedValue(['zone-1'])

    const module = await Test.createTestingModule({
      providers: [
        ArgoCDService,
        { provide: ArgoCDDatastoreService, useValue: datastore },
        { provide: argocdConfigFactory.KEY, useValue: argocdConfig },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
        { provide: vaultConfigFactory.KEY, useValue: vaultConfig },
        { provide: GitlabClientService, useValue: gitlab },
        { provide: VaultClientService, useValue: vault },
      ],
    }).compile()

    service = module.get(ArgoCDService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('handleUpsert', () => {
    it('should return OK result when ensureProject succeeds', async () => {
      const mockProject = makeProjectWithDetails({
        slug: 'project-1',
        name: 'Project 1',
        environments: [],
        repositories: [],
        deployments: [],
      })

      const infraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' })
      gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(infraProject)
      gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
      gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
      gitlab.listFiles.mockResolvedValue([])
      gitlab.generateCreateOrUpdateAction.mockResolvedValue(null)
      gitlab.maybeCreateCommit.mockResolvedValue(undefined)

      const result = await service.handleUpsert(mockProject)

      expect(result).toEqual({
        argocd: expect.objectContaining({
          status: 'OK',
          message: 'Up to date',
          executionTime: expect.any(Number),
        }),
      })
    })

    it('should return KO result when ensureProject throws', async () => {
      const mockProject = makeProjectWithDetails({
        slug: 'project-1',
        name: 'Project 1',
        environments: [
          makeProjectEnvironment({ name: 'dev', cluster: { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } } }),
        ],
        repositories: [makeProjectRepository({ internalRepoName: 'infra-repo', isInfra: true })],
        deployments: [],
      })

      const error = new Error('GitLab unreachable')
      gitlab.getOrCreateInfraGroupRepo.mockRejectedValue(error)

      const result = await service.handleUpsert(mockProject)

      expect(result).toEqual({
        argocd: expect.objectContaining({
          status: 'KO',
          message: 'GitLab unreachable',
          executionTime: expect.any(Number),
          error,
        }),
      })
    })
  })

  describe('handleDelete', () => {
    it('should delete every project values file in every zone', async () => {
      const mockProject = makeProjectWithDetails({
        slug: 'project-1',
        name: 'Project 1',
        environments: [
          makeProjectEnvironment({ name: 'dev', cluster: { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } } }),
        ],
        repositories: [makeProjectRepository({ internalRepoName: 'infra-repo', isInfra: true })],
        deployments: [],
      })

      const zone1InfraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra-1' })
      const zone2InfraProject = makeProjectSchema({ id: 200, http_url_to_repo: 'https://gitlab.internal/infra-2' })
      // The project has no environment left in zone-2, its leftovers must still be purged.
      datastore.getAllZoneSlugs.mockResolvedValue(['zone-1', 'zone-2'])
      gitlab.getOrCreateInfraGroupRepo.mockImplementation(async zoneSlug =>
        zoneSlug === 'zone-1' ? zone1InfraProject : zone2InfraProject,
      )
      gitlab.listFiles.mockImplementation(async repo => repo.id === 100
        ? [
            makeRepositoryTreeSchema({ name: 'values.yaml', path: 'Project 1/cluster-1/dev/values.yaml' }),
            makeRepositoryTreeSchema({ name: 'README.md', path: 'Project 1/README.md' }),
          ]
        : [
            makeRepositoryTreeSchema({ name: 'values.yaml', path: 'Project 1/cluster-2/prod/values.yaml' }),
          ])

      const result = await service.handleDelete(mockProject)

      expect(result).toEqual({
        argocd: expect.objectContaining({ status: 'OK' }),
      })

      expect(gitlab.generateCreateOrUpdateAction).not.toHaveBeenCalled()
      expect(gitlab.listFiles).toHaveBeenCalledWith(zone1InfraProject, { path: 'Project 1/', recursive: true })
      expect(gitlab.listFiles).toHaveBeenCalledWith(zone2InfraProject, { path: 'Project 1/', recursive: true })
      expect(gitlab.maybeCreateCommit).toHaveBeenCalledTimes(2)
      expect(gitlab.maybeCreateCommit).toHaveBeenCalledWith(
        zone1InfraProject,
        'ci: :robot_face: Delete project-1',
        [{ action: 'delete', filePath: 'Project 1/cluster-1/dev/values.yaml' }],
      )
      expect(gitlab.maybeCreateCommit).toHaveBeenCalledWith(
        zone2InfraProject,
        'ci: :robot_face: Delete project-1',
        [{ action: 'delete', filePath: 'Project 1/cluster-2/prod/values.yaml' }],
      )
    })

    it('should not commit when values files are already absent', async () => {
      const mockProject = makeProjectWithDetails({
        slug: 'project-1',
        name: 'Project 1',
        environments: [
          makeProjectEnvironment({ name: 'dev', cluster: { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } } }),
        ],
        repositories: [],
        deployments: [],
      })

      gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(makeProjectSchema({ id: 100 }))
      gitlab.listFiles.mockResolvedValue([])

      const result = await service.handleDelete(mockProject)

      expect(result).toEqual({
        argocd: expect.objectContaining({ status: 'OK' }),
      })
      expect(gitlab.maybeCreateCommit).not.toHaveBeenCalled()
    })

    it('should return KO result when the cleanup throws', async () => {
      const mockProject = makeProjectWithDetails({
        slug: 'project-1',
        name: 'Project 1',
        environments: [],
        repositories: [],
        deployments: [],
      })

      const error = new Error('GitLab unreachable')
      gitlab.getOrCreateInfraGroupRepo.mockRejectedValue(error)

      const result = await service.handleDelete(mockProject)

      expect(result).toEqual({
        argocd: expect.objectContaining({
          status: 'KO',
          message: 'GitLab unreachable',
          executionTime: expect.any(Number),
          error,
        }),
      })
    })
  })

  it('should sync project environments', async () => {
    const mockProject = makeProjectWithDetails({
      slug: 'project-1',
      name: 'Project 1',
      environments: [
        makeProjectEnvironment({ name: 'dev', cluster: { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } } }),
        makeProjectEnvironment({ name: 'prod', cluster: { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } } }),
      ],
      repositories: [makeProjectRepository({ internalRepoName: 'infra-repo', isInfra: true })],
      plugins: [{ pluginName: 'argocd', key: 'extraRepositories', value: 'repo2' }],
      deployments: [],
    })

    const infraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' })
    datastore.getAllProjects.mockResolvedValue([mockProject])
    gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(infraProject)
    gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
    gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
    gitlab.listFiles.mockResolvedValue([])
    vault.getAuthApproleRoleRoleId.mockResolvedValue('role-id')
    vault.ensureAuthApproleRoleSecretId.mockResolvedValue('secret-id')
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
              'dso/project.id': mockProject.id,
              'dso/project.slug': 'project-1',
              'dso/environment': 'dev',
              'dso/environment.id': mockProject.environments[0].id,
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
                'https://gitlab.internal/group/project-1/**',
                'repo2',
              ],
              destination: {
                namespace: generateNamespaceName(mockProject.id, mockProject.environments[0].id),
                name: 'cluster-1',
              },
              autosync: true,
              vault: {
                projectsRootDir: 'forge',
                url: '',
                coreKvName: 'kv',
                roleId: 'role-id',
                secretId: 'secret-id',
              },
              repositories: [
                {
                  id: mockProject.repositories[0].id,
                  name: 'infra-repo',
                  repoURL: `https://gitlab.internal/group/project-1/infra-repo.git`,
                  targetRevision: 'HEAD',
                  path: '.',
                  valueFiles: [],
                  valueSources: [],
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
              'dso/project.id': mockProject.id,
              'dso/project.slug': 'project-1',
              'dso/environment': 'prod',
              'dso/environment.id': mockProject.environments[1].id,
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
                'https://gitlab.internal/group/project-1/**',
                'repo2',
              ],
              destination: {
                namespace: generateNamespaceName(mockProject.id, mockProject.environments[1].id),
                name: 'cluster-1',
              },
              autosync: true,
              vault: {
                projectsRootDir: 'forge',
                url: '',
                coreKvName: 'kv',
                roleId: 'role-id',
                secretId: 'secret-id',
              },
              repositories: [
                {
                  id: mockProject.repositories[0].id,
                  name: 'infra-repo',
                  repoURL: 'https://gitlab.internal/group/project-1/infra-repo.git',
                  targetRevision: 'HEAD',
                  path: '.',
                  valueFiles: [],
                  valueSources: [],
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
    const mockProject = makeProjectWithDetails({
      slug: 'project-1',
      name: 'Project 1',
      environments: [
        makeProjectEnvironment({ name: 'dev', cluster: { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } } }),
      ],
      repositories: [makeProjectRepository({ internalRepoName: 'infra-repo', isInfra: true })],
      deployments: [],
    })

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
    vault.getAuthApproleRoleRoleId.mockResolvedValue('role-id')
    vault.ensureAuthApproleRoleSecretId.mockResolvedValue('secret-id')
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

  it('should delete leftover values files when the project has no environments', async () => {
    const mockProject = makeProjectWithDetails({
      slug: 'project-1',
      name: 'Project 1',
      environments: [],
      repositories: [makeProjectRepository({ internalRepoName: 'infra-repo', isInfra: true })],
      deployments: [],
    })

    const infraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' })
    datastore.getAllProjects.mockResolvedValue([mockProject])
    // The project no longer has any environment, so the zone must be discovered
    // from the platform zone list rather than from the project's environments.
    datastore.getAllZoneSlugs.mockResolvedValue(['zone-1'])
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

    await expect(service.handleCron()).resolves.not.toThrow()

    expect(gitlab.maybeCreateCommit).toHaveBeenCalledTimes(1)
    expect(gitlab.maybeCreateCommit).toHaveBeenCalledWith(
      infraProject,
      'ci: :robot_face: Sync project-1',
      expect.arrayContaining([
        {
          action: 'delete',
          filePath: 'Project 1/cluster-1/dev/values.yaml',
        },
        {
          action: 'delete',
          filePath: 'Project 1/cluster-1/prod/values.yaml',
        },
      ]),
    )

    expect(gitlab.generateCreateOrUpdateAction).not.toHaveBeenCalled()
  })

  it('should not commit when there is no diff', async () => {
    const mockProject = makeProjectWithDetails({
      slug: 'project-1',
      name: 'Project 1',
      environments: [
        makeProjectEnvironment({ name: 'dev', cluster: { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } } }),
      ],
      repositories: [makeProjectRepository({ internalRepoName: 'infra-repo', isInfra: true })],
      deployments: [],
    })

    const infraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' })
    datastore.getAllProjects.mockResolvedValue([mockProject])
    gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(infraProject)
    gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
    gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
    gitlab.listFiles.mockResolvedValue([])
    vault.getAuthApproleRoleRoleId.mockResolvedValue('role-id')
    vault.ensureAuthApproleRoleSecretId.mockResolvedValue('secret-id')

    gitlab.generateCreateOrUpdateAction.mockResolvedValue(null)

    await expect(service.handleCron()).resolves.not.toThrow()

    expect(gitlab.maybeCreateCommit).not.toHaveBeenCalled()
  })

  it('should sync project deployments', async () => {
    const mockRepo = makeProjectRepository({ internalRepoName: 'infra-repo', isInfra: true })
    const mockDevEnv = makeProjectEnvironment({ name: 'dev', cluster: { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } } })
    const mockProdEnv = makeProjectEnvironment({ name: 'prod', cluster: { id: 'c1', label: 'cluster-1', zone: { slug: 'zone-1' } } })
    const mockProject = makeProjectWithDetails({
      slug: 'project-1',
      name: 'Project 1',
      environments: [
        mockDevEnv,
        mockProdEnv,
      ],
      repositories: [mockRepo],
      plugins: [{ pluginName: 'argocd', key: 'extraRepositories', value: 'repo2' }],
      deployments: [
        makeProjectDeployment({
          environment: mockDevEnv,
          deploymentSources: [makeProjectDeploymentSource({ repository: mockRepo, targetRevision: 'dev' })],
        }),
        makeProjectDeployment({
          environment: mockDevEnv,
          deploymentSources: [makeProjectDeploymentSource({ repository: mockRepo, targetRevision: '1.0.0', path: 'service-1' })],
        }),
        makeProjectDeployment({
          environment: mockProdEnv,
          deploymentSources: [makeProjectDeploymentSource({ repository: mockRepo, targetRevision: 'prod' })],
        }),
      ],
    })

    const infraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' })
    datastore.getAllProjects.mockResolvedValue([mockProject])
    gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(infraProject)
    gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
    gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
    gitlab.listFiles.mockResolvedValue([])
    vault.getAuthApproleRoleRoleId.mockResolvedValue('role-id')
    vault.ensureAuthApproleRoleSecretId.mockResolvedValue('secret-id')
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
              'dso/project.id': mockProject.id,
              'dso/project.slug': 'project-1',
              'dso/environment': 'dev',
              'dso/environment.id': mockProject.environments[0].id,
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
                'https://gitlab.internal/group/project-1/**',
                'repo2',
              ],
              destination: {
                namespace: generateNamespaceName(mockProject.id, mockDevEnv.id),
                name: 'cluster-1',
              },
              autosync: true,
              vault: {
                projectsRootDir: 'forge',
                url: '',
                coreKvName: 'kv',
                roleId: 'role-id',
                secretId: 'secret-id',
              },
              repositories: [
                {
                  name: 'infra-repo',
                  id: mockRepo.id,
                  repoURL: `https://gitlab.internal/group/project-1/infra-repo.git`,
                  targetRevision: 'dev',
                  path: '.',
                  valueFiles: [],
                  valueSources: [],
                },
                {
                  name: 'infra-repo',
                  id: mockRepo.id,
                  repoURL: `https://gitlab.internal/group/project-1/infra-repo.git`,
                  targetRevision: '1.0.0',
                  path: 'service-1',
                  valueFiles: [],
                  valueSources: [],
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
      ]),
    )

    expect(gitlab.listFiles).toHaveBeenCalledWith(infraProject, {
      path: 'Project 1/',
      recursive: true,
    })

    expect(gitlab.generateCreateOrUpdateAction).toHaveBeenCalledTimes(4) // 2 environments + 2 deployments
  })

  it('should generate multi-source valueSources (internal + external) for a deployment', async () => {
    const mockDevEnv = makeProjectEnvironment({
      name: 'dev',
      cluster: {
        id: 'c1',
        label: 'cluster-1',
        zone: { slug: 'zone-1' },
      },
    })
    const mockAppRepo = makeProjectRepository({ internalRepoName: 'app-repo' })
    const mockValueRepo = makeProjectRepository({ internalRepoName: 'infra-values' })
    const mockProject = makeProjectWithDetails({
      name: 'Project 1',
      slug: 'project-1',
      environments: [mockDevEnv],
      repositories: [mockAppRepo, mockValueRepo],
      plugins: [],
      deployments: [
        makeProjectDeployment({
          environment: mockDevEnv,
          deploymentSources: [
            makeProjectDeploymentSource({
              repository: mockAppRepo,
              targetRevision: 'dev',
              internalValueSources: [
                makeProjectInternalValueSource({ order: 0, path: 'values.yaml' }),
              ],
              externalValueSource: makeProjectExternalValueSource({
                order: 1,
                ref: 'infra-values',
                path: 'envs/dev/values.yaml',
                targetRevision: 'main',
                repository: { internalRepoName: 'infra-values' },
              }),
            }),
          ],
        }),
      ],
    })

    const infraProject = makeProjectSchema({ id: 100, http_url_to_repo: 'https://gitlab.internal/infra' })
    datastore.getAllProjects.mockResolvedValue([mockProject])
    gitlab.getOrCreateInfraGroupRepo.mockResolvedValue(infraProject)
    gitlab.getOrCreateProjectGroupPublicUrl.mockResolvedValue('https://gitlab.internal/group')
    gitlab.getOrCreateInfraGroupRepoPublicUrl.mockResolvedValue('https://gitlab.internal/infra-repo')
    gitlab.listFiles.mockResolvedValue([])
    vault.getAuthApproleRoleRoleId.mockResolvedValue('role-id')
    vault.ensureAuthApproleRoleSecretId.mockResolvedValue('secret-id')
    gitlab.generateCreateOrUpdateAction.mockImplementation(async (_repoId, _ref, filePath: string, content: string) => {
      return makeCommitAction({ filePath, content })
    })

    await expect(service.handleCron()).resolves.not.toThrow()

    const actions = gitlab.maybeCreateCommit.mock.calls[0][2]
    const parsedValues = actions
      .filter((action): action is typeof action & { content: string } => 'content' in action)
      .map(action => parse(action.content))
    const values = parsedValues.find(v => v.application?.repositories?.[0]?.valueSources?.length)
    expect(values).toBeDefined()

    expect(values.application.repositories[0].valueSources).toStrictEqual([
      { type: 'internal', path: 'values.yaml' },
      {
        type: 'external',
        ref: 'infra-values',
        repoURL: 'https://gitlab.internal/group/project-1/infra-values.git',
        targetRevision: 'main',
        path: 'envs/dev/values.yaml',
      },
    ])
  })
})
