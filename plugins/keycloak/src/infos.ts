import type { ServiceInfos } from '@cpn-console/hooks'

const infos = {
  name: 'keycloak',
  title: 'Keycloak',
  imgSrc: '/img/keycloak.png',
  config: {
    project: [],
    global: [{
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      key: 'groupsToIgnore',
      title: 'Groupes à ignorer dans le suivi',
      value: '',
      description: `Nom des groups de premier niveau à ignorer dans le suivi des resources, séparés par des virgules (inclut /admin et /ArgoCDAdmins), chemin complet`,
      placeholder: '/admin,/ArgoCDAdmins',
      section: 'Tracking',
    }],
  },
} as const satisfies ServiceInfos

export default infos
