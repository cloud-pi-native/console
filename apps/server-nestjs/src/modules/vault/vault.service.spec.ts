import type { TestingModule } from '@nestjs/testing'
import type { Mocked } from 'vitest'
import type { ProjectWithDetails, ZoneWithDetails } from './vault-datastore.service'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultService } from './vault.service'

function createVaultControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      VaultService,
      {
        provide: VaultClientService,
        useValue: {
          createSysMount: vi.fn().mockResolvedValue(undefined),
          tuneSysMount: vi.fn().mockResolvedValue(undefined),
          deleteSysMounts: vi.fn().mockResolvedValue(undefined),
          upsertSysPoliciesAcl: vi.fn().mockResolvedValue(undefined),
          deleteSysPoliciesAcl: vi.fn().mockResolvedValue(undefined),
          upsertAuthApproleRole: vi.fn().mockResolvedValue(undefined),
          deleteAuthApproleRole: vi.fn().mockResolvedValue(undefined),
          upsertIdentityGroupName: vi.fn().mockResolvedValue(undefined),
          getIdentityGroupName: vi.fn().mockImplementation(async (groupName: string) => ({ data: { id: 'gid', name: groupName, alias: { name: `/${groupName}` } } })),
          deleteIdentityGroupName: vi.fn().mockResolvedValue(undefined),
          getSysAuth: vi.fn().mockResolvedValue({ 'oidc/': { accessor: 'oidc-accessor', type: 'oidc' } }),
          createIdentityGroupAlias: vi.fn().mockResolvedValue(undefined),
          listKvMetadata: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(undefined),
        } satisfies Partial<VaultClientService>,
      },
      {
        provide: VaultDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
          getAllZones: vi.fn(),
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
        environments: [],
      },
      {
        slug: 'project-2',
        name: 'Project 2',
        id: '660e8400-e29b-41d4-a716-446655440001',
        description: '',
        environments: [],
      },
    ] satisfies ProjectWithDetails[]
    const mockZones = [
      { slug: 'z1', id: 'z1' },
    ] satisfies ZoneWithDetails[]

    datastore.getAllProjects.mockResolvedValue(mockProjects)
    datastore.getAllZones.mockResolvedValue(mockZones as any)

    await service.handleCron()

    expect(datastore.getAllProjects).toHaveBeenCalled()
    expect(datastore.getAllZones).toHaveBeenCalled()
    expect(client.createSysMount).toHaveBeenCalledTimes(3)
    expect(client.createSysMount).toHaveBeenCalledWith('project-1', expect.any(Object))
    expect(client.createSysMount).toHaveBeenCalledWith('project-2', expect.any(Object))
    expect(client.createSysMount).toHaveBeenCalledWith('zone-z1', expect.any(Object))
  })

  it('should upsert project on event', async () => {
    await service.handleUpsert({ slug: 'project-1' } as any)
    expect(client.createSysMount).toHaveBeenCalledWith('project-1', expect.any(Object))
  })

  it('should delete project and destroy secrets on event', async () => {
    const mockProject = {
      slug: 'project-1',
      name: 'Project 1',
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: '',
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
