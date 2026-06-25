import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { OpenCdsModule } from '../opencds/opencds.module'
import { RegistryModule } from '../registry/registry.module'
import { VaultModule } from '../vault/vault.module'
import { HealthzController } from './healthz.controller'

@Module({
  imports: [
    TerminusModule,
    DatabaseModule,
    ConditionalModule.registerWhen(KeycloakModule, 'USE_KEYCLOAK'),
    ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'),
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
    ConditionalModule.registerWhen(NexusModule, 'USE_NEXUS'),
    ConditionalModule.registerWhen(RegistryModule, 'USE_REGISTRY'),
    ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD'),
    ConditionalModule.registerWhen(OpenCdsModule, 'USE_OPENCDS'),
  ],
  controllers: [HealthzController],
})
export class HealthzModule {}
