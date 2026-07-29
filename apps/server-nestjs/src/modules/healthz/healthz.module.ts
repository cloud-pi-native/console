import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { optIn } from 'src/utils/config.utils'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { RegistryModule } from '../registry/registry.module'
import { ServiceChainModule } from '../service-chain/service-chain.module'
import { VaultModule } from '../vault/vault.module'
import { HealthzController } from './healthz.controller'
import { HealthzService } from './healthz.service'

@Module({
  imports: [
    ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD'),
    ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'),
    ConditionalModule.registerWhen(NexusModule, 'USE_NEXUS'),
    ConditionalModule.registerWhen(RegistryModule, 'USE_HARBOR'),
    ConditionalModule.registerWhen(ServiceChainModule, optIn('USE_SERVICE_CHAIN')),
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
    DatabaseModule,
    KeycloakModule,
    TerminusModule,
  ],
  controllers: [HealthzController],
  providers: [HealthzService],
})
export class HealthzModule {}
