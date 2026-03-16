import { Controller, Get, Inject } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { DatabaseHealthService } from '@/cpin-module/infrastructure/database/database-health.service'
import { ArgoCDHealthService } from '../../../modules/argocd/argocd-health.service'
import { GitlabHealthService } from '../../../modules/gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../../../modules/keycloak/keycloak-health.service'
import { NexusHealthService } from '../../../modules/nexus/nexus-health.service'
import { RegistryHealthService } from '../../../modules/registry/registry-health.service'
import { VaultHealthService } from '../../../modules/vault/vault-health.service'

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(DatabaseHealthService) private readonly database: DatabaseHealthService,
    @Inject(KeycloakHealthService) private readonly keycloak: KeycloakHealthService,
    @Inject(GitlabHealthService) private readonly gitlab: GitlabHealthService,
    @Inject(VaultHealthService) private readonly vault: VaultHealthService,
    @Inject(NexusHealthService) private readonly nexus: NexusHealthService,
    @Inject(RegistryHealthService) private readonly registry: RegistryHealthService,
    @Inject(ArgoCDHealthService) private readonly argocd: ArgoCDHealthService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.database.isHealthy('database'),
      () => this.keycloak.isHealthy('keycloak'),
      () => this.gitlab.isHealthy('gitlab'),
      () => this.vault.isHealthy('vault'),
      () => this.nexus.isHealthy('nexus'),
      () => this.registry.isHealthy('registry'),
      () => this.argocd.isHealthy('argocd'),
    ])
  }
}
