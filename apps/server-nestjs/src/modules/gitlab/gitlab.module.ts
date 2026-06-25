import type { GitlabConfig } from '../../config/gitlab'
import { Gitlab } from '@gitbeaker/rest'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import gitlabConfigFactory from '../../config/gitlab'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { GITLAB_REST_CLIENT, GitlabClientService } from './gitlab-client.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { GitlabHealthService } from './gitlab-health.service'
import { GitlabPluginService } from './gitlab-plugin.service'
import { GitlabService } from './gitlab.service'

@Module({
  imports: [DatabaseModule, TerminusModule, VaultModule, ConfigModule.forFeature([gitlabConfigFactory])],
  providers: [
    {
      provide: GITLAB_REST_CLIENT,
      inject: [gitlabConfigFactory.KEY],
      useFactory: (config: GitlabConfig) => new Gitlab({
        token: config.gitlabToken,
        host: config.internalOrPublicGitlabUrl,
      }),
    },
    GitlabClientService,
    GitlabDatastoreService,
    GitlabHealthService,
    GitlabPluginService,
    GitlabService,
  ],
  exports: [GitlabClientService, GitlabHealthService, GitlabPluginService, GitlabService],
})
export class GitlabModule {}
