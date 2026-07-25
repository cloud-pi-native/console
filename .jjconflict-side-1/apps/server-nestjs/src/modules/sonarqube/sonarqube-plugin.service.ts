import type { ServiceInfos } from '@cpn-console/hooks'
import type { SonarqubeConfig } from './sonarqube.module-definition'
import { Inject, Injectable } from '@nestjs/common'
import { SONARQUBE_CONFIG } from './sonarqube.module-definition'

@Injectable()
export class SonarqubePluginService {
  constructor(
    @Inject(SONARQUBE_CONFIG)
    private readonly sonarqubeConfig: SonarqubeConfig,
  ) {}

  infos(): ServiceInfos {
    return {
      name: 'sonarqube',
      to: () => new URL('projects', this.sonarqubeConfig.url).toString(),
      title: 'SonarQube',
      imgSrc: '/img/sonarqube.svg',
      description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr',
    }
  }
}
