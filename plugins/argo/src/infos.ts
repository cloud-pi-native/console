import { type ServiceInfos } from '@dso-console/hooks'
import { getConfig } from './utils.js'

const infos: ServiceInfos = {
  name: 'argocd',
  to: ({ organization, project }) => `${getConfig().url}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${organization}-${project}`,
  title: 'ArgoCD',
  imgSrc: '/img/argocd.svg',
  description: 'ArgoCD est un outil déclaratif de livraison continue GitOps pour Kubernetes',
}

export default infos
