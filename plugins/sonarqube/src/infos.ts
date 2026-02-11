import type { ServiceInfos } from '@cpn-console/hooks'
import { DISABLED } from '@cpn-console/shared'
import { getConfig } from './tech.js'

const infos = {
  name: 'sonarqube',
  to: () => `${getConfig().url}/projects`,
  title: 'SonarQube',
  imgSrc: '/img/sonarqube.svg',
  description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr',
  config: {
    global: [{
      kind: 'text',
      key: 'adminGroupPath',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Chemin du groupe OIDC Admin',
      value: '/console/admin',
      description: 'Le chemin du groupe OIDC qui donne les droits d\'administrateur SonarQube',
      placeholder: '/console/admin',
    }, {
      kind: 'text',
      key: 'readonlyGroupPath',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Chemin du groupe OIDC ReadOnly',
      value: '/console/readonly',
      description: 'Le chemin du groupe OIDC qui donne les droits de lecture seule SonarQube',
      placeholder: '/console/readonly',
    }, {
      kind: 'switch',
      key: 'purge',
      initialValue: DISABLED,
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Purger les utilisateurs non synchronisés',
      value: DISABLED,
      description: 'Purger les utilisateurs non synchronisés de SonarQube lors de la synchronisation',
    }],
    project: [],
  },
} as const satisfies ServiceInfos

export default infos
