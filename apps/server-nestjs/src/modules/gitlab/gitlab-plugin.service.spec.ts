import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { GitlabPluginService } from './gitlab-plugin.service'

describe('gitlabPluginService', () => {
  let service: GitlabPluginService
  let config: DeepMockProxy<ConfigType<typeof gitlabConfigFactory>>

  beforeEach(async () => {
    config = mockDeep<ConfigType<typeof gitlabConfigFactory>>({
      url: 'https://gitlab.public',
      projectRootDir: 'forge',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        GitlabPluginService,
        { provide: gitlabConfigFactory.KEY, useValue: config },
      ],
    }).compile()

    service = moduleRef.get(GitlabPluginService)
  })

  it('should expose the legacy project url', () => {
    const infos = service.infos()
    const url = infos.to?.(makeToUrlParams({ project: { id: '', name: '', slug: 'dulei' } }))

    expect(url).toBe('https://gitlab.public/forge/dulei')
  })
})
