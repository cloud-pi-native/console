import type { ServiceInfos } from '@cpn-console/hooks'
import { getConfig } from './utils.js'

const infos: ServiceInfos = {
  name: 'registry',
  to: ({ services }) => `${getConfig().url}/harbor/projects/${services?.registry?.id}`,
  title: 'Harbor',
  imgSrc: '/img/harbor.svg',
  description: 'Harbor stocke, analyse et distribue vos images de conteneurs',
}

export default infos
