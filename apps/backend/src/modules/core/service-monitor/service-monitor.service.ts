import type { MonitorInfos } from '@cpn-console/shared'
import type { OnModuleInit } from '@nestjs/common'
import type { Cache } from 'cache-manager'
import type { ProbeOutcome } from './service-monitor.utils'
import { MonitorStatus } from '@cpn-console/shared'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, Optional } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ArgoCDHealthService } from '../../integrations/argocd/argocd-health.service'
import { GitlabHealthService } from '../../integrations/gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../../integrations/keycloak/keycloak-health.service'
import { NexusHealthService } from '../../integrations/nexus/nexus-health.service'
import { RegistryHealthService } from '../../integrations/registry/registry-health.service'
import { SonarqubeHealthService } from '../../integrations/sonarqube/sonarqube-health.service'
import { VaultHealthService } from '../../integrations/vault/vault-health.service'
import { CACHE_KEY, INTERVAL_MS, REQUEST_ERROR_MESSAGE } from './service-monitor.constants'
import { fromHealthCheck, pendingStatus } from './service-monitor.utils'

export type ServiceHealth = MonitorInfos & { name: string }

@Injectable()
export class ServiceMonitorService implements OnModuleInit {
  private readonly interval: number = INTERVAL_MS
  private readonly services: Map<string, () => Promise<ProbeOutcome>>

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

    this.services = new Map(probes.filter((p): p is [string, () => Promise<ProbeOutcome>] => p[1] !== undefined))
  }

  async getServiceHealth(): Promise<ServiceHealth[]> {
    return Promise.all([...this.services.keys()].map(async (name) => {
      const cached = await this.readStatus(name)
      return { name, ...cached }
    }))
  }

  async refreshServiceHealth(): Promise<ServiceHealth[]> {
    await this.refreshStatuses()
    return this.getServiceHealth()
  }

  onModuleInit(): void {
    void this.refreshStatuses()
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async refreshStatuses(): Promise<void> {
    await Promise.all([...this.services].map(async ([name, probe]) => {
      try {
        const outcome = await probe()
        await this.writeStatus(name, { ...outcome, interval: this.interval, lastUpdateTimestamp: Date.now() })
      } catch (error) {
        await this.writeStatus(name, {
          interval: this.interval,
          lastUpdateTimestamp: Date.now(),
          status: MonitorStatus.UNKNOW,
          message: REQUEST_ERROR_MESSAGE,
          cause: error,
        })
      }
    }))
  }

  private async readStatus(name: string): Promise<MonitorInfos> {
    return await this.cache.get<MonitorInfos>(`${CACHE_KEY}:${name}`) ?? pendingStatus(this.interval)
  }

  private async writeStatus(name: string, status: MonitorInfos): Promise<void> {
    await this.cache.set(`${CACHE_KEY}:${name}`, status)
  }
}
