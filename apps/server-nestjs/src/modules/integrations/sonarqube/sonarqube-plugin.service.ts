import type { ConfigType } from '@nestjs/config'
import type { ServiceInfos } from '../../core/plugin/plugin.types'
import { Inject, Injectable } from '@nestjs/common'
import { sonarqubeConfigFactory } from '../../../config/sonarqube.config'

@Injectable()
export class SonarqubePluginService {
  constructor(
    @Inject(sonarqubeConfigFactory.KEY)
    private readonly sonarqubeConfig: ConfigType<typeof sonarqubeConfigFactory>,
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
