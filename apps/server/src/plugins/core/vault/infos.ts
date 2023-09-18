import { ServiceInfos } from '@/plugins/services.js'
import { vaultUrl } from './utils.js'

export const infos: ServiceInfos = {
  name: 'Vault',
  monitorUrl: `${vaultUrl}`,
  // TODO wait for vault to be connected to oidc
  // to: ({ project, organization }) => `${vaultUrl}/ui/vault/secrets/forge-dso/list/${projectRootDir}/${organization}/${project}`,
  title: 'Vault',
  imgSrc: '/img/vault.svg',
  description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
}
