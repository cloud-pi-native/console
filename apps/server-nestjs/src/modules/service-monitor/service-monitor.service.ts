import type { MonitorInfos } from '@cpn-console/shared'
import type { OnModuleInit } from '@nestjs/common'
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

export type ServiceHealth = MonitorInfos & { name: string }

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

@Injectable()
export class ServiceMonitorService implements OnModuleInit {
  constructor(
    @Inject(KeycloakHealthService) private readonly keycloak: KeycloakHealthService,
    @Inject(ArgoCDHealthService) @Optional() private readonly argocd?: ArgoCDHealthService,
    @Inject(GitlabHealthService) @Optional() private readonly gitlab?: GitlabHealthService,
    @Inject(RegistryHealthService) @Optional() private readonly harbor?: RegistryHealthService,
    @Inject(NexusHealthService) @Optional() private readonly nexus?: NexusHealthService,
    @Inject(SonarqubeHealthService) @Optional() private readonly sonarqube?: SonarqubeHealthService,
    @Inject(VaultHealthService) @Optional() private readonly vault?: VaultHealthService,
  ) {}

  getServiceHealth(): Promise<ServiceHealth[]> {
    return this.collect()
  }

  getCompleteServiceHealth(): Promise<ServiceHealth[]> {
    return this.collect()
  }

  refreshServiceHealth(): Promise<ServiceHealth[]> {
    return this.collect()
  }

  onModuleInit(): void {
    void this.collect()
  }

  private async collect(): Promise<ServiceHealth[]> {
    const { argocd, gitlab, harbor, nexus, sonarqube, vault } = this
    const probes: Array<[string, string, (() => Promise<unknown>) | undefined]> = [
      ['argocd', 'ArgoCD', argocd && (() => argocd.check())],
      ['gitlab', 'Gitlab', gitlab && (() => gitlab.check())],
      ['harbor', 'Harbor', harbor && (() => harbor.check())],
      ['keycloak', 'Keycloak', () => this.keycloak.check()],
      ['nexus', 'Nexus', nexus && (() => nexus.check())],
      ['sonarqube', 'SonarQube', sonarqube && (() => sonarqube.check('sonarqube'))],
      ['vault', 'Vault', vault && (() => vault.check())],
    ]

    const settled = await Promise.allSettled(probes.map(([, , probe]) => probe?.()))
    return settled.flatMap((result, i): ServiceHealth[] => {
      const [, name] = probes[i]
      const timestamp = Date.now()
      if (result.status === 'rejected') {
        const cause = result.reason instanceof Error ? result.reason.message : String(result.reason)
        return [{
          name,
          status: MonitorStatus.ERROR,
          interval: INTERVAL_MS,
          lastUpdateTimestamp: timestamp,
          message: cause,
          cause,
        }]
      }
      const value = result.value
      if (!isRecord(value)) return []
      const detail = value[Object.keys(value)[0]]
      if (!isProbeDetail(detail)) {
        return [{
          name,
          status: MonitorStatus.UNKNOW,
          interval: INTERVAL_MS,
          lastUpdateTimestamp: timestamp,
          message: ERROR_MESSAGE,
        }]
      }
      const up = detail.status === 'up'
      return [{
        name,
        status: up ? MonitorStatus.OK : MonitorStatus.ERROR,
        interval: INTERVAL_MS,
        lastUpdateTimestamp: timestamp,
        message: up ? MonitorStatus.OK : detail.message ?? ERROR_MESSAGE,
        cause: up ? undefined : detail.message ?? ERROR_MESSAGE,
      }]
    })
  }
}
