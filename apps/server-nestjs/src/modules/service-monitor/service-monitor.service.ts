import type { MonitorInfos } from '@cpn-console/shared'
import type { OnModuleInit } from '@nestjs/common'
import type { Cache } from 'cache-manager'
import type { ProbeOutcome } from './service-monitor.utils'
import { MonitorStatus } from '@cpn-console/shared'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Optional } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { SonarqubeHealthService } from '../sonarqube/sonarqube-health.service'
import { VaultHealthService } from '../vault/vault-health.service'
import { INTERVAL_MS, PENDING_MESSAGE, REQUEST_ERROR_MESSAGE } from './service-monitor.constants'
import { fromHealthCheck, toCause } from './service-monitor.utils'

export type ServiceHealth = MonitorInfos & { name: string }

interface MonitoredService {
  name: string
  probe: () => Promise<ProbeOutcome>
}

const CACHE_KEY = 'service-monitor:statuses'

@Injectable()
export class ServiceMonitorService implements OnModuleInit {
  private readonly interval: number = INTERVAL_MS
  private readonly services: MonitoredService[]

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
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
      ['ArgoCD', argocdHealth && (() => argocdHealth.check().then(result => fromHealthCheck(result, 'argocd')))],
      ['Gitlab', gitlabHealth && (() => gitlabHealth.check().then(result => fromHealthCheck(result, 'gitlab')))],
      ['Harbor', harborHealth && (() => harborHealth.check().then(result => fromHealthCheck(result, 'harbor')))],
      ['Keycloak', () => this.keycloak.check().then(result => fromHealthCheck(result, 'keycloak'))],
      ['Nexus', nexusHealth && (() => nexusHealth.check().then(result => fromHealthCheck(result, 'nexus')))],
      ['SonarQube', sonarqubeHealth && (() => sonarqubeHealth.check().then(result => fromHealthCheck(result, 'sonarqube')))],
      ['Vault', vaultHealth && (() => vaultHealth.check().then(result => fromHealthCheck(result, 'vault')))],
    ]

    this.services = probes.flatMap(([name, probe]) => probe ? [{ name, probe }] : [])
  }

  async getServiceHealth(): Promise<ServiceHealth[]> {
    const statuses = await Promise.all(this.services.map(async ({ name }) => {
      const cached = await this.cache.get<MonitorInfos>(`${CACHE_KEY}:${name}`)
      return { name, ...(cached ?? this.pendingStatus()) }
    }))
    return statuses.map(({ cause, ...health }) => ({ ...health, ...(cause !== undefined ? { cause: toCause(cause) } : {}) }))
  }

  async refreshServiceHealth(): Promise<ServiceHealth[]> {
    await this.runAll()
    return this.getServiceHealth()
  }

  onModuleInit(): void {
    void this.runAll()
  }

  // Legacy Monitor.refresh(): the cron refreshes the cached statuses periodically.
  @Cron(CronExpression.EVERY_5_MINUTES)
  private async runAll(): Promise<void> {
    await Promise.all(this.services.map(async (service) => {
      try {
        const outcome = await service.probe()
        await this.writeStatus(service.name, { ...outcome, interval: this.interval, lastUpdateTimestamp: Date.now() })
      } catch (error) {
        await this.writeStatus(service.name, {
          interval: this.interval,
          lastUpdateTimestamp: Date.now(),
          status: MonitorStatus.UNKNOW,
          message: REQUEST_ERROR_MESSAGE,
          cause: error,
        })
      }
    }))
  }

  private async writeStatus(name: string, status: MonitorInfos): Promise<void> {
    await this.cache.set(`${CACHE_KEY}:${name}`, status)
  }

  private pendingStatus(): MonitorInfos {
    return {
      interval: this.interval,
      lastUpdateTimestamp: Date.now(),
      status: MonitorStatus.UNKNOW,
      message: PENDING_MESSAGE,
      cause: 'App just started',
    }
  }
}
