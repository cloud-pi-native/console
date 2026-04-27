import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { GitlabModule } from '../gitlab/gitlab.module'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { ArgoCDDatastoreService } from './argocd-datastore.service'
import { ArgoCDHealthService } from './argocd-health.service'
import { ArgoCDService } from './argocd.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, GitlabModule, VaultModule],
  providers: [HealthIndicatorService, ArgoCDHealthService, ArgoCDService, ArgoCDDatastoreService],
  exports: [ArgoCDHealthService],
})
export class ArgoCDModule {}
