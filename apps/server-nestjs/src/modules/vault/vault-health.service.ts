import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { vaultConfigFactory } from '../../config/vault.config'
import { PLUGIN_NAME } from './vault.constants'

@Injectable()
export class VaultHealthService {
  constructor(
    @Inject(vaultConfigFactory.KEY) private readonly vaultConfig: ConfigType<typeof vaultConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    try {
      const url = new URL('/v1/sys/health', this.vaultConfig.internalUrl ?? this.vaultConfig.url).toString()
      const response = await fetch(url)
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
