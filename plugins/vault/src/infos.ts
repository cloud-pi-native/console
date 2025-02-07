import type { ServiceInfos } from '@cpn-console/hooks'
import getConfig from './config.js'

const infos: ServiceInfos = {
  name: 'vault',
  to: ({ project }) => getConfig().hideProjectService
    ? undefined
    : `${getConfig().publicUrl}/ui/vault/secrets/${project.slug}`,
  title: 'Vault',
  imgSrc: '/img/vault.svg',
  description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
  config: {
    project: [],
    global: [{
      key: 'autoPrune',
      kind: 'switch',
      permissions: { admin: { read: true, write: true }, user: { read: false, write: false } },
      title: 'Nettoyage automatique',
      value: 'disabled',
      initialValue: 'disabled',
      section: 'Tracking',
      description: 'Suppression automatique des resources orphelines',
    }, {
      key: 'trackingExcludePattern',
      kind: 'text',
      permissions: { admin: { read: true, write: true }, user: { read: false, write: false } },
      title: 'Motifs d\'exclusion',
      value: '',
      section: 'Tracking',
      description: 'Suppression automatique des resources orphelines',
    }, {
      key: 'enableVSO',
      kind: 'switch',
      permissions: { admin: { read: true, write: true }, user: { read: true, write: false } },
      title: 'Activer VSO',
      value: 'enabled',
      initialValue: 'enabled',
      section: 'Vault secret operator',
      description: 'Activer le déploiement de VSO dans les ns clients',
    }],
  },
}

export default infos
