import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../../infrastructure/configuration/configuration.service'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { NexusPluginService } from './nexus-plugin.service'

describe('nexusPluginService', () => {
  let service: NexusPluginService
  let config: DeepMockProxy<ConfigurationService>

  beforeEach(async () => {
    config = mockDeep<ConfigurationService>({
      nexusUrl: 'https://nexus.public/',
      nexusInternalUrl: 'https://nexus.internal/',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        NexusPluginService,
        { provide: ConfigurationService, useValue: config },
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
