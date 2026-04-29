import type { Mocked } from 'vitest'
import { ENABLED } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultError } from '../vault/vault-http-client.service.js'
import { NexusClientService } from './nexus-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { makeProjectWithDetails } from './nexus-testing.utils'
import {
  NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO,
  NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO,
  PLATFORM_READ_GROUP_PATHS_PLUGIN_KEY,
  PLATFORM_WRITE_GROUP_PATHS_PLUGIN_KEY,
  PROJECT_READ_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_WRITE_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
} from './nexus.constants'
import { NexusService } from './nexus.service'

function createNexusControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      NexusService,
      {
        provide: NexusClientService,
        useValue: {
          getRepositoriesMavenHosted: vi.fn(),
          createRepositoriesMavenHosted: vi.fn(),
          updateRepositoriesMavenHosted: vi.fn(),
          createRepositoriesMavenGroup: vi.fn(),
          updateRepositoriesMavenGroup: vi.fn(),
          getRepositoriesMavenGroup: vi.fn(),
          getRepositoriesNpmHosted: vi.fn(),
          createRepositoriesNpmHosted: vi.fn(),
          updateRepositoriesNpmHosted: vi.fn(),
          getRepositoriesNpmGroup: vi.fn(),
          postRepositoriesNpmGroup: vi.fn(),
          putRepositoriesNpmGroup: vi.fn(),
          getSecurityPrivileges: vi.fn(),
          createSecurityPrivilegesRepositoryView: vi.fn(),
          updateSecurityPrivilegesRepositoryView: vi.fn(),
          deleteSecurityPrivileges: vi.fn(),
          getSecurityRoles: vi.fn(),
          createSecurityRoles: vi.fn(),
          updateSecurityRoles: vi.fn(),
          deleteSecurityRoles: vi.fn(),
          getSecurityUsers: vi.fn(),
          updateSecurityUsersChangePassword: vi.fn(),
          createSecurityUsers: vi.fn(),
          deleteSecurityUsers: vi.fn(),
          deleteRepositoriesByName: vi.fn(),
        } satisfies Partial<NexusClientService>,
      },
      {
        provide: NexusDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
          getAdminPluginConfig: vi.fn(),
        } satisfies Partial<NexusDatastoreService>,
      },
      {
        provide: VaultClientService,
        useValue: {
          read: vi.fn(),
          write: vi.fn(),
          delete: vi.fn(),
        } satisfies Partial<VaultClientService>,
      },
      {
        provide: ConfigurationService,
        useValue: {
          projectRootDir: 'forge',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('nexusService', () => {
  let service: NexusService
  let client: Mocked<NexusClientService>
  let nexusDatastore: Mocked<NexusDatastoreService>
  let vault: Mocked<VaultClientService>

  beforeEach(async () => {
    const moduleRef = await createNexusControllerServiceTestingModule().compile()
    service = moduleRef.get(NexusService)
    client = moduleRef.get(NexusClientService)
    nexusDatastore = moduleRef.get(NexusDatastoreService)
    vault = moduleRef.get(VaultClientService)

    nexusDatastore.getAllProjects.mockResolvedValue([])
    nexusDatastore.getAdminPluginConfig.mockResolvedValue(null)

    client.getRepositoriesMavenHosted.mockResolvedValue(null)
    client.getRepositoriesMavenGroup.mockResolvedValue(null)
    client.getRepositoriesNpmHosted.mockResolvedValue(null)
    client.getRepositoriesNpmGroup.mockResolvedValue(null)
    client.getSecurityPrivileges.mockResolvedValue(null)
    client.getSecurityRoles.mockResolvedValue(null)
    client.getSecurityUsers.mockResolvedValue([])
    vault.read.mockRejectedValue(new VaultError('NotFound', 'Not Found'))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('handleUpsert should reconcile based on computed flags', async () => {
    const project = makeProjectWithDetails({
      owner: { email: 'owner@example.com', firstName: 'Owner', lastName: 'User' },
      plugins: [
        { key: NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO, value: ENABLED },
        { key: NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO, value: 'disabled' },
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
      makeProjectWithDetails({ plugins: [{ key: NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO, value: ENABLED }] }),
      makeProjectWithDetails({ plugins: [{ key: NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO, value: ENABLED }] }),
    ]

    nexusDatastore.getAllProjects.mockResolvedValue(projects)

    await service.handleCron()

    expect(client.createSecurityUsers).toHaveBeenCalledTimes(2)
  })

  it('reuses existing vault password and does not rotate Nexus user password', async () => {
    const project = makeProjectWithDetails({
      owner: { email: 'owner@example.com', firstName: 'Owner', lastName: 'User' },
      plugins: [{ key: NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO, value: ENABLED }],
    })

    nexusDatastore.getAdminPluginConfig.mockImplementation(async (_plugin, key) => {
      if (key === PLATFORM_READ_GROUP_PATHS_PLUGIN_KEY) return ' '
      if (key === PLATFORM_WRITE_GROUP_PATHS_PLUGIN_KEY) return ' '
      return null
    })

    vault.read.mockResolvedValue({ data: { NEXUS_PASSWORD: 'existing' } } as any)
    client.getSecurityUsers.mockResolvedValue([{ userId: project.slug } as any])

    await service.handleUpsert(project)

    expect(client.updateSecurityUsersChangePassword).not.toHaveBeenCalled()
    expect(client.createSecurityUsers).not.toHaveBeenCalled()
    expect(vault.write).toHaveBeenCalledWith(expect.objectContaining({
      NEXUS_USERNAME: project.slug,
      NEXUS_PASSWORD: 'existing',
    }), `forge/${project.slug}/tech/NEXUS`)
  })

  it('dedupes project group roles by role id and keeps the highest privileges', async () => {
    const project = makeProjectWithDetails({
      owner: { email: 'owner@example.com', firstName: 'Owner', lastName: 'User' },
      plugins: [
        { key: NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO, value: ENABLED },
        { key: PROJECT_WRITE_GROUP_PATH_SUFFIXES_PLUGIN_KEY, value: '/console/devops' },
        { key: PROJECT_READ_GROUP_PATH_SUFFIXES_PLUGIN_KEY, value: '/console/devops' },
      ],
    })

    nexusDatastore.getAdminPluginConfig.mockImplementation(async (_plugin, key) => {
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
