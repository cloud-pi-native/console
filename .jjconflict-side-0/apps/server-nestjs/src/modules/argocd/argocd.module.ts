import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { argocdConfigFactory } from '../../config/argocd.config'
import { baseConfigFactory } from '../../config/base.config'
import { vaultConfigFactory } from '../../config/vault.config'
import { GitlabModule } from '../gitlab/gitlab.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { ArgoCDDatastoreService } from './argocd-datastore.service'
import { ArgoCDHealthService } from './argocd-health.service'
import { ArgoCDPluginService } from './argocd-plugin.service'
import { ArgoCDService } from './argocd.service'

@Module({
  imports: [DatabaseModule, GitlabModule, TerminusModule, VaultModule, ConfigModule.forFeature(argocdConfigFactory), ConfigModule.forFeature(vaultConfigFactory), ConfigModule.forFeature(baseConfigFactory)],
  providers: [ArgoCDHealthService, ArgoCDPluginService, ArgoCDService, ArgoCDDatastoreService],
  exports: [ArgoCDHealthService, ArgoCDPluginService, ArgoCDService],
})
export class ArgoCDModule {}
