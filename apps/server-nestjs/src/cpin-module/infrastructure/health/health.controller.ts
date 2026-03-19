import { Controller, Get, Inject } from '@nestjs/common'
import { HealthCheck, HealthCheckService } from '@nestjs/terminus'
import { ArgoCDHealthService } from '../../../modules/argocd/argocd-health.service'
import { GitlabHealthService } from '../../../modules/gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../../../modules/keycloak/keycloak-health.service'
import { VaultHealthService } from '../../../modules/vault/vault-health.service'
import { DatabaseHealthService } from '../database/database-health.service'

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
      () => this.database.check('database'),
      () => this.keycloak.check('keycloak'),
      () => this.gitlab.check('gitlab'),
      () => this.vault.check('vault'),
      () => this.argocd.check('argocd'),
    ])
  }
}
