import type { HealthIndicatorFunction } from '@nestjs/terminus'
import { Inject, Injectable, Optional } from '@nestjs/common'
import { HealthCheckService } from '@nestjs/terminus'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { DatabaseHealthService } from '../infrastructure/database/database-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { OpenCdsHealthService } from '../opencds/opencds-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { VaultHealthService } from '../vault/vault-health.service'

@Injectable()
export class HealthzService {
  // Optional modules (gated by USE_*) resolve to undefined when not registered.
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(DatabaseHealthService) @Optional() private readonly database?: DatabaseHealthService,
    @Inject(KeycloakHealthService) @Optional() private readonly keycloak?: KeycloakHealthService,
    @Inject(GitlabHealthService) @Optional() private readonly gitlab?: GitlabHealthService,
    @Inject(VaultHealthService) @Optional() private readonly vault?: VaultHealthService,
    @Inject(NexusHealthService) @Optional() private readonly nexus?: NexusHealthService,
    @Inject(RegistryHealthService) @Optional() private readonly registry?: RegistryHealthService,
    @Inject(ArgoCDHealthService) @Optional() private readonly argocd?: ArgoCDHealthService,
    @Inject(OpenCdsHealthService) @Optional() private readonly opencds?: OpenCdsHealthService,
  ) {}

  check() {
    const checks: HealthIndicatorFunction[] = []
    // Each health service's own check() reports 'Not configured' when its URL is absent.
    if (this.database) checks.push(() => this.database!.check('database'))
    if (this.keycloak) checks.push(() => this.keycloak!.check('keycloak'))
    if (this.gitlab) checks.push(() => this.gitlab!.check('gitlab'))
    if (this.vault) checks.push(() => this.vault!.check('vault'))
    if (this.nexus) checks.push(() => this.nexus!.check('nexus'))
    if (this.registry) checks.push(() => this.registry!.check('registry'))
    if (this.argocd) checks.push(() => this.argocd!.check('argocd'))
    if (this.opencds) checks.push(() => this.opencds!.check('opencds'))
    return this.health.check(checks)
  }
}
