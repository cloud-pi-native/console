import type { OnModuleInit } from '@nestjs/common'
import { Inject, Injectable, Optional } from '@nestjs/common'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { SonarqubeHealthService } from '../sonarqube/sonarqube-health.service'
import { VaultHealthService } from '../vault/vault-health.service'

const INTERVAL_MS = 5 * 60 * 1000

export interface ServiceHealth {
  name: string
  status: 'OK' | 'Dégradé' | 'En échec' | 'Inconnu'
  interval: number
  lastUpdateTimestamp: number
  message: string
  cause?: unknown
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
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
        return [{ name, status: 'En échec', interval: INTERVAL_MS, lastUpdateTimestamp: timestamp, message, cause: message }]
      }
      const value = result.value as Record<string, { status?: string, message?: string }>
      if (!value) return []
      const detail = value[Object.keys(value)[0]]
      if (!detail) return []
      const up = detail.status === 'up'
      return [{
        name,
        status: up ? 'OK' : 'En échec',
        interval: INTERVAL_MS,
        lastUpdateTimestamp: timestamp,
        message: up ? 'OK' : detail.message ?? 'Service en erreur',
        cause: up ? undefined : detail.message ?? 'Service en erreur',
      }]
    })
  }
}
