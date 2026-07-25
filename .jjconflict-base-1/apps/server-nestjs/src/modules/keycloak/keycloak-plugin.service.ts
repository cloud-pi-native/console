import type { ServiceInfos } from '@cpn-console/hooks'
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
