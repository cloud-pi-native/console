import { Module } from '@nestjs/common'
import { ConditionalModule, ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import argocdConfigFactory from '../../config/argocd'
import vaultConfigFactory from '../../config/vault'
import { GitlabModule } from '../gitlab/gitlab.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { ArgoCDDatastoreService } from './argocd-datastore.service'
import { ArgoCDHealthService } from './argocd-health.service'
import { ArgoCDPluginService } from './argocd-plugin.service'
import { ArgoCDService } from './argocd.service'

@Module({
  imports: [DatabaseModule, ConditionalModule.registerWhen(GitlabModule, 'USE_GITLAB'), TerminusModule, ConditionalModule.registerWhen(VaultModule, 'USE_VAULT'), ConfigModule.forFeature([argocdConfigFactory]), ConfigModule.forFeature(vaultConfigFactory)],
  providers: [ArgoCDHealthService, ArgoCDPluginService, ArgoCDService, ArgoCDDatastoreService],
  exports: [ArgoCDHealthService, ArgoCDPluginService, ArgoCDService],
})
export class ArgoCDModule {}
