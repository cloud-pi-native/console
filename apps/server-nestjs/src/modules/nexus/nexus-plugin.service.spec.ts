import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { nexusConfigFactory } from '../../config/nexus'
import type { NexusConfig } from '../../config/nexus'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { NexusPluginService } from './nexus-plugin.service'

describe('nexusPluginService', () => {
  let service: NexusPluginService
  let config: DeepMockProxy<NexusConfig>

  beforeEach(async () => {
    config = mockDeep<NexusConfig>({
      nexusUrl: 'https://nexus.public/',
      nexusInternalUrl: 'https://nexus.internal/',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        NexusPluginService,
        { provide: nexusConfigFactory.KEY, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(NexusPluginService)
  })

  it('returns the public Nexus url', () => {
    const infos = service.infos()
    const url = infos.to?.(makeToUrlParams())

    expect(url).toBe('https://nexus.public/')
  })
})
