import type { ServiceInfos } from '@cpn-console/hooks'

const extraRepositoriesDesc = 'appproject.spec.sourceRepos supplémentaires, séparés par des virgules (https://a.com/repo.git,https://b.com/'

export const DEFAULT_PLATFORM_ADMIN_GROUP_PATH = '/console/admin'
export const DEFAULT_PLATFORM_READONLY_GROUP_PATH = '/console/readonly'
export const DEFAULT_PROJECT_ADMIN_GROUP_PATH_SUFFIX = '/console/admin'
export const DEFAULT_PROJECT_DEVOPS_GROUP_PATH_SUFFIX = '/console/devops'
export const DEFAULT_PROJECT_DEVELOPER_GROUP_PATH_SUFFIX = '/console/developer'
export const DEFAULT_PROJECT_READONLY_GROUP_PATH_SUFFIX = '/console/readonly'

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
      key: 'platformReadonlyGroupPath',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Platform Readonly Group Path',
      value: DEFAULT_PLATFORM_READONLY_GROUP_PATH,
      description: 'Chemin du groupe lecture seule de plateforme',
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
      key: 'projectReadonlyGroupPathSuffix',
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: false, write: false },
      },
      title: 'Project Readonly Group Path Suffix',
      value: DEFAULT_PROJECT_READONLY_GROUP_PATH_SUFFIX,
      description: 'Suffixe du chemin du groupe lecture seule de projet',
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
