import type { ServiceInfos } from '@cpn-console/hooks'
import getConfig from './config.js'

const infos: ServiceInfos = {
  name: 'vault',
  to: ({ project, organization }) => getConfig().hideProjectService
    ? undefined
    : `${getConfig().publicUrl}/ui/vault/secrets/${organization}-${project}`,
  title: 'Vault',
  imgSrc: '/img/vault.svg',
  description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
}

export default infos
