import type { ServiceInfos } from '@cpn-console/hooks'
import { ENABLED } from '@cpn-console/shared'
import { getConfig } from './utils.js'

const infos = {
  name: 'gitlab',
  to: ({ project, organization }) => `${getConfig().url}/${getConfig().projectsRootDir}/${organization}/${project}`,
  title: 'Gitlab',
  imgSrc: '/img/gitlab.svg',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
  config: {
    global: [{
      kind: 'switch',
      key: 'displayTriggerHint',
      initialValue: ENABLED,
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Afficher l\'aide de trigger de pipeline',
      value: ENABLED,
      description: 'Afficher l\'aide de trigger de pipeline aux utilisateurs lorsqu\'ils souhaitent afficher les secrets du projet',
    }],
    project: [],
  },
} as const satisfies ServiceInfos

export default infos
