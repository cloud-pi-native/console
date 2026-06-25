import type { ConfigType } from '@nestjs/config'
import type { Cache } from 'cache-manager'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { harborConfigFactory } from '../../config/harbor.config'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryPluginService } from './registry-plugin.service'
import { makeProjectWithDetails } from './registry-testing.utils'

describe('registryPluginService', () => {
  let service: RegistryPluginService
  let harborConfig: DeepMockProxy<ConfigType<typeof harborConfigFactory>>
  let datastore: DeepMockProxy<RegistryDatastoreService>
  let registryClient: DeepMockProxy<RegistryClientService>
  let cache: DeepMockProxy<Cache>

  beforeEach(async () => {
    harborConfig = mockDeep<ConfigType<typeof harborConfigFactory>>({
      url: 'https://harbor.example/',
      projectSlugCacheTtlMs: 300000,
    })
    datastore = mockDeep<RegistryDatastoreService>()
    registryClient = mockDeep<RegistryClientService>()
    cache = mockDeep<Cache>()

    const moduleRef = await Test.createTestingModule({
      providers: [
        RegistryPluginService,
        { provide: harborConfigFactory.KEY, useValue: harborConfig },
        { provide: RegistryDatastoreService, useValue: datastore },
        { provide: RegistryClientService, useValue: registryClient },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile()

    service = moduleRef.get(RegistryPluginService)
  })

  it('uses the stored Harbor project id when available', async () => {
    cache.get.mockResolvedValue('dulei')
    registryClient.getProjectByName.mockResolvedValue({
      status: HttpStatus.OK,
      data: { project_id: 144, metadata: {} },
    })
    const infos = await service.infos('dulei')
    const url = infos.to?.(makeToUrlParams({
      project: { id: '', name: '', slug: 'dulei' },
      store: { registry: { projectId: '144' } },
    }))

    expect(url).toBe('https://harbor.example/harbor/projects/144/')
    expect(datastore.getProject).not.toHaveBeenCalled()
    expect(registryClient.getProjectByName).toHaveBeenCalledWith('dulei')
  })

  it('falls back to Harbor lookup when the store is empty', async () => {
    cache.get.mockResolvedValue(undefined)
    datastore.getProject.mockResolvedValue(makeProjectWithDetails({ slug: 'dulei' }))
    registryClient.getProjectByName.mockResolvedValue({
      status: HttpStatus.OK,
      data: { project_id: 144, metadata: {} },
    })

    const infos = await service.infos('dulei')
    const url = infos.to?.(makeToUrlParams())

    expect(registryClient.getProjectByName).toHaveBeenCalledWith('dulei')
    expect(url).toBe('https://harbor.example/harbor/projects/144/')
    expect(cache.set).toHaveBeenCalledWith('registry:project-slug:dulei', 'dulei', 300000)
  })
})
