import { Module } from '@nestjs/common'
import { GitlabService } from './gitlab.service'
import { GitlabControllerService } from './gitlab-controller.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { GitlabClientService } from './gitlab-client.service'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '@/cpin-module/infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, VaultModule],
  providers: [GitlabService, GitlabControllerService, GitlabDatastoreService, GitlabClientService],
  exports: [GitlabService],
})
export class GitlabModule {}
