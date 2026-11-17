import type { ServiceInfos } from '../../core/plugin/plugin.types'
import { Injectable } from '@nestjs/common'

@Injectable()
export class KeycloakPluginService {
  infos(): ServiceInfos {
    return {
      name: 'keycloak',
      title: 'Keycloak',
      config: {
        global: [],
        project: [],
      },
    }
  }
}
