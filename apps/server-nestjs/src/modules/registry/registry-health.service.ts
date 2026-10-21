import type { HarborConfig } from '../../config/harbor.config'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { z } from 'zod'
import { harborConfigFactory } from '../../config/harbor.config'
import { PLUGIN_NAME } from './registry.constants'

// /api/v2.0/health splits degraded from failed, unlike /api/v2.0/ping.
const CORE_COMPONENTS = new Set(['core', 'database', 'portal', 'registry', 'registryctl'])

const harborHealthBodySchema = z.object({
  status: z.string(),
  components: z.array(z.object({
    name: z.string(),
    status: z.string(),
  })).optional(),
})

@Injectable()
export class RegistryHealthService {
  constructor(
    @Inject(harborConfigFactory.KEY) private readonly harborConfig: HarborConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    try {
      const url = new URL('/api/v2.0/health', this.harborConfig.internalUrl ?? this.harborConfig.url).toString()
      const response = await fetch(url, { method: 'GET', headers: this.authHeaders() })
      if (response.status !== HttpStatus.OK) return indicator.down({ message: 'Fatal Error' })

      const parsed = harborHealthBodySchema.safeParse(await response.json())
      if (!parsed.success) return indicator.down({ message: 'Erreur lors la requête' })
      if (parsed.data.status === 'healthy') return indicator.up()

      const failedCoreComponent = parsed.data.components?.some(component =>
        component.status === 'unhealthy'
        && CORE_COMPONENTS.has(component.name),
      )
      return failedCoreComponent
        ? indicator.down({ message: 'Service en erreur' })
        : indicator.up({ message: 'Service dégradé' })
    } catch (error) {
      return indicator.down({ message: 'Erreur lors la requête', cause: error })
    }
  }

  private authHeaders(): Record<string, string> {
    const credentials = `${this.harborConfig.admin}:${this.harborConfig.adminPassword}`
    return { Authorization: `Basic ${Buffer.from(credentials).toString('base64')}` }
  }
}
