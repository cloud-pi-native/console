import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { SonarqubePluginService } from './sonarqube-plugin.service'

describe('sonarqubePluginService', () => {
  let service: SonarqubePluginService
  let config: DeepMockProxy<ConfigType<typeof sonarqubeConfigFactory>>

  beforeEach(async () => {
    config = mockDeep<ConfigType<typeof sonarqubeConfigFactory>>({
      url: 'https://sonar.public/',
      internalUrl: 'https://sonar.internal/',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        SonarqubePluginService,
        { provide: sonarqubeConfigFactory.KEY, useValue: config },
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
