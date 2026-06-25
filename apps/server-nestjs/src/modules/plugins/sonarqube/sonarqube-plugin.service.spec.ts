import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../../infrastructure/configuration/configuration.service'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { SonarqubePluginService } from './sonarqube-plugin.service'

describe('sonarqubePluginService', () => {
  let service: SonarqubePluginService
  let config: DeepMockProxy<ConfigurationService>

  beforeEach(async () => {
    config = mockDeep<ConfigurationService>({
      sonarqubeUrl: 'https://sonar.public/',
      sonarqubeInternalUrl: 'https://sonar.internal/',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        SonarqubePluginService,
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(SonarqubePluginService)
  })

  it('returns the public SonarQube url', () => {
    const infos = service.infos()
    const url = infos.to?.(makeToUrlParams())

    expect(url).toBe('https://sonar.public/projects')
  })
})
