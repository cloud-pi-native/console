import type { ServiceInfos } from '@cpn-console/hooks'

const extraRepositoriesDesc = 'appproject.spec.sourceRepos supplémentaires, séparés par des virgules (https://a.com/repo.git,https://b.com/'

export const DEFAULT_PLATFORM_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_PLATFORM_READER_GROUP_PATH = '/console/reader'
export const DEFAULT_PROJECT_ADMIN_GROUP_PATH_SUFFIX = '/console/admin'
export const DEFAULT_PROJECT_DEVOPS_GROUP_PATH_SUFFIX = '/console/devops'
export const DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX = '/console/developer'
export const DEFAULT_PROJECT_READER_GROUP_PATH_SUFFIX = '/console/reader'

export const DEFAULT_DSO_ENV_CHART_VERSION = 'dso-env-1.6.0'
export const DEFAULT_DSO_NS_CHART_VERSION = 'dso-ns-1.1.5'

const infos = {
  name: 'argocd',
  to: ({ zones, project }) => zones.map(z => ({
    to: `${z.argocdUrl}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${project.slug}`,
    title: `ArgoCD ${z.label}`,
  })),
  title: 'ArgoCD',
  imgSrc: '/img/argocd.svg',
  description: 'ArgoCD est un outil déclaratif de livraison continue GitOps pour Kubernetes',
  config: {
    global: [{
      key: 'extraRepositories',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Source repositories',
      value: '',
      description: extraRepositoriesDesc,
      placeholder: 'https://github.com/',
    }, {
      key: 'platformAdminGroupPath',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Platform Admin Group Path',
      value: DEFAULT_PLATFORM_ADMIN_GROUP_PATH,
      description: 'Chemin du groupe administrateur de plateforme',
    }, {
      key: 'platformReaderGroupPath',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Platform Reader Group Path',
      value: DEFAULT_PLATFORM_READER_GROUP_PATH,
      description: 'Chemin du groupe lecteur de plateforme',
    }, {
      key: 'projectAdminGroupPathSuffix',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Project Admin Group Path Suffix',
      value: DEFAULT_PROJECT_ADMIN_GROUP_PATH_SUFFIX,
      description: 'Suffixe du chemin du groupe administrateur de projet',
    }, {
      key: 'projectDevopsGroupPathSuffix',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Project DevOps Group Path Suffix',
      value: DEFAULT_PROJECT_DEVOPS_GROUP_PATH_SUFFIX,
      description: 'Suffixe du chemin du groupe devops de projet',
    }, {
      key: 'projectDevelopperGroupPathSuffix',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Project Developer Group Path Suffix',
      value: DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
      description: 'Suffixe du chemin du groupe développeur de projet',
    }, {
      key: 'projectReaderGroupPathSuffix',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Project Reader Group Path Suffix',
      value: DEFAULT_PROJECT_READER_GROUP_PATH_SUFFIX,
      description: 'Suffixe du chemin du groupe lecteur de projet',
    }],
    project: [{
      key: 'extraRepositories',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: true, write: false },
      },
      title: 'Source repositories',
      value: '',
      description: extraRepositoriesDesc,
      placeholder: 'https://github.com/',
    }],
  },
} as const satisfies ServiceInfos

export default infos
