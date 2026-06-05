import { Controller, Get, Inject } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { ArgoCDHealthService } from '../argocd/argocd-health.service'
import { GitlabHealthService } from '../gitlab/gitlab-health.service'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { DatabaseHealthService } from '../infrastructure/database/database-health.service'
import { KeycloakHealthService } from '../keycloak/keycloak-health.service'
import { NexusHealthService } from '../nexus/nexus-health.service'
import { OpenCdsHealthService } from '../opencds/opencds-health.service'
import { RegistryHealthService } from '../registry/registry-health.service'
import { VaultHealthService } from '../vault/vault-health.service'

@Controller('api/v1/healthz')
export class HealthzController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(DatabaseHealthService) private readonly database: DatabaseHealthService,
    @Inject(KeycloakHealthService) private readonly keycloak: KeycloakHealthService,
    @Inject(GitlabHealthService) private readonly gitlab: GitlabHealthService,
    @Inject(VaultHealthService) private readonly vault: VaultHealthService,
    @Inject(NexusHealthService) private readonly nexus: NexusHealthService,
    @Inject(RegistryHealthService) private readonly registry: RegistryHealthService,
    @Inject(ArgoCDHealthService) private readonly argocd: ArgoCDHealthService,
    @Inject(OpenCdsHealthService) private readonly opencds: OpenCdsHealthService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const checks = [
      () => this.database.check('database'),
      () => this.keycloak.check('keycloak'),
    ]

    if (this.config.openCdsUrl) {
      checks.push(() => this.opencds.check('opencds'))
    }
    if (this.config.gitlabUrl) {
      checks.push(() => this.gitlab.check('gitlab'))
    }
    if (this.config.vaultUrl) {
      checks.push(() => this.vault.check('vault'))
    }
    if (this.config.nexusUrl) {
      checks.push(() => this.nexus.check('nexus'))
    }
    if (this.config.harborUrl) {
      checks.push(() => this.registry.check('registry'))
    }
    if (this.config.argocdUrl) {
      checks.push(() => this.argocd.check('argocd'))
    }

    return this.health.check(checks)
  }
}
