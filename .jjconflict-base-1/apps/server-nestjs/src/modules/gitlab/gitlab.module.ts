import type { GitlabConfig } from './gitlab.module-definition'
import { Gitlab } from '@gitbeaker/rest'
import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { VaultModule } from '../vault/vault.module'
import { GITLAB_REST_CLIENT, GitlabClientService } from './gitlab-client.service'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { GitlabHealthService } from './gitlab-health.service'
import { GitlabPluginService } from './gitlab-plugin.service'
import { ConfigurableModuleClass, GITLAB_CONFIG } from './gitlab.module-definition'
import { GitlabService } from './gitlab.service'

@Module({
  imports: [DatabaseModule, TerminusModule, VaultModule],
  providers: [
    {
      provide: GITLAB_REST_CLIENT,
      inject: [GITLAB_CONFIG],
      useFactory: (config: GitlabConfig) => new Gitlab({
        token: config.token,
        host: config.internalOrPublicUrl,
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
export class GitlabModule extends ConfigurableModuleClass {}
