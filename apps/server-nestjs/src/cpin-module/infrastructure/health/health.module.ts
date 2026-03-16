import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '@/cpin-module/infrastructure/infrastructure.module'
import { DatabaseHealthService } from '@/cpin-module/infrastructure/database/database-health.service'
import { ArgoCDHealthService } from '../../../modules/argocd/argocd-health.service'
import { GitlabHealthService } from '../../../modules/gitlab/gitlab-health.service'
import { KeycloakHealthService } from '../../../modules/keycloak/keycloak-health.service'
import { VaultHealthService } from '../../../modules/vault/vault-health.service'
import { HealthController } from './health.controller'

@Module({
  imports: [TerminusModule, ConfigurationModule, InfrastructureModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthService,
    KeycloakHealthService,
    GitlabHealthService,
    VaultHealthService,
    ArgoCDHealthService,
  ],
})
export class HealthModule {}
