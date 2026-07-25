import type { DeepMockProxy } from 'vitest-mock-extended'
import type { GitlabConfig } from './gitlab.module-definition'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { makeToUrlParams } from '../plugin/plugin.utils'
import { GitlabPluginService } from './gitlab-plugin.service'
import { GITLAB_CONFIG } from './gitlab.module-definition'

describe('gitlabPluginService', () => {
  let service: GitlabPluginService
  let config: DeepMockProxy<GitlabConfig>

  beforeEach(async () => {
    config = mockDeep<GitlabConfig>({
      url: 'https://gitlab.public',
      projectRootDir: 'forge',
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        GitlabPluginService,
        { provide: GITLAB_CONFIG, useValue: config },
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
