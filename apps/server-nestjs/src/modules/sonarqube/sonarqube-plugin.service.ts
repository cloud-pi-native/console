import type { ServiceInfos } from '@cpn-console/hooks'
import type { ConfigType } from '@nestjs/config'
import { Inject, Injectable } from '@nestjs/common'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'

@Injectable()
export class SonarqubePluginService {
  constructor(
    @Inject(sonarqubeConfigFactory.KEY)
    private readonly sonarqubeConfig: ConfigType<typeof sonarqubeConfigFactory>,
  ) {}

  infos(): ServiceInfos {
    return {
      name: 'sonarqube',
      to: () => {
        if (!this.sonarqubeConfig.url) return undefined
        return new URL('projects', this.sonarqubeConfig.url).toString()
      },
      title: 'SonarQube',
      imgSrc: '/img/sonarqube.svg',
      description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr',
    }
  }
}
