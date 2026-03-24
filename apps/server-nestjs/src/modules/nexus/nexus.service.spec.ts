import type { Mocked } from 'vitest'
import { ENABLED } from '@cpn-console/shared'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService, VaultError } from '../vault/vault-client.service'
import { NexusClientService } from './nexus-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { makeProjectWithDetails } from './nexus-testing.utils'
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
          projectRootPath: 'forge',
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

    client.getRepositoriesMavenHosted.mockResolvedValue(null)
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
      slug: 'project-1',
      owner: { email: 'owner@example.com' },
      plugins: [
        { key: 'activateMavenRepo', value: ENABLED },
        { key: 'activateNpmRepo', value: 'disabled' },
      ],
    })

    await service.handleUpsert(project)

    expect(client.createRepositoriesMavenHosted).toHaveBeenCalled()
    expect(client.deleteRepositoriesByName).toHaveBeenCalled()
    expect(vault.write).toHaveBeenCalledWith(
      expect.objectContaining({
        NEXUS_USERNAME: 'project-1',
        NEXUS_PASSWORD: expect.any(String),
      }),
      'forge/project-1/tech/NEXUS',
    )
  })

  it('handleDelete should delete project', async () => {
    const project = makeProjectWithDetails({ slug: 'project-1' })
    await service.handleDelete(project)
    expect(client.deleteSecurityRoles).toHaveBeenCalledWith('project-1-ID')
    expect(client.deleteSecurityUsers).toHaveBeenCalledWith('project-1')
    expect(vault.delete).toHaveBeenCalledWith('forge/project-1/tech/NEXUS')
  })

  it('handleCron should reconcile all projects', async () => {
    const projects = [
      makeProjectWithDetails({ slug: 'project-1', plugins: [{ key: 'activateMavenRepo', value: ENABLED }] }),
      makeProjectWithDetails({ slug: 'project-2', plugins: [{ key: 'activateNpmRepo', value: ENABLED }] }),
    ]

    nexusDatastore.getAllProjects.mockResolvedValue(projects)

    await service.handleCron()

    expect(client.createSecurityUsers).toHaveBeenCalledTimes(2)
  })
})
