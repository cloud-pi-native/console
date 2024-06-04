import { type ServiceInfos } from '@cpn-console/hooks'
import { getConfig } from './utils.js'

const extraRepositoriesDesc = 'appproject.spec.sourceRepos supplémentaires, séparés par des virgules (https://a.com/repo.git,https://b.com/'

const infos = {
  name: 'argocd',
  to: ({ organization, project }) => `${getConfig().url}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${organization}-${project}`,
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
