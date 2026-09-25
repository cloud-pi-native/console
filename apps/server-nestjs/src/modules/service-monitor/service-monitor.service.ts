import type { MonitorInfos } from '@cpn-console/shared'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { MonitorStatus } from '@cpn-console/shared'
import { Inject, Injectable, Optional } from '@nestjs/common'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { SonarqubeHealthService } from '../sonarqube/sonarqube-health.service'
import { VaultHealthService } from '../vault/vault-health.service'

const INTERVAL_MS = 5 * 60 * 1000

const ERROR_MESSAGE = 'Service en erreur'

const REQUEST_ERROR_MESSAGE = 'Erreur lors la requête'

const PENDING_MESSAGE = 'En attente d\'une première vérification'

export type ServiceHealth = MonitorInfos & { name: string }

/** What a single probe reports; the monitored slot adds the interval and the timestamp. */
interface ProbeOutcome {
  status: MonitorStatus
  message: string
  cause?: unknown
}

interface MonitoredService {
  name: string
  probe: () => Promise<ProbeOutcome>
  lastStatus: MonitorInfos
}

interface ProbeDetail {
  status: string
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isProbeDetail(detail: unknown): detail is ProbeDetail {
  return isRecord(detail) && 'status' in detail && typeof detail.status === 'string'
}

/**
 * Terminus indicators only expose `up`/`down`; the legacy plugin monitors derived the
 * same binary verdict from a 200-range response.
 */
function fromHealthCheck(result: unknown): ProbeOutcome {
  const detail = isRecord(result) ? result[Object.keys(result)[0]] : undefined
  if (!isProbeDetail(detail)) {
    return { status: MonitorStatus.UNKNOW, message: ERROR_MESSAGE }
  }

  const up = detail.status === 'up'
  return {
    status: up ? MonitorStatus.OK : MonitorStatus.ERROR,
    message: up ? MonitorStatus.OK : detail.message ?? ERROR_MESSAGE,
    ...(up ? {} : { cause: detail.message ?? ERROR_MESSAGE }),
  }
}

@Injectable()
export class ServiceMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly interval: number = INTERVAL_MS
  private readonly services: MonitoredService[]
  private timer: NodeJS.Timeout | undefined

  constructor(
    @Inject(KeycloakHealthService) private readonly keycloak: KeycloakHealthService,
    @Inject(ArgoCDHealthService) @Optional() private readonly argocd?: ArgoCDHealthService,
    @Inject(GitlabHealthService) @Optional() private readonly gitlab?: GitlabHealthService,
    @Inject(RegistryHealthService) @Optional() private readonly harbor?: RegistryHealthService,
    @Inject(NexusHealthService) @Optional() private readonly nexus?: NexusHealthService,
    @Inject(SonarqubeHealthService) @Optional() private readonly sonarqube?: SonarqubeHealthService,
    @Inject(VaultHealthService) @Optional() private readonly vault?: VaultHealthService,
  ) {
    const {
      argocd: argocdHealth,
      gitlab: gitlabHealth,
      harbor: harborHealth,
      nexus: nexusHealth,
      sonarqube: sonarqubeHealth,
      vault: vaultHealth,
    } = this
    const probes: Array<[string, (() => Promise<ProbeOutcome>) | undefined]> = [
      ['ArgoCD', argocdHealth && (() => argocdHealth.check().then(fromHealthCheck))],
      ['Gitlab', gitlabHealth && (() => gitlabHealth.check().then(fromHealthCheck))],
      ['Harbor', harborHealth && (() => harborHealth.monitor())],
      ['Keycloak', () => this.keycloak.check().then(fromHealthCheck)],
      ['Nexus', nexusHealth && (() => nexusHealth.check().then(fromHealthCheck))],
      ['SonarQube', sonarqubeHealth && (() => sonarqubeHealth.monitor())],
      ['Vault', vaultHealth && (() => vaultHealth.check().then(fromHealthCheck))],
    ]

    this.services = probes.flatMap(([name, probe]) => probe ? [this.track(name, probe)] : [])
  }

  /** Public route: the legacy `ServiceHealthSchema` drops `cause` (admins only). */
  getServiceHealth(): ServiceHealth[] {
    return this.snapshot(false)
  }

  getCompleteServiceHealth(): ServiceHealth[] {
    return this.snapshot(true)
  }

  async refreshServiceHealth(): Promise<ServiceHealth[]> {
    await this.runAll()
    return this.snapshot(false)
  }

  onModuleInit(): void {
    void this.refresh()
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  /**
   * Legacy `Monitor.refresh()`: one immediate pass, then a periodic one — the last known
   * state is served between refreshes instead of re-probing on every request.
   */
  private async refresh(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => void this.runAll(), this.interval)
    await this.runAll()
  }

  private async runAll(): Promise<void> {
    await Promise.all(this.services.map(async (service) => {
      try {
        const outcome = await service.probe()
        service.lastStatus = { ...outcome, interval: this.interval, lastUpdateTimestamp: Date.now() }
      } catch (error) {
        service.lastStatus = {
          interval: this.interval,
          lastUpdateTimestamp: Date.now(),
          status: MonitorStatus.UNKNOW,
          message: REQUEST_ERROR_MESSAGE,
          cause: error,
        }
      }
    }))
  }

  private snapshot(withCause: boolean): ServiceHealth[] {
    return this.services.map(({ name, lastStatus }) => {
      const { cause, ...health } = lastStatus
      return { name, ...health, ...(withCause && cause !== undefined ? { cause } : {}) }
    })
  }

  private track(name: string, probe: () => Promise<ProbeOutcome>): MonitoredService {
    return {
      name,
      probe,
      lastStatus: {
        interval: this.interval,
        lastUpdateTimestamp: Date.now(),
        status: MonitorStatus.UNKNOW,
        message: PENDING_MESSAGE,
        cause: 'App just started',
      },
    }
  }
}