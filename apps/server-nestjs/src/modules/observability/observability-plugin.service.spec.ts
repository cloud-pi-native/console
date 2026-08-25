import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { observabilityConfigFactory } from '../../config/observability.config'
import { ObservabilityDatastoreService } from './observability-datastore.service'
import { makeProject } from './observability-testing.utils'
import { ObservabilityPluginService } from './observability-plugin.service'

describe('observabilityPluginService', () => {
  let service: ObservabilityPluginService
  let datastore: DeepMockProxy<ObservabilityDatastoreService>
  let config: DeepMockProxy<ConfigType<typeof observabilityConfigFactory>>

  beforeEach(async () => {
    datastore = mockDeep<ObservabilityDatastoreService>()
    config = mockDeep<ConfigType<typeof observabilityConfigFactory>>({
      grafanaUrl: 'https://grafana.test',
      chartVersion: '0.1.7',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ObservabilityPluginService,
        { provide: ObservabilityDatastoreService, useValue: datastore },
        { provide: observabilityConfigFactory.KEY, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(ObservabilityPluginService)
  })

  it('throws when the project does not exist', async () => {
    datastore.getProjectForInfos.mockResolvedValue(null)

    await expect(service.infos('missing-id')).rejects.toThrow('Project not found')
  })

  it('advertises no dashboard urls when the project has no environments', async () => {
    datastore.getProjectForInfos.mockResolvedValue(makeProject({ environments: [] }))

    const infos = await service.infos('project-id')
    const urls = infos.to()
    expect(urls).toEqual([])
  })

  it('exposes an hprod url only for non-prod stages', async () => {
    datastore.getProjectForInfos.mockResolvedValue(makeProject({
      slug: 'myproj',
      // stage names other than PROD count as hprod
      environments: [{ stage: { name: 'dev' } }] as never,
    }))

    const infos = await service.infos('project-id')
    expect(infos.to()).toHaveLength(1)
    expect(infos.to()[0]).toMatchObject({
      to: 'https://grafana.test/hprod-myproj',
      description: 'Hors production',
    })
  })

  it('exposes a prod url only when a prod-stage environment exists', async () => {
    datastore.getProjectForInfos.mockResolvedValue(makeProject({
      slug: 'myproj',
      environments: [{ stage: { name: 'prod' } }] as never,
    }))

    const infos = await service.infos('project-id')
    expect(infos.to()).toHaveLength(1)
    expect(infos.to()[0]).toMatchObject({ to: 'https://grafana.test/prod-myproj' })
  })

  it('exposes both urls when both environment kinds exist', async () => {
    datastore.getProjectForInfos.mockResolvedValue(makeProject({
      slug: 'full',
      environments: [{ stage: { name: 'prod' } }, { stage: { name: 'hprod' } }] as never,
    }))

    const infos = await service.infos('project-id')
    expect(infos.to().map(u => u.description)).toEqual(['Hors production', 'Production'])
  })

  it('keeps the static plugin descriptor contract (title, image, switch config)', async () => {
    datastore.getProjectForInfos.mockResolvedValue(makeProject())

    const infos = await service.infos('project-id')
    expect(infos.title).toBe('Grafana')
    expect(infos.imgSrc).toBe('/img/grafana.png')
    expect(infos.name).toBe('observability')
    // global switch defaults to enabled, admin-writable
    expect(infos.config.global[0]).toMatchObject({
      key: 'enabled',
      initialValue: 'enabled',
      permissions: { admin: { read: true, write: true }, user: { read: true, write: false } },
    })
    // project instances text is read-only for everyone
    expect(infos.config.project[0]?.permissions).toEqual({
      admin: { read: false, write: false },
      user: { read: false, write: false },
    })
  })
})
