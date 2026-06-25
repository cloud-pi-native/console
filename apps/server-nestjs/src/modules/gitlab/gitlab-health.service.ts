import type { GitlabConfig } from '../../config/gitlab'
import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { gitlabConfigFactory } from '../../config/gitlab'

@Injectable()
export class GitlabHealthService {
  constructor(
    @Inject(gitlabConfigFactory.KEY) private readonly config: GitlabConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    const urlBase = this.config.internalOrPublicGitlabUrl
    if (!urlBase) return indicator.down('Not configured')

    const url = new URL('/-/health', urlBase).toString()
    try {
      const response = await fetch(url)
      if (response.status < 500) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
