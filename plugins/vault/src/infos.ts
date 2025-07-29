import type { ServiceInfos } from '@cpn-console/hooks'
import getConfig from './config'

const infos: ServiceInfos = {
  name: 'vault',
  to: ({ project }) => getConfig().hideProjectService
    ? undefined
    : `${getConfig().publicUrl}/ui/vault/secrets/${project.slug}`,
  title: 'Vault',
  imgSrc: '/img/vault.svg',
  description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
}

export default infos
