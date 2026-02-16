import type { ServiceInfos } from '@cpn-console/hooks'
import { DISABLED, ENABLED } from '@cpn-console/shared'
import config from './config.js'

export const DEFAULT_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_AUDITOR_GROUP_PATH = '/console/readonly'
export const DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX = '/console/admin'
export const DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX = '/console/developer'
export const DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX = '/console/readonly'

const infos = {
  name: 'gitlab',
  to: ({ project }) => `${config().publicUrl}/${config().projectsRootDir}/${project.slug}`,
  title: 'Gitlab',
  imgSrc: '/img/gitlab.svg',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
  config: {
    global: [
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
        description: 'Purger les utilisateurs non synchronisés de GitLab lors de la synchronisation',
      },
      {
        kind: 'switch',
        key: 'displayTriggerHint',
        initialValue: ENABLED,
        permissions: {
          admin: { read: true, write: true },
          user: { read: false, write: false },
        },
        title: 'Afficher l\'aide de déclenchement de pipeline',
        value: ENABLED,
        description: 'Afficher l\'aide de déclenchement de pipeline aux utilisateurs lorsqu\'ils souhaitent afficher les secrets du projet',
      },
      {
        kind: 'text',
        key: 'adminGroupPath',
        permissions: {
          admin: { read: true, write: true },
          user: { read: false, write: false },
        },
        title: 'Chemin du groupe OIDC Admin',
        value: DEFAULT_ADMIN_GROUP_PATH,
        description: 'Le chemin du groupe OIDC qui donne les droits d\'administrateur GitLab',
        placeholder: DEFAULT_ADMIN_GROUP_PATH,
      },
      {
        kind: 'text',
        key: 'auditorGroupPath',
        permissions: {
          admin: { read: true, write: true },
          user: { read: false, write: false },
        },
        title: 'Chemin du groupe OIDC Auditeur',
        value: DEFAULT_AUDITOR_GROUP_PATH,
        description: 'Le chemin du groupe OIDC qui donne les droits d\'auditeur GitLab',
        placeholder: DEFAULT_AUDITOR_GROUP_PATH,
      },
      {
        kind: 'text',
        key: 'projectMaintainerGroupPathSuffix',
        permissions: {
          admin: { read: true, write: true },
          user: { read: false, write: false },
        },
        title: 'Suffixe du chemin du groupe OIDC Maintainer',
        value: DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX,
        description: 'Suffixe du groupe OIDC donnant accès Maintainer',
        placeholder: DEFAULT_PROJECT_MAINTAINER_GROUP_PATH_SUFFIX,
      },
      {
        kind: 'text',
        key: 'projectDeveloperGroupPathSuffix',
        permissions: {
          admin: { read: true, write: true },
          user: { read: false, write: false },
        },
        title: 'Suffixe du chemin du groupe OIDC Developer',
        value: DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
        description: 'Suffixe du groupe OIDC donnant accès Developer',
        placeholder: DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
      },
      {
        kind: 'text',
        key: 'projectReporterGroupPathSuffix',
        permissions: {
          admin: { read: true, write: true },
          user: { read: false, write: false },
        },
        title: 'Suffixe du chemin du groupe OIDC Reporter',
        value: DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX,
        description: 'Suffixe du groupe OIDC donnant accès Reporter',
        placeholder: DEFAULT_PROJECT_REPORTER_GROUP_PATH_SUFFIX,
      },
    ],
    project: [],
  },
} as const satisfies ServiceInfos

export default infos
