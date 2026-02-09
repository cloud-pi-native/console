import type { ServiceInfos } from '@cpn-console/hooks'
import { DISABLED } from '@cpn-console/shared'

const infos: ServiceInfos = {
  name: 'keycloak',
  title: 'Keycloak',
  config: {
    global: [
    ],
    project: [
      {
        kind: 'switch',
        key: 'purge',
        initialValue: DISABLED,
        permissions: {
          admin: { read: true, write: true },
          user: { read: false, write: false },
        },
        title: 'Purger les utilisateurs non synchronisés',
        value: DISABLED,
        description: 'Purger les utilisateurs non synchronisés de Keycloak lors de la synchronisation',
      },
    ],
  },
}

export default infos
