import type { VaultConfig } from './vault.module-definition'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { VAULT_CONFIG } from './vault.module-definition'

@Injectable()
export class VaultHealthService {
  constructor(
    @Inject(VAULT_CONFIG) private readonly vaultConfig: VaultConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    const url = this.vaultConfig.probeUrl
    if (!url) return indicator.down('Not configured')

    try {
      const response = await fetch(url)
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
