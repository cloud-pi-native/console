import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'
import { ServiceChainModule } from '../service-chain/service-chain.module'
import { VaultModule } from '../vault/vault.module'
import { HealthzController } from './healthz.controller'

@Module({
  imports: [
    TerminusModule,
    DatabaseModule,
    KeycloakModule,
    GitlabModule,
    VaultModule,
    NexusModule,
    RegistryModule,
    ArgoCDModule,
    ConfigurationModule,
    ServiceChainModule,
  ],
  controllers: [HealthzController],
})
export class HealthzModule {}
