import type { ConfigType } from '@nestjs/config'
import { MonitorStatus } from '@cpn-console/shared'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'

const REQUEST_ERROR_MESSAGE = 'Erreur lors la requête'

/** Legacy plugin mapping (`plugins/sonarqube/src/monitor.ts`). */
const SONARQUBE_STATUS: Record<string, { status: MonitorStatus, message: string }> = {
  GREEN: { status: MonitorStatus.OK, message: MonitorStatus.OK },
  YELLOW: { status: MonitorStatus.WARNING, message: 'Service dégradé' },
  RED: { status: MonitorStatus.ERROR, message: 'Service en panne' },
}

export interface SonarqubeProbeOutcome {
  status: MonitorStatus
  message: string
  cause?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

@Injectable()
export class SonarqubeHealthService {
  constructor(
    @Inject(sonarqubeConfigFactory.KEY) private readonly sonarqubeConfig: ConfigType<typeof sonarqubeConfigFactory>,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  /**
   * Legacy monitor semantics: `/system/health` reports GREEN/YELLOW/RED, mapped to
   * OK/Dégradé/En échec. A 200 alone only proves the API answers, so the `health`
   * field decides — unlike `check()`, which is a binary terminus indicator.
   */
  async monitor(): Promise<SonarqubeProbeOutcome> {
    try {
      const response = await fetch(this.healthUrl(), { headers: this.authHeaders() })
      if (response.status !== HttpStatus.OK) return { status: MonitorStatus.UNKNOW, message: REQUEST_ERROR_MESSAGE }

      const data: unknown = await response.json()
      const health = isRecord(data) && typeof data.health === 'string' ? data.health : undefined
      const mapped = health ? SONARQUBE_STATUS[health] : undefined
      return mapped ?? { status: MonitorStatus.UNKNOW, message: REQUEST_ERROR_MESSAGE }
    } catch (error) {
      return { status: MonitorStatus.UNKNOW, message: REQUEST_ERROR_MESSAGE, cause: error }
    }
  }

  async check(key: string) {
    const indicator = this.healthIndicator.check(key)
    try {
      const response = await fetch(this.healthUrl(), { headers: this.authHeaders() })
      if (response.status < HttpStatus.INTERNAL_SERVER_ERROR) return indicator.up({ httpStatus: response.status })
      return indicator.down({ httpStatus: response.status })
    } catch (error) {
      return indicator.down(error instanceof Error ? error.message : String(error))
    }
  }

  private healthUrl(): string {
    return new URL('/api/system/health', this.sonarqubeConfig.internalUrl ?? this.sonarqubeConfig.url).toString()
  }

  private authHeaders(): Record<string, string> {
    const bearerToken = Buffer.from(`${this.sonarqubeConfig.apiToken}:`, 'utf-8').toString('base64')
    return { Authorization: `Bearer ${bearerToken}` }
  }
}
