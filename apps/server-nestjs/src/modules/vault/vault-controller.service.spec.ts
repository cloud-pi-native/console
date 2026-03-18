import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mocked } from 'vitest'
import { VaultControllerService } from './vault-controller.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'

function createVaultControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      VaultControllerService,
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
          getIdentityGroupName: vi.fn().mockResolvedValue({ data: { id: 'gid', name: 'p1', alias: { name: '/p1' } } }),
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
          projectRootPath: 'forge',
          vaultKvName: 'kv',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('vaultControllerService', () => {
  let service: VaultControllerService
  let datastore: Mocked<VaultDatastoreService>
  let client: Mocked<VaultClientService>

  beforeEach(async () => {
    const module: TestingModule = await createVaultControllerServiceTestingModule().compile()
    service = module.get(VaultControllerService)
    datastore = module.get(VaultDatastoreService)
    client = module.get(VaultClientService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
  it('should reconcile on cron', async () => {
    datastore.getAllProjects.mockResolvedValue([{ slug: 'p1' }, { slug: 'p2' }] as any)
    datastore.getAllZones.mockResolvedValue([{ slug: 'z1' }] as any)

    await service.handleCron()

    expect(datastore.getAllProjects).toHaveBeenCalled()
    expect(datastore.getAllZones).toHaveBeenCalled()
    expect(client.createSysMount).toHaveBeenCalledTimes(3)
    expect(client.createSysMount).toHaveBeenCalledWith('p1', expect.any(Object))
    expect(client.createSysMount).toHaveBeenCalledWith('p2', expect.any(Object))
    expect(client.createSysMount).toHaveBeenCalledWith('zone-z1', expect.any(Object))
  })

  it('should upsert project on event', async () => {
    await service.handleUpsert({ slug: 'p1' } as any)
    expect(client.createSysMount).toHaveBeenCalledWith('p1', expect.any(Object))
  })

  it('should delete project and destroy secrets on event', async () => {
    client.listKvMetadata.mockResolvedValue([])
    await service.handleDelete({ slug: 'p1' } as any)
    expect(client.deleteSysMounts).toHaveBeenCalledWith('p1')
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('app--p1--admin')
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('tech--p1--ro')
    expect(client.deleteAuthApproleRole).toHaveBeenCalledWith('p1')
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith('p1')
  })
})
