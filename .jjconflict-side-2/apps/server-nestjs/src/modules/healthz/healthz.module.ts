import { Module } from '@nestjs/common'
import { ConditionalModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { argocdConfigFactory } from '../../config/argocd.config'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { harborConfigFactory } from '../../config/harbor.config'
import { keycloakConfigFactory } from '../../config/keycloak.config'
import { nexusConfigFactory } from '../../config/nexus.config'
import { openCdsConfigFactory } from '../../config/opencds.config'
import { registryConfigFactory } from '../../config/registry.config'
import { vaultConfigFactory } from '../../config/vault.config'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { NexusModule } from '../nexus/nexus.module'
import { OpenCdsModule } from '../opencds/opencds.module'
import { HarborModule, RegistryModule } from '../registry/registry.module'
import { VaultModule } from '../vault/vault.module'
import { HealthzController } from './healthz.controller'
import { HealthzService } from './healthz.service'

@Module({
  imports: [
    TerminusModule.forRoot(),
    DatabaseModule,
    ConditionalModule.registerWhen(KeycloakModule.forRoot(keycloakConfigFactory.asProvider()), 'USE_KEYCLOAK'),
    ConditionalModule.registerWhen(GitlabModule.forRoot(gitlabConfigFactory.asProvider()), 'USE_GITLAB'),
    ConditionalModule.registerWhen(VaultModule.forRoot(vaultConfigFactory.asProvider()), 'USE_VAULT'),
    ConditionalModule.registerWhen(NexusModule.forRoot(nexusConfigFactory.asProvider()), 'USE_NEXUS'),
    ConditionalModule.registerWhen(RegistryModule.forRoot(registryConfigFactory.asProvider()), 'USE_REGISTRY'),
    ConditionalModule.registerWhen(HarborModule.forRoot(harborConfigFactory.asProvider()), 'USE_REGISTRY'),
    ConditionalModule.registerWhen(ArgoCDModule.forRoot(argocdConfigFactory.asProvider()), 'USE_ARGOCD'),
    ConditionalModule.registerWhen(OpenCdsModule.forRoot(openCdsConfigFactory.asProvider()), 'USE_OPENCDS'),
  ],
  controllers: [HealthzController],
  providers: [HealthzService],
})
export class HealthzModule {}
