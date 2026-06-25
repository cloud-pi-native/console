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
    const url = this.nexusConfig.probeUrl
    if (!url) return indicator.down('Not configured')

    const headers: Record<string, string> = {}
    if (this.nexusConfig.admin && this.nexusConfig.adminPassword) {
      const credentials = `${this.nexusConfig.admin}:${this.nexusConfig.adminPassword}`
      const encoded = Buffer.from(credentials).toString('base64')
      headers.Authorization = `Basic ${encoded}`
    }

    try {
      const response = await fetch(url, { headers })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }
}
