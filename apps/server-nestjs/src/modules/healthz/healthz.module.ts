import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { DatabaseModule } from '../../cpin-module/infrastructure/database/database.module'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'
import { VaultModule } from '../vault/vault.module'
import { HealthzController } from './healthz.controller'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'
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
  ],
  controllers: [HealthzController],
})
export class HealthModule {}
