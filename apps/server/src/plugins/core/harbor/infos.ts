import type { ServiceInfos } from '@/plugins/services.js'
import { harborUrl } from './utils.js'

export const infos: ServiceInfos = {
  name: 'registry',
  monitorUrl: `${harborUrl}`,
  to: ({ services }) => `${harborUrl}/harbor/projects/${services?.registry?.id}`,
  title: 'Harbor',
  imgSrc: '/img/harbor.png',
  description: 'Harbor stocke, analyse et distribue vos images de conteneurs',
}
