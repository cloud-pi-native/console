import type { DeepMockProxy } from 'vitest-mock-extended'
import { DISABLED, ENABLED } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultError } from '../vault/vault-http-client.service'
import { makeVaultSecret } from '../vault/vault-testing.utils'
import { NexusClientService } from './nexus-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { makeProjectWithDetails } from './nexus-testing.utils'
import {
  NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO,
  NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO,
  PLATFORM_READ_GROUP_PATHS_PLUGIN_KEY,
  PLATFORM_WRITE_GROUP_PATHS_PLUGIN_KEY,
  PLUGIN_NAME,
  PROJECT_READ_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_WRITE_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
} from './nexus.constants'
import { NexusService } from './nexus.service'

describe('nexusService', () => {
  let service: NexusService
  let client: DeepMockProxy<NexusClientService>
  let datastore: DeepMockProxy<NexusDatastoreService>
  let vault: DeepMockProxy<VaultClientService>
  let config: DeepMockProxy<ConfigurationService>

  beforeEach(async () => {
    client = mockDeep<NexusClientService>({
      getRepositoriesMavenHosted: vi.fn().mockResolvedValue(null),
      getRepositoriesMavenGroup: vi.fn().mockResolvedValue(null),
      getRepositoriesNpmHosted: vi.fn().mockResolvedValue(null),
      getRepositoriesNpmGroup: vi.fn().mockResolvedValue(null),
      getSecurityPrivileges: vi.fn().mockResolvedValue(null),
      getSecurityRoles: vi.fn().mockResolvedValue(null),
      getSecurityUsers: vi.fn().mockResolvedValue([]),
    })
    datastore = mockDeep<NexusDatastoreService>({
      getAllProjects: vi.fn().mockResolvedValue([]),
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
    })
    vault = mockDeep<VaultClientService>({
      read: vi.fn().mockRejectedValue(new VaultError('NotFound', 'Not Found')),
    })
    config = mockDeep<ConfigurationService>({ projectRootDir: 'forge' })

    const module = await Test.createTestingModule({
      providers: [
        NexusService,
        { provide: NexusClientService, useValue: client },
        { provide: NexusDatastoreService, useValue: datastore },
        { provide: VaultClientService, useValue: vault },
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()

    service = module.get(NexusService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('handleUpsert should reconcile based on computed flags', async () => {
    const project = makeProjectWithDetails({
      owner: { email: 'owner@example.com', firstName: 'Owner', lastName: 'User' },
      plugins: [
        { pluginName: PLUGIN_NAME, key: NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO, value: ENABLED },
        { pluginName: PLUGIN_NAME, key: NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO, value: DISABLED },
      ],
    })

    await service.handleUpsert(project)

    expect(client.createRepositoriesMavenHosted).toHaveBeenCalled()
    expect(client.deleteRepositoriesByName).toHaveBeenCalled()
    expect(vault.write).toHaveBeenCalledWith(
      expect.objectContaining({
        NEXUS_USERNAME: project.slug,
        NEXUS_PASSWORD: expect.any(String),
      }),
      `forge/${project.slug}/tech/NEXUS`,
    )
  })

  it('handleDelete should delete project', async () => {
    const project = makeProjectWithDetails()
    await service.handleDelete(project)
    expect(client.deleteSecurityRoles).toHaveBeenCalledWith(`${project.slug}-ID`)
    expect(client.deleteSecurityUsers).toHaveBeenCalledWith(project.slug)
    expect(vault.delete).toHaveBeenCalledWith(`forge/${project.slug}/tech/NEXUS`)
  })

  it('handleCron should reconcile all projects', async () => {
    const projects = [
      makeProjectWithDetails({ plugins: [{ pluginName: PLUGIN_NAME, key: NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO, value: ENABLED }] }),
      makeProjectWithDetails({ plugins: [{ pluginName: PLUGIN_NAME, key: NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO, value: ENABLED }] }),
    ]

    datastore.getAllProjects.mockResolvedValue(projects)

    await service.handleCron()

    expect(client.createSecurityUsers).toHaveBeenCalledTimes(2)
  })

  it('reuses existing vault password and does not rotate Nexus user password', async () => {
    const project = makeProjectWithDetails({
      owner: { email: 'owner@example.com', firstName: 'Owner', lastName: 'User' },
      plugins: [{ pluginName: PLUGIN_NAME, key: NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO, value: ENABLED }],
    })

    datastore.getAdminPluginConfig.mockImplementation(async (_plugin, key) => {
      if (key === PLATFORM_READ_GROUP_PATHS_PLUGIN_KEY) return ' '
      if (key === PLATFORM_WRITE_GROUP_PATHS_PLUGIN_KEY) return ' '
      return null
    })

    vault.read.mockResolvedValue(makeVaultSecret({ data: { NEXUS_PASSWORD: 'existing' } }))
    client.getSecurityUsers.mockResolvedValue([{ userId: project.slug }])

    await service.handleUpsert(project)

    expect(client.updateSecurityUsersChangePassword).not.toHaveBeenCalled()
    expect(client.createSecurityUsers).not.toHaveBeenCalled()
    expect(vault.write).toHaveBeenCalledWith(expect.objectContaining({
      NEXUS_USERNAME: project.slug,
      NEXUS_PASSWORD: 'existing',
    }), `forge/${project.slug}/tech/NEXUS`)
  })

  it('deletes group repos before their hosted members', async () => {
    const project = makeProjectWithDetails()

    await service.handleDelete(project)

    const deletedRepos = client.deleteRepositoriesByName.mock.calls.map(([name]) => name)
    expect(deletedRepos.indexOf(`${project.slug}-repository-group`))
      .toBeLessThan(deletedRepos.indexOf(`${project.slug}-repository-snapshot`))
    expect(deletedRepos.indexOf(`${project.slug}-repository-group`))
      .toBeLessThan(deletedRepos.indexOf(`${project.slug}-repository-release`))
    expect(deletedRepos.indexOf(`${project.slug}-npm-group`))
      .toBeLessThan(deletedRepos.indexOf(`${project.slug}-npm`))
  })

  it('tolerates platform role failures when ensuring platform roles', async () => {
    const project = makeProjectWithDetails({
      owner: { email: 'owner@example.com', firstName: 'Owner', lastName: 'User' },
      plugins: [{ pluginName: PLUGIN_NAME, key: NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO, value: ENABLED }],
    })
    const staleProject = makeProjectWithDetails({
      plugins: [{ pluginName: PLUGIN_NAME, key: NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO, value: ENABLED }],
    })

    datastore.getAllProjects.mockResolvedValue([project, staleProject])
    client.createSecurityRoles.mockImplementation(async (body) => {
      if (body.id.startsWith('console-')) throw new Error('Request failed: POST security/roles responded 400 Bad Request')
    })

    await expect(service.handleUpsert(project)).resolves.not.toThrow()

    expect(client.createSecurityRoles).toHaveBeenCalledWith(expect.objectContaining({ id: 'console-admin' }))
  })

  it('dedupes project group roles by role id and keeps the highest privileges', async () => {
    const project = makeProjectWithDetails({
      owner: { email: 'owner@example.com', firstName: 'Owner', lastName: 'User' },
      plugins: [
        { pluginName: PLUGIN_NAME, key: NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO, value: ENABLED },
        { pluginName: PLUGIN_NAME, key: PROJECT_WRITE_GROUP_PATH_SUFFIXES_PLUGIN_KEY, value: '/console/devops' },
        { pluginName: PLUGIN_NAME, key: PROJECT_READ_GROUP_PATH_SUFFIXES_PLUGIN_KEY, value: '/console/devops' },
      ],
    })

    datastore.getAdminPluginConfig.mockImplementation(async (_plugin, key) => {
      if (key === PLATFORM_READ_GROUP_PATHS_PLUGIN_KEY) return ' '
      if (key === PLATFORM_WRITE_GROUP_PATHS_PLUGIN_KEY) return ' '
      return null
    })

    await service.handleUpsert(project)

    expect(client.createSecurityRoles).toHaveBeenCalledWith(expect.objectContaining({
      id: `${project.slug}-console-devops`,
      privileges: expect.arrayContaining([`${project.slug}-privilege-group`]),
    }))
  })
})
