import { Module } from '@nestjs/common'
import { ArgoCDControllerService } from './argocd-controller.service'
import { ArgoCDDatastoreService } from './argocd-datastore.service'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '@/cpin-module/infrastructure/infrastructure.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { VaultModule } from '../vault/vault.module'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, GitlabModule, VaultModule],
  providers: [ArgoCDControllerService, ArgoCDDatastoreService],
  exports: [],
})
export class ArgoCDModule {}
