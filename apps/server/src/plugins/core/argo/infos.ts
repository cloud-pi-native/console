import type { ServiceInfos } from '@/plugins/services.js'
import { removeTrailingSlash } from '@dso-console/shared'

const argocdUrl = removeTrailingSlash(process.env.ARGOCD_URL)

const infos: ServiceInfos = {
  name: 'argocd',
  monitorUrl: `${argocdUrl}`,
  to: ({ organization, project }) => `${argocdUrl}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${organization}-${project}`,
  title: 'ArgoCD',
  // TODO mettre le logo dans le plugin
  imgSrc: '/img/argocd.svg',
  description: 'ArgoCD est un outil déclaratif de livraison continue GitOps pour Kubernetes',
}

export default infos
