import { Controller, Get, Inject } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { DatabaseHealthService } from '@/cpin-module/infrastructure/database/database-health.service'
import { ArgoCDHealthService } from '../../../modules/argocd/argocd-health.service'
import { GitlabHealthService } from '../../../modules/gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../../../modules/keycloak/keycloak-health.service'
import { VaultHealthService } from '../../../modules/vault/vault-health.service'

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(DatabaseHealthService) private readonly database: DatabaseHealthService,
    @Inject(KeycloakHealthService) private readonly keycloak: KeycloakHealthService,
    @Inject(GitlabHealthService) private readonly gitlab: GitlabHealthService,
    @Inject(VaultHealthService) private readonly vault: VaultHealthService,
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
      () => this.argocd.isHealthy('argocd'),
    ])
  }
}
