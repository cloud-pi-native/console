import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { optIn } from 'src/utils/config.utils'
import { DatabaseModule } from '../../infrastructure/database/database.module'
import { ArgoCDModule } from '../../integrations/argocd/argocd.module'
import { GitlabModule } from '../../integrations/gitlab/gitlab.module'
import { KeycloakModule } from '../../integrations/keycloak/keycloak.module'
import { NexusModule } from '../../integrations/nexus/nexus.module'
import { RegistryModule } from '../../integrations/registry/registry.module'
import { VaultModule } from '../../integrations/vault/vault.module'
import { ServiceChainModule } from '../service-chain/service-chain.module'
import { HealthzController } from './healthz.controller'
import { HealthzService } from './healthz.service'

@Module({
  imports: [
    TerminusModule,
    DatabaseModule,
    KeycloakModule,
    ConditionalModule.registerWhen(ArgoCDModule, 'USE_ARGOCD'),
    ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'),
    ConditionalModule.registerWhen(NexusModule, 'USE_NEXUS'),
    ConditionalModule.registerWhen(RegistryModule, 'USE_HARBOR'),
    ConditionalModule.registerWhen(ServiceChainModule, optIn('USE_SERVICE_CHAIN')),
    ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'),
  ],
  controllers: [HealthzController],
  providers: [HealthzService],
})
export class HealthzModule {}
