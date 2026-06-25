import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationModule } from '../../infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../../infrastructure/infrastructure.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { VaultModule } from '../vault/vault.module'
import { ArgoCDDatastoreService } from './argocd-datastore.service'
import { ArgoCDHealthService } from './argocd-health.service'
import { ArgoCDPluginService } from './argocd-plugin.service'
import { ArgoCDService } from './argocd.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, GitlabModule, VaultModule],
  providers: [HealthIndicatorService, ArgoCDHealthService, ArgoCDPluginService, ArgoCDService, ArgoCDDatastoreService],
  exports: [ArgoCDHealthService, ArgoCDPluginService, ArgoCDService],
})
export class ArgoCDModule {}
