import type { ServiceInfos } from '@cpn-console/hooks'
import { DISABLED, ENABLED } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { AUTO_SYNC_PLUGIN_KEY, SUSPENDED_PLUGIN_KEY } from './sonarqube.constants'

@Injectable()
export class SonarqubePluginService {
  constructor(
    @Inject(ConfigurationService)
    private readonly config: ConfigurationService,
  ) {}

  infos(): ServiceInfos {
    return {
      name: 'sonarqube',
      to: () => {
        if (!this.config.sonarqubeUrl) return undefined
        return new URL('projects', this.config.sonarqubeUrl).toString()
      },
      title: 'SonarQube',
      imgSrc: '/img/sonarqube.svg',
      description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr',
      config: {
        global: [],
        project: [
          {
            kind: 'switch',
            key: SUSPENDED_PLUGIN_KEY,
            initialValue: ENABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: true, write: true },
            },
            title: 'Suspendre le projet',
            value: ENABLED,
            description: 'Suspendre la synchronisation SonarQube pour ce projet',
          },
          {
            kind: 'switch',
            key: AUTO_SYNC_PLUGIN_KEY,
            initialValue: DISABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: true, write: true },
            },
            title: 'Synchronisation automatique SonarQube',
            value: DISABLED,
            description: 'Synchroniser automatiquement le projet SonarQube',
          },
        ],
      },
    }
  }
}
