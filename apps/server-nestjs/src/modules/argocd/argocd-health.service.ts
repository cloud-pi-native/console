import type { ArgocdConfig } from './argocd.module-definition'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ARGOCD_CONFIG } from './argocd.module-definition'

@Injectable()
export class ArgoCDHealthService {
  constructor(
    @Inject(ARGOCD_CONFIG) private readonly argocdConfig: ArgocdConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    const urlBase = this.argocdConfig.internalOrPublicUrl
    if (!urlBase) return indicator.down('Not configured')

    try {
      const response = await fetch(new URL('/api/version', urlBase).toString())
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
