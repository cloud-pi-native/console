import type { HealthIndicatorFunction } from '@nestjs/terminus'
import { Inject, Injectable } from '@nestjs/common'
import { HealthCheckService } from '@nestjs/terminus'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { DatabaseHealthService } from '../infrastructure/database/database-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { ServiceChainHealthService } from '../service-chain/service-chain-health.service'
import { VaultHealthService } from '../vault/vault-health.service'

@Injectable()
export class HealthzService {
  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(DatabaseHealthService) private readonly database: DatabaseHealthService,
    @Inject(KeycloakHealthService) private readonly keycloak: KeycloakHealthService,
    @Inject(GitlabHealthService) private readonly gitlab: GitlabHealthService,
    @Inject(VaultHealthService) private readonly vault: VaultHealthService,
    @Inject(NexusHealthService) private readonly nexus: NexusHealthService,
    @Inject(RegistryHealthService) private readonly registry: RegistryHealthService,
    @Inject(ArgoCDHealthService) private readonly argocd: ArgoCDHealthService,
    @Inject(ServiceChainHealthService) private readonly serviceChainHealth: ServiceChainHealthService,
  ) {}

  check() {
    const checks: HealthIndicatorFunction[] = [
      () => this.database.check(),
      () => this.keycloak.check(),
    ]

    if (this.config.gitlabUrl) checks.push(() => this.gitlab.check())
    if (this.config.vaultUrl) checks.push(() => this.vault.check())
    if (this.config.nexusUrl) checks.push(() => this.nexus.check())
    if (this.config.harborUrl) checks.push(() => this.registry.check())
    if (this.config.argocdUrl) checks.push(() => this.argocd.check())
    if (this.config.openCdsUrl) checks.push(() => this.serviceChainHealth.check())

    return this.health.check(checks)
  }
}
