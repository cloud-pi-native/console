import type { ServiceInfos } from '@cpn-console/hooks'
import { Injectable } from '@nestjs/common'
import {
  DEFAULT_DSO_ENV_CHART_VERSION,
  DEFAULT_DSO_NS_CHART_VERSION,
  PLATFORM_ADMIN_GROUP_PATH,
  PLATFORM_READONLY_GROUP_PATH,
  PLATFORM_SECURITY_GROUP_PATH,
  PROJECT_ADMIN_GROUP_PATH_SUFFIX,
  PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
  PROJECT_DEVOPS_GROUP_PATH_SUFFIX,
  PROJECT_READONLY_GROUP_PATH_SUFFIX,
  PROJECT_SECURITY_GROUP_PATH_SUFFIX,
} from './argocd.constant'

@Injectable()
export class ArgoCDPluginService {
  infos(): ServiceInfos {
    const extraRepositoriesDesc = 'appproject.spec.sourceRepos supplémentaires, séparés par des virgules (https://a.com/repo.git,https://b.com/'

    return {
      name: 'argocd',
      to: ({ zones, project }) => zones.map(z => ({
        to: new URL(`applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${project.slug}`, z.argocdUrl).toString(),
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
          value: PLATFORM_ADMIN_GROUP_PATH,
          description: 'Chemin du groupe administrateur de plateforme',
        }, {
          key: 'platformReadonlyGroupPath',
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: false, write: false },
          },
          title: 'Platform Readonly Group Path',
          value: PLATFORM_READONLY_GROUP_PATH,
          description: 'Chemin du groupe lecture seule de plateforme',
        }, {
          key: 'platformSecurityGroupPath',
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: false, write: false },
          },
          title: 'Platform Security Group Path',
          value: PLATFORM_SECURITY_GROUP_PATH,
          description: 'Chemin du groupe sécurité de plateforme',
        }, {
          key: 'projectAdminGroupPathSuffix',
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: false, write: false },
          },
          title: 'Project Admin Group Path Suffix',
          value: PROJECT_ADMIN_GROUP_PATH_SUFFIX,
          description: 'Suffixe du chemin du groupe administrateur de projet',
        }, {
          key: 'projectDevopsGroupPathSuffix',
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: false, write: false },
          },
          title: 'Project DevOps Group Path Suffix',
          value: PROJECT_DEVOPS_GROUP_PATH_SUFFIX,
          description: 'Suffixe du chemin du groupe devops de projet',
        }, {
          key: 'projectDevelopperGroupPathSuffix',
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: false, write: false },
          },
          title: 'Project Developer Group Path Suffix',
          value: PROJECT_DEVELOPER_GROUP_PATH_SUFFIX,
          description: 'Suffixe du chemin du groupe développeur de projet',
        }, {
          key: 'projectReadonlyGroupPathSuffix',
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: false, write: false },
          },
          title: 'Project Readonly Group Path Suffix',
          value: PROJECT_READONLY_GROUP_PATH_SUFFIX,
          description: 'Suffixe du chemin du groupe lecture seule de projet',
        }, {
          key: 'projectSecurityGroupPathSuffix',
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: false, write: false },
          },
          title: 'Project Security Group Path Suffix',
          value: PROJECT_SECURITY_GROUP_PATH_SUFFIX,
          description: 'Suffixe du chemin du groupe sécurité de projet',
        }, {
          key: 'dsoEnvChartVersion',
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: false, write: false },
          },
          title: 'DSO Env Chart Version',
          value: DEFAULT_DSO_ENV_CHART_VERSION,
          description: 'Version du chart Helm dso-env',
          placeholder: DEFAULT_DSO_ENV_CHART_VERSION,
        }, {
          key: 'dsoNsChartVersion',
          kind: 'text',
          permissions: {
            admin: { read: true, write: true },
            user: { read: false, write: false },
          },
          title: 'DSO Namespace Chart Version',
          value: DEFAULT_DSO_NS_CHART_VERSION,
          description: 'Version du chart Helm dso-ns',
          placeholder: DEFAULT_DSO_NS_CHART_VERSION,
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
  }
}
