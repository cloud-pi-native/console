import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteProject, upsertProject } from './functions.js'
import type { ClusterObject, Environment, Project, Repository } from '@cpn-console/hooks'
import { dump } from 'js-yaml'

vi.mock('./utils.js', () => ({
  generateAppProjectName: vi.fn(() => 'app-project-name'),
  getConfig: vi.fn(() => ({ namespace: 'argocd', url: 'https://argocd.example.com' })),
}))

vi.mock('@cpn-console/shared', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@cpn-console/shared')>()
  return {
    ...mod,
    generateNamespaceName: vi.fn(() => 'namespace-name'),
  }
})

describe('argocd functions', () => {
  const mockGitlabApi = {
    // Used to get the public group URL for sourceRepositories
    getPublicGroupUrl: vi.fn(),
    // Used to get or create the infra project where values.yaml is stored
    getOrCreateInfraProject: vi.fn(),
    // Used to get the infra project details (repo URL)
    getProjectById: vi.fn(),
    // Used to resolve the public URL of a repository
    getPublicRepoUrl: vi.fn(),
    // Used to commit the values.yaml file
    commitCreateOrUpdate: vi.fn(),
    // Used to list files in the infra project for cleanup
    listFiles: vi.fn(),
    // Used to delete files from the infra project
    commitDelete: vi.fn(),
  }
  // Used to get the RO and RW groups for the environment
  const mockKeycloakApi = {
    getEnvGroup: vi.fn(),
  }
  // Used to get user vault secrets
  const mockVaultApi = {
    Project: {
      getValues: vi.fn(),
    },
  }

  let mockCluster: ClusterObject
  let mockEnvironment: Environment
  let mockRepo: Repository
  let mockProject: Project

  beforeEach(() => {
    vi.clearAllMocks()

    mockCluster = {
      id: faker.string.uuid(),
      label: faker.string.alphanumeric(10),
      zone: { slug: faker.string.alphanumeric(5) },
      privacy: 'public',
    } as any

    mockEnvironment = {
      id: faker.string.uuid(),
      name: faker.string.alphanumeric(5),
      clusterId: mockCluster.id,
      cpu: faker.number.int({ min: 1, max: 10 }),
      memory: faker.number.int({ min: 1, max: 32 }),
      gpu: 0,
      autosync: true,
    } as any

    mockRepo = {
      id: faker.string.uuid(),
      internalRepoName: faker.string.alphanumeric(10),
      isInfra: true,
      helmValuesFiles: null,
      deployRevision: 'main',
      deployPath: '/deploy',
    } as any

    mockProject = {
      id: faker.string.uuid(),
      name: faker.string.alphanumeric(10),
      slug: faker.string.alphanumeric(10),
      repositories: [mockRepo],
      environments: [mockEnvironment],
      clusters: [mockCluster],
      store: {},
    } as any
  })

  it('upsertProject should succeed', async () => {
    const infraProjectId = faker.number.int()
    const infraProjectUrl = faker.internet.url()
    const gitlabGroupUrl = faker.internet.url()
    const gitlabRepoUrl = faker.internet.url()

    mockGitlabApi.getPublicGroupUrl.mockResolvedValue(gitlabGroupUrl)
    mockGitlabApi.getOrCreateInfraProject.mockResolvedValue({ id: infraProjectId, http_url_to_repo: infraProjectUrl })
    mockKeycloakApi.getEnvGroup.mockResolvedValue({ subgroups: { RO: '/ro', RW: '/rw' } })
    mockVaultApi.Project.getValues.mockResolvedValue({ secret: 'value' })
    mockGitlabApi.getProjectById.mockResolvedValue({ http_url_to_repo: infraProjectUrl })
    mockGitlabApi.listFiles.mockResolvedValue([]) // No files to delete
    mockGitlabApi.getPublicRepoUrl.mockResolvedValue(gitlabRepoUrl)

    const payload = {
      args: mockProject,
      apis: {
        gitlab: mockGitlabApi,
        keycloak: mockKeycloakApi,
        vault: mockVaultApi,
      },
      config: {},
    } as any

    const result = await upsertProject(payload)

    expect(result.status.result).toBe('OK')

    const expectedValues = {
      common: {
        'dso/project': mockProject.name,
        'dso/project.id': mockProject.id,
        'dso/project.slug': mockProject.slug,
        'dso/environment': mockEnvironment.name,
        'dso/environment.id': mockEnvironment.id,
      },
      argocd: {
        cluster: 'in-cluster',
        namespace: 'argocd',
        project: 'app-project-name',
        envChartVersion: 'dso-env-1.6.0',
        nsChartVersion: 'dso-ns-1.1.5',
      },
      environment: {
        valueFileRepository: infraProjectUrl,
        valueFileRevision: 'HEAD',
        valueFilePath: `${mockProject.name}/${mockCluster.label}/${mockEnvironment.name}/values.yaml`,
        roGroup: '/ro',
        rwGroup: '/rw',
        platformAdminGroup: '/console/admin',
        platformReadonlyGroup: '/console/readonly',
        projectAdminGroup: `/${mockProject.slug}/console/admin`,
        projectDevopsGroup: `/${mockProject.slug}/console/devops`,
        projectDevelopperGroup: `/${mockProject.slug}/console/developer`,
        projectReadonlyGroup: `/${mockProject.slug}/console/readonly`,
      },
      application: {
        quota: {
          cpu: mockEnvironment.cpu,
          gpu: mockEnvironment.gpu,
          memory: `${mockEnvironment.memory}Gi`,
        },
        sourceRepositories: [
          `${gitlabGroupUrl}/**`,
        ],
        destination: {
          namespace: 'namespace-name',
          name: mockCluster.label,
        },
        autosync: true,
        vault: { secret: 'value' },
        repositories: [
          {
            id: mockRepo.id,
            name: mockRepo.internalRepoName,
            repoURL: gitlabRepoUrl,
            targetRevision: 'main',
            path: '/deploy',
            valueFiles: [],
          },
        ],
      },
    }

    expect(mockGitlabApi.commitCreateOrUpdate).toHaveBeenCalledWith(
      infraProjectId,
      dump(expectedValues),
      `${mockProject.name}/${mockCluster.label}/${mockEnvironment.name}/values.yaml`,
    )
    expect(mockGitlabApi.commitDelete).toHaveBeenCalledWith(infraProjectId, [])
  })

  it('deleteProject should succeed', async () => {
    const infraProjectId = faker.number.int()
    mockGitlabApi.getOrCreateInfraProject.mockResolvedValue({ id: infraProjectId })
    mockGitlabApi.listFiles.mockResolvedValue([
      { type: 'blob', path: 'path/to/file1' },
      { type: 'tree', path: 'path/to/dir' },
      { type: 'blob', path: 'path/to/file2' },
    ])

    const payload = {
      args: mockProject,
      apis: {
        gitlab: mockGitlabApi,
      },
    } as any

    const result = await deleteProject(payload)

    expect(result.status.result).toBe('OK')
    expect(mockGitlabApi.commitDelete).toHaveBeenCalledWith(infraProjectId, ['path/to/file1', 'path/to/file2'])
  })
})
