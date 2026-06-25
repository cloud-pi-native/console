import type { ServiceInfos } from '@cpn-console/hooks'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '../../infrastructure/configuration/configuration.service'

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
    }
  }
}
