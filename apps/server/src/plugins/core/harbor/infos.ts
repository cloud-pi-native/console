import type { ServiceInfos } from '@/plugins/services.js'
import { harborUrl } from './utils.js'
import { monitor } from './monitor.js'

const infos: ServiceInfos = {
  name: 'registry',
  monitor: (currentDate, force) => monitor(harborUrl, currentDate, force),
  to: ({ services }) => `${harborUrl}/harbor/projects/${services?.registry?.id}`,
  title: 'Harbor',
  imgSrc: '/img/harbor.svg',
  description: 'Harbor stocke, analyse et distribue vos images de conteneurs',
}

export default infos
