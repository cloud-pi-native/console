import type { ConfigType } from '@nestjs/config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { nexusConfigFactory } from '../../config/nexus.config'

@Injectable()
export class NexusHealthService {
  constructor(
    @Inject(nexusConfigFactory.KEY) private readonly nexusConfig: ConfigType<typeof nexusConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    const headers: Record<string, string> = {}
    const credentials = `${this.nexusConfig.admin}:${this.nexusConfig.adminPassword}`
    const encoded = Buffer.from(credentials).toString('base64')
    headers.Authorization = `Basic ${encoded}`
    try {
      const response = await fetch(this.nexusConfig.probeUrl, { headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
