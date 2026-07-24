import type { VaultConfig } from '../../config/vault'
import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { vaultConfigFactory } from '../../config/vault'

@Injectable()
export class VaultHealthService {
  constructor(
    @Inject(vaultConfigFactory.KEY) private readonly config: VaultConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    const urlBase = this.config.vaultInternalUrl ?? this.config.vaultUrl
    if (!urlBase) return indicator.down('Not configured')

    const url = new URL('/v1/sys/health', urlBase).toString()
    try {
      const response = await fetch(url)
      if (response.status < 500) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
