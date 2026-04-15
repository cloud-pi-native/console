import type { TestingModule } from '@nestjs/testing'
import type { Mocked } from 'vitest'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { makeProjectWithDetails, makeVaultSecret, makeZoneWithDetails } from './vault-testing.utils'
import { VaultService } from './vault.service'

const projectRoleGroupNameRegex = /^project-(.*)-(admin|devops|developer|readonly|security)$/

function createVaultControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      VaultService,
      {
        provide: VaultClientService,
        useValue: {
          createSysMount: vi.fn(),
          tuneSysMount: vi.fn(),
          deleteSysMounts: vi.fn(),
          upsertSysPoliciesAcl: vi.fn(),
          deleteSysPoliciesAcl: vi.fn(),
          upsertAuthApproleRole: vi.fn(),
          deleteAuthApproleRole: vi.fn(),
          upsertIdentityGroupName: vi.fn(),
          getIdentityGroupName: vi.fn(),
          deleteIdentityGroupName: vi.fn(),
          getSysAuth: vi.fn(),
          createIdentityGroupAlias: vi.fn(),
          listKvMetadata: vi.fn(),
          delete: vi.fn(),
        } satisfies Partial<VaultClientService>,
      },
      {
        provide: VaultDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
          getAllZones: vi.fn(),
          getAdminPluginConfig: vi.fn(),
        } satisfies Partial<VaultDatastoreService>,
      },
      {
        provide: ConfigurationService,
        useValue: {
          projectRootDir: 'forge',
          vaultKvName: 'kv',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('vaultService', () => {
  let service: VaultService
  let datastore: Mocked<VaultDatastoreService>
  let client: Mocked<VaultClientService>

  beforeEach(async () => {
    const module: TestingModule = await createVaultControllerServiceTestingModule().compile()
    service = module.get(VaultService)
    datastore = module.get(VaultDatastoreService)
    client = module.get(VaultClientService)

    datastore.getAdminPluginConfig.mockResolvedValue(null)
    client.createSysMount.mockResolvedValue(undefined)
    client.tuneSysMount.mockResolvedValue(undefined)
    client.deleteSysMounts.mockResolvedValue(undefined)
    client.upsertSysPoliciesAcl.mockResolvedValue(undefined)
    client.deleteSysPoliciesAcl.mockResolvedValue(undefined)
    client.upsertAuthApproleRole.mockResolvedValue(undefined)
    client.deleteAuthApproleRole.mockResolvedValue(undefined)
    client.upsertIdentityGroupName.mockResolvedValue(undefined)
    client.getIdentityGroupName.mockImplementation(async (groupName: string) => makeVaultSecret({ data: { id: 'gid', name: groupName } }))
    client.deleteIdentityGroupName.mockResolvedValue(undefined)
    client.getSysAuth.mockResolvedValue({ 'oidc/': { accessor: 'oidc-accessor', type: 'oidc' } })
    client.createIdentityGroupAlias.mockResolvedValue(undefined)
    client.listKvMetadata.mockResolvedValue([])
    client.delete.mockResolvedValue(undefined)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should reconcile on cron', async () => {
    const projects = faker.helpers.multiple(() => makeProjectWithDetails())
    const zones = faker.helpers.multiple(() => makeZoneWithDetails())

    datastore.getAllProjects.mockResolvedValue(projects)
    datastore.getAllZones.mockResolvedValue(zones)

    await service.handleCron()

    expect(datastore.getAllProjects).toHaveBeenCalled()
    expect(datastore.getAllZones).toHaveBeenCalled()
    expect(client.createSysMount).toHaveBeenCalledTimes(projects.length + zones.length)
    projects.forEach((project) => {
      expect(client.createSysMount).toHaveBeenCalledWith(project.slug, expect.any(Object))
    })
    zones.forEach((zone) => {
      expect(client.createSysMount).toHaveBeenCalledWith(`zone-${zone.slug}`, expect.any(Object))
    })
  })

  it('should upsert project on event', async () => {
    const project = makeProjectWithDetails()

    client.getIdentityGroupName.mockImplementation(async (groupName: string) => {
      const projectRoleMatch = groupName.match(projectRoleGroupNameRegex)
      if (projectRoleMatch) {
        const projectSlug = projectRoleMatch[1]
        const role = projectRoleMatch[2]
        return { data: { id: 'gid', name: groupName, alias: { name: `/${projectSlug}/console/${role}` } } }
      }

      if (groupName === 'console-admin') return { data: { id: 'gid', name: groupName, alias: { name: '/console/admin' } } }
      if (groupName === 'console-readonly') return { data: { id: 'gid', name: groupName, alias: { name: '/console/readonly' } } }
      if (groupName === 'console-security') return { data: { id: 'gid', name: groupName, alias: { name: '/console/security' } } }

      return { data: { id: 'gid', name: groupName } }
    })

    await service.handleUpsert(project)

    expect(client.createSysMount).toHaveBeenCalledWith(project.slug, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`app--${project.slug}--admin`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`tech--${project.slug}--ro`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--devops`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--developer`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--readonly`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--security`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('platform--admin', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('platform--readonly', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('platform--security', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('console-admin', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('console-readonly', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('console-security', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-admin`, expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-devops`, expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-developer`, expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-readonly`, expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-security`, expect.any(Object))
    expect(client.createIdentityGroupAlias).not.toHaveBeenCalled()
  })

  it('should delete project and destroy secrets on event', async () => {
    const project = makeProjectWithDetails()

    await service.handleDelete(project)

    expect(client.deleteSysMounts).toHaveBeenCalledWith(project.slug)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`app--${project.slug}--admin`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`tech--${project.slug}--ro`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--devops`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--developer`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--readonly`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--security`)
    expect(client.deleteAuthApproleRole).toHaveBeenCalledWith(project.slug)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-admin`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-devops`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-developer`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-readonly`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-security`)
  })
})
