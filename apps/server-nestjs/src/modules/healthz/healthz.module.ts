import { Module } from '@nestjs/common'
import { ConditionalModule, ConfigModule } from '@nestjs/config'
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
import { HealthzService } from './healthz.service'

@Module({
  imports: [
    TerminusModule.forRoot(),
    ConfigModule.forRoot(),
    DatabaseModule,
    KeycloakModule,
    ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'),
    VaultModule,
    ConditionalModule.registerWhen(NexusModule, 'USE_NEXUS'),
    ConditionalModule.registerWhen(RegistryModule, 'USE_REGISTRY'),
    ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD'),
    ConditionalModule.registerWhen(OpenCdsModule, 'USE_OPENCDS'),
  ],
  controllers: [HealthzController],
  providers: [HealthzService],
})
export class HealthzModule {}
