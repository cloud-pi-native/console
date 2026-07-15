import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { GitlabModule } from '../gitlab/gitlab.module'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { ArgoCDDatastoreService } from './argocd-datastore.service'
import { ArgoCDHealthService } from './argocd-health.service'
import { ArgoCDPluginService } from './argocd-plugin.service'
import { ArgoCDService } from './argocd.service'

@Module({
  imports: [ConfigurationModule, DatabaseModule, GitlabModule, TerminusModule, VaultModule],
  providers: [ArgoCDHealthService, ArgoCDPluginService, ArgoCDService, ArgoCDDatastoreService],
  exports: [ArgoCDHealthService, ArgoCDPluginService, ArgoCDService],
})
export class ArgoCDModule {}
