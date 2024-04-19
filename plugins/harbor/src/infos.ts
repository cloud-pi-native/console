import type { ServiceInfos } from '@cpn-console/hooks'
import type { PluginConfig } from '@cpn-console/shared'
import { getConfig } from './utils.js'

export const config: PluginConfig = {
  project: [{
    permissions: {
      admin: { read: false, write: false },
      user: { read: false, write: false },
    },
    key: 'projectId',
    kind: 'text',
    title: 'Num du projet Harbor',
    value: '',
  }, {
    kind: 'switch',
    key: 'publish-project-robot',
    initialValue: 'disabled',
    title: 'Publication du robot projet',
    description: 'Activer le robot de projet (read-only) et afficher ses identifiants aux utilisateurs',
    permissions: {
      admin: { read: true, write: true },
      user: { read: true, write: false },
    },
    value: 'disabled',
  }],
  global: [{
    kind: 'switch',
    key: 'publish-project-robot',
    initialValue: 'disabled',
    title: 'Publication du robot RO aux projets',
    description: 'Définit le comportement en l\'absence de ce paramétrage au niveau projet',
    permissions: {
      admin: { read: true, write: true },
      user: { read: true, write: false },
    },
    value: 'disabled',
  }],
}

const infos: ServiceInfos = {
  name: 'registry',
  to: ({ store }) => store?.registry?.projectId ? `${getConfig().url}/harbor/projects/${store.registry.projectId}` : `${getConfig().url}/`,
  title: 'Harbor',
  imgSrc: '/img/harbor.svg',
  description: 'Harbor stocke, analyse et distribue vos images de conteneurs',
  config,
}

export default infos
