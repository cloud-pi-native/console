import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigurationModule } from '../../infrastructure/configuration/configuration.module'
import { DatabaseModule } from '../../infrastructure/database/database.module'
import { ArgoCDModule } from '../../plugins/argocd/argocd.module'
import { GitlabModule } from '../../plugins/gitlab/gitlab.module'
import { KeycloakModule } from '../../plugins/keycloak/keycloak.module'
import { NexusModule } from '../../plugins/nexus/nexus.module'
import { RegistryModule } from '../../plugins/registry/registry.module'
import { VaultModule } from '../../plugins/vault/vault.module'
import { OpenCdsModule } from '../opencds/opencds.module'
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
    OpenCdsModule,
  ],
  controllers: [HealthzController],
})
export class HealthzModule {}
