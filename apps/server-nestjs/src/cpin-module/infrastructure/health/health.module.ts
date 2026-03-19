import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ArgoCDModule } from '../../../modules/argocd/argocd.module'
import { GitlabModule } from '../../../modules/gitlab/gitlab.module'
import { KeycloakModule } from '../../../modules/keycloak/keycloak.module'
import { NexusModule } from '../../../modules/nexus/nexus.module'
import { RegistryModule } from '../../../modules/registry/registry.module'
import { VaultModule } from '../../../modules/vault/vault.module'
import { ConfigurationModule } from '../configuration/configuration.module'
import { DatabaseHealthService } from '../database/database-health.service'
import { InfrastructureModule } from '../infrastructure.module'
import { HealthController } from './health.controller'

@Module({
  imports: [
    TerminusModule,
    ConfigurationModule,
    InfrastructureModule,
    DatabaseHealthService,
    KeycloakModule,
    GitlabModule,
    VaultModule,
    NexusModule,
    RegistryModule,
    ArgoCDModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}

@Module({
  imports: [
    TerminusModule,
    ConfigurationModule,
    InfrastructureModule,
    DatabaseHealthService,
    KeycloakModule,
    GitlabModule,
    VaultModule,
    NexusModule,
    RegistryModule,
    ArgoCDModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
