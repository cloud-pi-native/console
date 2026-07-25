import type { DeepMockProxy } from 'vitest-mock-extended'
import type { SonarqubeConfig } from './sonarqube.module-definition'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { SonarqubePluginService } from './sonarqube-plugin.service'
import { SONARQUBE_CONFIG } from './sonarqube.module-definition'

describe('sonarqubePluginService', () => {
  let service: SonarqubePluginService
  let config: DeepMockProxy<SonarqubeConfig>

  beforeEach(async () => {
    config = mockDeep<SonarqubeConfig>({
      url: 'https://sonar.public/',
      internalUrl: 'https://sonar.internal/',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        SonarqubePluginService,
        { provide: SONARQUBE_CONFIG, useValue: config },
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
