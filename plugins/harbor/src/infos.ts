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
  }],
  global: [],
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
