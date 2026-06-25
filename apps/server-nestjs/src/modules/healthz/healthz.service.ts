import type { HealthIndicatorFunction } from '@nestjs/terminus'
import { Inject, Injectable, Optional } from '@nestjs/common'
import { HealthCheckService } from '@nestjs/terminus'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { DatabaseHealthService } from '../infrastructure/database/database-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { ServiceChainHealthService } from '../service-chain/service-chain-health.service'
import { VaultHealthService } from '../vault/vault-health.service'

@Injectable()
export class HealthzService {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(DatabaseHealthService) private readonly database: DatabaseHealthService,
    @Inject(KeycloakHealthService) private readonly keycloak: KeycloakHealthService,
    @Inject(GitlabHealthService) @Optional() private readonly gitlab?: GitlabHealthService,
    @Inject(VaultHealthService) @Optional() private readonly vault?: VaultHealthService,
    @Inject(NexusHealthService) @Optional() private readonly nexus?: NexusHealthService,
    @Inject(RegistryHealthService) @Optional() private readonly registry?: RegistryHealthService,
    @Inject(ArgoCDHealthService) @Optional() private readonly argocd?: ArgoCDHealthService,
    @Inject(ServiceChainHealthService) @Optional() private readonly serviceChainHealth?: ServiceChainHealthService,
  ) {}

  check() {
    const checks: HealthIndicatorFunction[] = [
      this.database.check.bind(this.database),
      this.keycloak.check.bind(this.keycloak),
    ]

    if (this.gitlab) checks.push(this.gitlab.check.bind(this.gitlab))
    if (this.vault) checks.push(this.vault.check.bind(this.vault))
    if (this.nexus) checks.push(this.nexus.check.bind(this.nexus))
    if (this.registry) checks.push(this.registry.check.bind(this.registry))
    if (this.argocd) checks.push(this.argocd.check.bind(this.argocd))
    if (this.serviceChainHealth) checks.push(this.serviceChainHealth.check.bind(this.serviceChainHealth))

    return this.health.check(checks)
  }
}
