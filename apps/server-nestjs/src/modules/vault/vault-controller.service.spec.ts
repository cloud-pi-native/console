import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mocked } from 'vitest'
import { VaultControllerService } from './vault-controller.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultService } from './vault.service'

function createVaultControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      VaultControllerService,
      {
        provide: VaultDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
          getAllZones: vi.fn(),
        } satisfies Partial<VaultDatastoreService>,
      },
      {
        provide: VaultService,
        useValue: {
          enabled: true,
          upsertProject: vi.fn(),
          upsertZone: vi.fn(),
          deleteProject: vi.fn(),
          destroyProjectSecrets: vi.fn(),
        } satisfies Partial<VaultService>,
      },
    ],
  })
}

describe('vaultControllerService', () => {
  let service: VaultControllerService
  let datastore: Mocked<VaultDatastoreService>
  let vault: Mocked<VaultService>

  beforeEach(async () => {
    const module: TestingModule = await createVaultControllerServiceTestingModule().compile()
    service = module.get(VaultControllerService)
    datastore = module.get(VaultDatastoreService)
    vault = module.get(VaultService)
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
    expect(vault.upsertProject).toHaveBeenCalledTimes(2)
    expect(vault.upsertZone).toHaveBeenCalledTimes(1)
    expect(vault.upsertZone).toHaveBeenCalledWith('z1')
  })

  it('should upsert project on event', async () => {
    await service.handleUpsert({ slug: 'p1' } as any)
    expect(vault.upsertProject).toHaveBeenCalledWith({ slug: 'p1' })
  })

  it('should delete project and destroy secrets on event', async () => {
    await service.handleDelete({ slug: 'p1' } as any)
    expect(vault.deleteProject).toHaveBeenCalledWith('p1')
    expect(vault.destroyProjectSecrets).toHaveBeenCalledWith('p1')
  })
})
