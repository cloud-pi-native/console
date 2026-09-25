import type { HarborConfig } from '../../config/harbor.config'
import { MonitorStatus } from '@cpn-console/shared'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { harborConfigFactory } from '../../config/harbor.config'
import { PLUGIN_NAME } from './registry.constants'

const REQUEST_ERROR_MESSAGE = 'Erreur lors la requête'

const CORE_COMPONENTS = ['core', 'database', 'portal', 'registry', 'registryctl']

export interface RegistryProbeOutcome {
  status: MonitorStatus
  message: string
  cause?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

@Injectable()
export class RegistryHealthService {
  constructor(
    @Inject(harborConfigFactory.KEY) private readonly harborConfig: HarborConfig,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  /**
   * Legacy monitor semantics (`plugins/harbor/src/monitor.ts`): `/api/v2.0/ping` only
   * proves the API process answers, so the monitor reads `/api/v2.0/health` and tells a
   * degraded instance (non-core component unhealthy) from a failed one (core component
   * unhealthy) — unlike `check()`, which is a binary terminus indicator.
   */
  async monitor(): Promise<RegistryProbeOutcome> {
    try {
      const url = new URL('/api/v2.0/health', this.harborConfig.internalUrl ?? this.harborConfig.url).toString()
      const response = await fetch(url, { method: 'GET', headers: this.authHeaders() })
      if (response.status !== HttpStatus.OK) return { status: MonitorStatus.ERROR, message: 'Fatal Error' }

      const data: unknown = await response.json()
      if (isRecord(data) && data.status === 'healthy') return { status: MonitorStatus.OK, message: MonitorStatus.OK }

      const components = isRecord(data) && Array.isArray(data.components) ? data.components : []
      const failedCoreComponent = components.some(component =>
        isRecord(component)
        && component.status === 'unhealthy'
        && typeof component.name === 'string'
        && CORE_COMPONENTS.includes(component.name),
      )
      if (failedCoreComponent) return { status: MonitorStatus.ERROR, message: 'Service en erreur' }
      return { status: MonitorStatus.WARNING, message: 'Service dégradé' }
    } catch (error) {
      return { status: MonitorStatus.UNKNOW, message: REQUEST_ERROR_MESSAGE, cause: error }
    }
  }

  async check() {
    const indicator = this.healthIndicator.check(PLUGIN_NAME)
    try {
      const url = new URL('/api/v2.0/ping', this.harborConfig.internalUrl ?? this.harborConfig.url).toString()
      const response = await fetch(url, { method: 'GET', headers: this.authHeaders() })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }

  private authHeaders(): Record<string, string> {
    const credentials = `${this.harborConfig.admin}:${this.harborConfig.adminPassword}`
    return { Authorization: `Basic ${Buffer.from(credentials).toString('base64')}` }
  }
}
