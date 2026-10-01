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
import { INTERVAL_MS, PENDING_MESSAGE, REQUEST_ERROR_MESSAGE } from './service-monitor.constants'
import { fromHealthCheck } from './service-monitor.utils'
import type { ProbeOutcome } from './service-monitor.utils'

export type ServiceHealth = MonitorInfos & { name: string }

interface MonitoredService {
  name: string
  probe: () => Promise<ProbeOutcome>
  lastStatus: MonitorInfos
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

  // Legacy Monitor.refresh(): serve the last known state between periodic passes.
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
