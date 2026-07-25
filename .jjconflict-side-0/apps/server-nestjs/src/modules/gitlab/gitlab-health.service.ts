import type { GitlabConfig } from './gitlab.module-definition'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { GITLAB_CONFIG } from './gitlab.module-definition'

@Injectable()
export class GitlabHealthService {
  constructor(
    @Inject(GITLAB_CONFIG) private readonly gitlabConfig: GitlabConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    try {
      const response = await fetch(this.gitlabConfig.probeUrl)
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
