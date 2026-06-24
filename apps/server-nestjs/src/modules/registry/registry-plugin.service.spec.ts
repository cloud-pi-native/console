import type { Cache } from 'cache-manager'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryPluginService } from './registry-plugin.service'
import { makeProjectWithDetails } from './registry-testing.utils'

describe('registryPluginService', () => {
  let service: RegistryPluginService
  let config: DeepMockProxy<ConfigurationService>
  let registryDatastore: DeepMockProxy<RegistryDatastoreService>
  let registryClient: DeepMockProxy<RegistryClientService>
  let cache: DeepMockProxy<Cache>

  beforeEach(async () => {
    config = mockDeep<ConfigurationService>({
      harborUrl: 'https://harbor.example/',
      harborProjectSlugCacheTtlMs: 300000,
    })
    registryDatastore = mockDeep<RegistryDatastoreService>()
    registryClient = mockDeep<RegistryClientService>()
    cache = mockDeep<Cache>()

    const moduleRef = await Test.createTestingModule({
      providers: [
        RegistryPluginService,
        { provide: ConfigurationService, useValue: config },
        { provide: RegistryDatastoreService, useValue: registryDatastore },
        { provide: RegistryClientService, useValue: registryClient },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile()

    service = moduleRef.get(RegistryPluginService)
  })

  it('uses the stored Harbor project id when available', async () => {
    cache.get.mockResolvedValue('dulei')
    registryClient.getProjectByName.mockResolvedValue({
      status: 200,
      data: { project_id: 144, metadata: {} },
    })
    const infos = await service.infos('dulei')
    const url = infos.to?.(makeToUrlParams({
      project: { id: '', name: '', slug: 'dulei' },
      store: { registry: { projectId: '144' } },
    }))

    expect(url).toBe('https://harbor.example/harbor/projects/144/')
    expect(registryDatastore.getProject).not.toHaveBeenCalled()
    expect(registryClient.getProjectByName).toHaveBeenCalledWith('dulei')
  })

  it('falls back to Harbor lookup when the store is empty', async () => {
    cache.get.mockResolvedValue(undefined)
    registryDatastore.getProject.mockResolvedValue(makeProjectWithDetails({ slug: 'dulei' }))
    registryClient.getProjectByName.mockResolvedValue({
      status: 200,
      data: { project_id: 144, metadata: {} },
    })

    const infos = await service.infos('dulei')
    const url = infos.to?.(makeToUrlParams())

    expect(registryClient.getProjectByName).toHaveBeenCalledWith('dulei')
    expect(url).toBe('https://harbor.example/harbor/projects/144/')
    expect(cache.set).toHaveBeenCalledWith('registry:project-slug:dulei', 'dulei', 300000)
  })
})
