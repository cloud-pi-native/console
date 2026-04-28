import type { TestingModule } from '@nestjs/testing'
import type { Mocked } from 'vitest'
import type { ProjectWithDetails, ZoneWithDetails } from './vault-datastore.service'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
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
    client.getIdentityGroupName.mockImplementation(async (groupName: string) => ({ data: { id: 'gid', name: groupName } } as any))
    client.deleteIdentityGroupName.mockResolvedValue(undefined)
    client.getSysAuth.mockResolvedValue({ 'oidc/': { accessor: 'oidc-accessor', type: 'oidc' } } as any)
    client.createIdentityGroupAlias.mockResolvedValue(undefined)
    client.listKvMetadata.mockResolvedValue([])
    client.delete.mockResolvedValue(undefined)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should reconcile on cron', async () => {
    const mockProjects = [
      {
        slug: 'project-1',
        name: 'Project 1',
        id: '550e8400-e29b-41d4-a716-446655440000',
        description: '',
        plugins: [],
        environments: [],
      },
      {
        slug: 'project-2',
        name: 'Project 2',
        id: '660e8400-e29b-41d4-a716-446655440001',
        description: '',
        plugins: [],
        environments: [],
      },
    ] satisfies ProjectWithDetails[]
    const mockZones = [
      { slug: 'z1', id: 'z1' },
    ] satisfies ZoneWithDetails[]

    datastore.getAllProjects.mockResolvedValue(mockProjects)
    datastore.getAllZones.mockResolvedValue(mockZones)

    await service.handleCron()

    expect(datastore.getAllProjects).toHaveBeenCalled()
    expect(datastore.getAllZones).toHaveBeenCalled()
    expect(client.createSysMount).toHaveBeenCalledTimes(3)
    expect(client.createSysMount).toHaveBeenCalledWith('project-1', expect.any(Object))
    expect(client.createSysMount).toHaveBeenCalledWith('project-2', expect.any(Object))
    expect(client.createSysMount).toHaveBeenCalledWith('zone-z1', expect.any(Object))
  })

  it('should upsert project on event', async () => {
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

    await service.handleUpsert({ slug: 'project-1' } as any)
    expect(client.createSysMount).toHaveBeenCalledWith('project-1', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('app--project-1--admin', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('tech--project-1--ro', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('project--project-1--devops', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('project--project-1--developer', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('project--project-1--readonly', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('project--project-1--security', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('platform--admin', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('platform--readonly', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('platform--security', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('console-admin', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('console-readonly', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('console-security', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('project-project-1-admin', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('project-project-1-devops', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('project-project-1-developer', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('project-project-1-readonly', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('project-project-1-security', expect.any(Object))
    expect(client.createIdentityGroupAlias).not.toHaveBeenCalled()
  })

  it('should delete project and destroy secrets on event', async () => {
    const mockProject = {
      slug: 'project-1',
      name: 'Project 1',
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: '',
      plugins: [],
      environments: [],
    } satisfies ProjectWithDetails

    await service.handleDelete(mockProject)

    expect(client.deleteSysMounts).toHaveBeenCalledWith('project-1')
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('app--project-1--admin')
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('tech--project-1--ro')
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('project--project-1--devops')
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('project--project-1--developer')
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('project--project-1--readonly')
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('project--project-1--security')
    expect(client.deleteAuthApproleRole).toHaveBeenCalledWith('project-1')
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith('project-project-1-admin')
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith('project-project-1-devops')
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith('project-project-1-developer')
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith('project-project-1-readonly')
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith('project-project-1-security')
  })
})
