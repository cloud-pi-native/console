import type { ServiceInfos } from '@cpn-console/hooks'
import { ENABLED } from '@cpn-console/shared'
import config from './config.js'

const infos = {
  name: 'gitlab',
  to: ({ project }) => `${config().publicUrl}/${config().projectsRootDir}/${project.slug}`,
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
    }, {
      kind: 'text',
      key: 'adminGroupPath',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Chemin du groupe OIDC Admin',
      value: '/console/admin',
      description: 'Le chemin du groupe OIDC qui donne les droits d\'administrateur GitLab',
      placeholder: '/console/admin',
    }, {
      kind: 'text',
      key: 'auditorGroupPath',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Chemin du groupe OIDC Auditeur',
      value: '/console/readonly',
      description: 'Le chemin du groupe OIDC qui donne les droits d\'auditeur GitLab',
      placeholder: '/console/readonly',
    }, {
      kind: 'text',
      key: 'projectMaintainerGroupPath',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Chemin du groupe OIDC Maintainer',
      value: '/console/admin',
      description: 'Suffixe du groupe OIDC donnant accès Maintainer',
    }, {
      kind: 'text',
      key: 'projectDeveloperGroupPath',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Chemin du groupe OIDC Developer',
      value: '/console/developer',
      description: 'Suffixe du groupe OIDC donnant accès Developer',
    }, {
      kind: 'text',
      key: 'projectReporterGroupPath',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Chemin du groupe OIDC Reporter',
      value: '/console/readonly',
      description: 'Suffixe du groupe OIDC donnant accès Reporter',
    }],
    project: [],
  },
} as const satisfies ServiceInfos

export default infos
