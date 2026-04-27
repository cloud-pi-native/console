import { Gitlab } from '@gitbeaker/rest'
import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationModule } from '../infrastructure/configuration/configuration.module'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VaultModule } from '../vault/vault.module'
import { GITLAB_REST_CLIENT, GitlabClientService } from './gitlab-client.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { GitlabHealthService } from './gitlab-health.service'
import { GitlabService } from './gitlab.service'

@Module({
  imports: [ConfigurationModule, InfrastructureModule, VaultModule],
  providers: [
    {
      provide: GITLAB_REST_CLIENT,
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => new Gitlab({
        token: config.gitlabToken,
        host: config.getInternalOrPublicGitlabUrl(),
      }),
    },
    HealthIndicatorService,
    GitlabClientService,
    GitlabDatastoreService,
    GitlabHealthService,
    GitlabService,
  ],
  exports: [GitlabClientService, GitlabHealthService],
})
export class GitlabModule {}
