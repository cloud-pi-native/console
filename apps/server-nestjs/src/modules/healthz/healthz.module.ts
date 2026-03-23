import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { VaultModule } from '../vault/vault.module'
import { DatabaseModule } from '../../cpin-module/infrastructure/database/database.module'
import { HealthzController } from './healthz.controller'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'

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
  ],
  controllers: [HealthzController],
})
export class HealthModule {}
