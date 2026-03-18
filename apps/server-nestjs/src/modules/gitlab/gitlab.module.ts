import { Module } from '@nestjs/common'
import { GitlabService } from './gitlab.service'
import { GitlabControllerService } from './gitlab-controller.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { GITLAB_REST_CLIENT, GitlabClientService } from './gitlab-client.service'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { InfrastructureModule } from '@/cpin-module/infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { GitlabHealthService } from './gitlab-health.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Gitlab } from '@gitbeaker/rest'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, VaultModule],
  providers: [
    {
      provide: GITLAB_REST_CLIENT,
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => new Gitlab({
        token: config.gitlabToken,
        host: config.gitlabInternalUrl,
      }),
    },
    GitlabService,
    GitlabControllerService,
    GitlabDatastoreService,
    GitlabClientService,
  ],
  exports: [GitlabService, GitlabHealthService],
})
export class GitlabModule {}
